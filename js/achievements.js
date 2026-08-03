'use strict';
const Achievements = {
  // id, name, desc, icon, condition type, threshold
  list: [
    // Distance achievements
    { id:'first_drive',     name:'First Drive',        desc:'Pass the first 100 meters',         icon:'🚗', type:'distance',   val:100       },
    { id:'dist_250',        name:'On the Road',         desc:'Go 250 meters',                      icon:'📍', type:'distance',   val:250       },
    { id:'dist_500',        name:'500 Meters',          desc:'Go 500 meters',                      icon:'🛣️', type:'distance',   val:500       },
    { id:'dist_1000',       name:'Milestone',           desc:'Go 1000 meters',                     icon:'🏁', type:'distance',   val:1000      },
    { id:'dist_2000',       name:'Endurance Driver',   desc:'Go 2000 meters',                     icon:'💪', type:'distance',   val:2000      },
    { id:'dist_5000',       name:'Marathoner',          desc:'Go 5000 meters',                     icon:'🏃', type:'distance',   val:5000      },
    { id:'dist_10k',        name:'Ten Club',            desc:'Go 10 kilometers',                   icon:'🌟', type:'distance',   val:10000     },
    { id:'dist_25k',        name:'Half Marathoner',     desc:'Go 25 kilometers',                   icon:'⭐', type:'distance',   val:25000     },
    { id:'dist_50k',        name:'Legendary Driver',    desc:'Go 50 kilometers',                   icon:'👑', type:'distance',   val:50000     },
    { id:'dist_100k',       name:'Half a Country',      desc:'Go 100 kilometers',                  icon:'🗺️', type:'distance',   val:100000    },
    { id:'dist_250k',       name:'Continent Crosser',   desc:'Go 250 kilometers',                  icon:'🌍', type:'distance',   val:250000    },
    { id:'dist_1m',         name:'World Tour',          desc:'Go 1000 kilometers',                 icon:'🛸', type:'distance',   val:1000000   },
    // Map-specific distance achievements
    { id:'countryside_500', name:'Mountain Shepherd',   desc:'Go 500m in Countryside',             icon:'🐑', type:'map_dist',   val:500,  map:'countryside' },
    { id:'countryside_2k',  name:'Mountain Goat',       desc:'Go 2000m in Countryside',            icon:'🐐', type:'map_dist',   val:2000, map:'countryside' },
    { id:'countryside_5k',  name:'Mountain Eagle',      desc:'Go 5000m in Countryside',            icon:'🦅', type:'map_dist',   val:5000, map:'countryside' },
    { id:'desert_500',      name:'Desert Mouse',        desc:'Go 500m in Desert',                  icon:'🐁', type:'map_dist',   val:500,  map:'desert'      },
    { id:'desert_1500',     name:'Desert Fox',          desc:'Go 1500m in Desert',                 icon:'🦊', type:'map_dist',   val:1500, map:'desert'      },
    { id:'desert_3k',       name:'Desert Lion',         desc:'Go 3000m in Desert',                 icon:'🦁', type:'map_dist',   val:3000, map:'desert'      },
    { id:'winter_1000',     name:'Polar Bear',          desc:'Go 1000m in Winter',                 icon:'🐻', type:'map_dist',   val:1000, map:'winter'      },
    { id:'winter_3k',       name:'Ice Lion',            desc:'Go 3000m in Winter',                 icon:'❄️', type:'map_dist',   val:3000, map:'winter'      },
    { id:'beach_1500',      name:'Coast Guard',         desc:'Go 1500m in Beach',                  icon:'🌊', type:'map_dist',   val:1500, map:'beach'       },
    { id:'beach_3k',        name:'Sea Dog',             desc:'Go 3000m in Beach',                  icon:'🏄', type:'map_dist',   val:3000, map:'beach'       },
    { id:'city_2k',         name:'City Runner',         desc:'Go 2000m in City',                   icon:'🏙️', type:'map_dist',  val:2000, map:'city'        },
    { id:'city_5k',         name:'Metropolitan',        desc:'Go 5000m in City',                   icon:'🌆', type:'map_dist',   val:5000, map:'city'        },
    { id:'jungle_2k',       name:'Jungle Explorer',     desc:'Go 2000m in Jungle',                 icon:'🌿', type:'map_dist',   val:2000, map:'jungle'      },
    { id:'mars_1k',         name:'Mars Walk',           desc:'Go 1000m in Mars',                   icon:'🔴', type:'map_dist',   val:1000, map:'mars'        },
    { id:'mars_5k',         name:'Mars Conqueror',      desc:'Go 5000m in Mars',                   icon:'🚀', type:'map_dist',   val:5000, map:'mars'        },
    { id:'moon_2k',         name:'Moon Walker',         desc:'Go 2000m in Moon',                   icon:'🌙', type:'map_dist',   val:2000, map:'moon'        },
    { id:'neon_3k',         name:'Neon Light',          desc:'Go 3000m in Neon City',              icon:'💜', type:'map_dist',   val:3000, map:'neon'        },
    { id:'volcano_1k',      name:'Lava Walker',        desc:'Go 1000m in Volcano',                icon:'🌋', type:'map_dist',   val:1000, map:'volcano'     },
    { id:'underwater_2k',   name:'Deep Diver',          desc:'Go 2000m in Underwater',             icon:'🐠', type:'map_dist',   val:2000, map:'underwater'  },
    { id:'canyon_3k',       name:'Canyon Runner',       desc:'Go 3000m in Canyon',                 icon:'🏜️', type:'map_dist',  val:3000, map:'canyon'      },
    { id:'wasteland_2k',    name:'Wasteland Explorer',  desc:'Go 2000m in Wasteland',              icon:'☢️', type:'map_dist',  val:2000, map:'wasteland'   },
    // Flip achievements
    { id:'first_flip',      name:'Acrobat',             desc:'Do your first flip',                 icon:'🤸', type:'flip',       val:1         },
    { id:'flip_5',          name:'Gymnast',             desc:'Do 5 flips (total)',                  icon:'🏋️', type:'total_flip', val:5        },
    { id:'flip_10',         name:'Flip Master',         desc:'Do 10 flips (total)',                 icon:'🌀', type:'total_flip', val:10       },
    { id:'flip_25',         name:'Circus Star',         desc:'Do 25 flips (total)',                 icon:'🎪', type:'total_flip', val:25       },
    { id:'flip_50',         name:'Flip Legend',         desc:'Do 50 flips (total)',                 icon:'⚡', type:'total_flip', val:50       },
    { id:'triple_flip',     name:'Flight School',       desc:'Do 3 flips in one run',              icon:'🎯', type:'run_flips',  val:3         },
    { id:'quintuple_flip',  name:'Full Throttle 5',     desc:'Do 5 flips in one run',              icon:'🔥', type:'run_flips',  val:5         },
    { id:'deca_flip',       name:'God of Acrobatics',   desc:'Do 10 flips in one run',             icon:'👑', type:'run_flips',  val:10        },
    // Airtime achievements
    { id:'airtime_5',       name:'Air King',            desc:'Stay 5 seconds airborne',            icon:'✈️', type:'airtime',    val:5         },
    { id:'airtime_10',      name:'Pilot',               desc:'Stay 10 seconds airborne',           icon:'🛩️', type:'airtime',   val:10        },
    { id:'airtime_20',      name:'Astronaut',           desc:'Stay 20 seconds airborne',           icon:'🚀', type:'airtime',    val:20        },
    { id:'airtime_30',      name:'Space Explorer',      desc:'Stay 30 seconds airborne',           icon:'🛸', type:'airtime',    val:30        },
    // Economy achievements
    { id:'coins_500',       name:'Coin Saver',          desc:'Collect 500 coins',                  icon:'💵', type:'total_coins', val:500      },
    { id:'coins_1000',      name:'Money Boss',          desc:'Collect 1000 coins',                 icon:'💰', type:'total_coins', val:1000     },
    { id:'coins_5000',      name:'Fill the Vault',      desc:'Collect 5000 coins',                 icon:'🏦', type:'total_coins', val:5000     },
    { id:'coins_10k',       name:'On the Millionaire Path', desc:'Collect 10,000 coins',           icon:'💲', type:'total_coins', val:10000    },
    { id:'coins_50k',       name:'Millionaire',         desc:'Collect 50,000 coins',               icon:'🤑', type:'total_coins', val:50000    },
    { id:'gold_1k',         name:'Cracked the Vault',   desc:'Reach 1000 gold',                    icon:'🪙', type:'gold',       val:1000      },
    { id:'gold_5k',         name:'Safe Haven',          desc:'Reach 5000 gold',                    icon:'💛', type:'gold',       val:5000      },
    { id:'gold_10k',        name:'Rich',                desc:'Reach 10,000 gold',                  icon:'💎', type:'gold',       val:10000     },
    { id:'gold_50k',        name:'Rolling in Money',    desc:'Reach 50,000 gold',                  icon:'🏅', type:'gold',       val:50000     },
    { id:'diamond_1',       name:'Diamond Owner',       desc:'Collect first diamond',              icon:'◆', type:'diamonds',    val:1         },
    { id:'diamond_10',      name:'Diamond Collector',   desc:'Collect 10 diamonds',                icon:'💠', type:'diamonds',   val:10        },
    // Vehicle achievements
    { id:'first_vehicle',   name:'Vehicle Acquired',    desc:'Buy your first vehicle',             icon:'🔑', type:'vehicles',   val:2         },
    { id:'vehicle_3',       name:'Collector',           desc:'Own 3 different vehicles',           icon:'🏆', type:'vehicles',   val:3         },
    { id:'vehicle_5',       name:'Garage Owner',        desc:'Own 5 different vehicles',           icon:'🚙', type:'vehicles',   val:5         },
    { id:'vehicle_10',      name:'Fleet Owner',         desc:'Own 10 different vehicles',          icon:'🚐', type:'vehicles',   val:10        },
    { id:'vehicle_15',      name:'Car Maniac',          desc:'Own 15 different vehicles',          icon:'🏎️', type:'vehicles',  val:15        },
    { id:'vehicle_all',     name:'God of Cars',         desc:'Own all vehicles',                   icon:'👑', type:'vehicles',   val:30        },
    // Upgrade / garage achievements
    { id:'upgrade_done',    name:'Mechanic',            desc:'Do your first upgrade',              icon:'🔧', type:'manual',     val:1         },
    { id:'part_nitro',      name:'Nitro Master',        desc:'Use the Nitro part',                 icon:'🔥', type:'manual',     val:1         },
    { id:'part_wing',       name:'Wing Equipped',       desc:'Use the Wing part',                  icon:'🪂', type:'manual',     val:1         },
    { id:'part_spring',     name:'Spring Master',       desc:'Use the Spring part',                icon:'🌀', type:'manual',     val:1         },
    { id:'part_landing',    name:'Soft Landing',        desc:'Use Landing boost',                  icon:'⚡', type:'manual',     val:1         },
    // Bot race achievements
    { id:'first_bot_win',   name:'First Bot Win',       desc:'Win a bot race',                     icon:'🤖', type:'bot_win',    val:1         },
    { id:'bot_5_wins',      name:'Bot Killer',          desc:'Win 5 bot races',                    icon:'⚔️', type:'bot_win',    val:5         },
    { id:'bot_10_wins',     name:'Bot Lord',            desc:'Win 10 bot races',                   icon:'🥇', type:'bot_win',    val:10        },
    // Rank achievements
    { id:'rank_bronz',      name:'Bronze Rank',         desc:'Reach BRONZE rank',                  icon:'🥉', type:'rank',       val:'BRONZ'   },
    { id:'rank_gumus',      name:'Silver Rank',         desc:'Reach SILVER rank',                  icon:'🥈', type:'rank',       val:'GÜMÜŞ'   },
    { id:'rank_altin',      name:'Gold Rank',           desc:'Reach GOLD rank',                    icon:'🥇', type:'rank',       val:'ALTIN'   },
    { id:'rank_elmas',      name:'Diamond Rank',        desc:'Reach DIAMOND rank',                 icon:'💎', type:'rank',       val:'ELMAS'   },
    { id:'rank_efsane',     name:'Legend!',             desc:'Reach LEGEND rank',                  icon:'🌟', type:'rank',       val:'EFSANE'  },
    // Speed achievements
    { id:'speed_100',       name:'Fast',                desc:'Reach 100 km/h speed',               icon:'💨', type:'speed',      val:100       },
    { id:'speed_150',       name:'Very Fast',           desc:'Reach 150 km/h speed',               icon:'🌪️', type:'speed',    val:150       },
    { id:'speed_200',       name:'Light Speed',         desc:'Reach 200 km/h speed',               icon:'⚡', type:'speed',      val:200       },
    // Survival achievements
    { id:'no_flip_1k',      name:'Balanced Driver',     desc:'Go 1000m without flipping',          icon:'⚖️', type:'no_flip',   val:1000      },
    { id:'no_flip_5k',      name:'Balance Champion',    desc:'Go 5000m without flipping',          icon:'🏆', type:'no_flip',   val:5000      },
    { id:'fuel_save',       name:'Fuel Saver',          desc:'Go 2000m without running out of fuel', icon:'⛽', type:'fuel_save', val:2000      },
    // Fun achievements
    { id:'play_10',         name:'Habit',               desc:'Play 10 runs',                        icon:'🔄', type:'run_count', val:10        },
    { id:'play_50',         name:'Addicted',            desc:'Play 50 runs',                        icon:'🎮', type:'run_count', val:50        },
    { id:'play_100',        name:'Driving Machine',     desc:'Play 100 runs',                       icon:'🤯', type:'run_count', val:100       },
    { id:'night_owl',       name:'Night Owl',           desc:'Play between 2-4 AM',                icon:'🦉', type:'manual',    val:1         },
    { id:'combo_3',         name:'Triple Combo',        desc:'Do 3 moves at once (flip+nitro+wing)',icon:'🎯', type:'combo', val:3        },
    // --- Expanded original achievements (appended) ---
    // Flip & combo milestones
    { id:'flip_100',        name:'Barrel Roll Baron',   desc:'Do 100 flips (total)',               icon:'🌪️', type:'total_flip', val:100      },
    { id:'flip_250',        name:'Spin Dynasty',        desc:'Do 250 flips (total)',               icon:'🎡', type:'total_flip', val:250      },
    { id:'sept_flip',       name:'Seven Heaven',        desc:'Do 7 flips in one run',              icon:'☄️', type:'run_flips',  val:7         },
    { id:'combo_4',         name:'Quad Fusion',         desc:'Chain 4 moves at once',              icon:'🧨', type:'combo',      val:4         },
    // Speed achievements
    { id:'speed_250',       name:'Sonic Boom',          desc:'Reach 250 km/h speed',               icon:'🚄', type:'speed',      val:250       },
    { id:'speed_300',       name:'Warp Drive',          desc:'Reach 300 km/h speed',               icon:'🌠', type:'speed',      val:300       },
    // Airtime
    { id:'airtime_45',      name:'Orbit Rider',         desc:'Stay 45 seconds airborne',           icon:'🪐', type:'airtime',    val:45        },
    { id:'airtime_60',      name:'Gravity Rebel',       desc:'Stay 60 seconds airborne',           icon:'🌌', type:'airtime',    val:60        },
    // Coin / economy milestones
    { id:'coins_100k',      name:'Coin Tycoon',         desc:'Collect 100,000 coins',              icon:'🏛️', type:'total_coins', val:100000   },
    { id:'coins_250k',      name:'Golden Baron',        desc:'Collect 250,000 coins',              icon:'👛', type:'total_coins', val:250000   },
    { id:'gold_100k',       name:'Bullion Baron',       desc:'Reach 100,000 gold',                 icon:'🏆', type:'gold',       val:100000    },
    { id:'diamond_50',      name:'Diamond Hoarder',     desc:'Collect 50 diamonds',                icon:'🔷', type:'diamonds',   val:50        },
    { id:'diamond_100',     name:'Crystal Crown',       desc:'Collect 100 diamonds',               icon:'💎', type:'diamonds',   val:100       },
    // Distance milestones
    { id:'dist_500k',       name:'Ocean to Ocean',      desc:'Go 500 kilometers',                  icon:'🧭', type:'distance',   val:500000    },
    { id:'dist_2m',         name:'Galaxy Wanderer',     desc:'Go 2000 kilometers',                 icon:'🌟', type:'distance',   val:2000000   },
    // New map-specific distance goals (reusing existing map keys)
    { id:'jungle_5k',       name:'Canopy King',         desc:'Go 5000m in Jungle',                 icon:'🐒', type:'map_dist',   val:5000, map:'jungle'     },
    { id:'moon_5k',         name:'Lunar Marathoner',    desc:'Go 5000m in Moon',                   icon:'🌕', type:'map_dist',   val:5000, map:'moon'       },
    { id:'volcano_3k',      name:'Ember Strider',       desc:'Go 3000m in Volcano',                icon:'🔥', type:'map_dist',   val:3000, map:'volcano'    },
    { id:'underwater_5k',   name:'Abyss Voyager',       desc:'Go 5000m in Underwater',             icon:'🐙', type:'map_dist',   val:5000, map:'underwater' },
    { id:'canyon_5k',       name:'Gorge Master',        desc:'Go 5000m in Canyon',                 icon:'🪨', type:'map_dist',   val:5000, map:'canyon'     },
    { id:'winter_5k',       name:'Frost Trailblazer',   desc:'Go 5000m in Winter',                 icon:'🧊', type:'map_dist',   val:5000, map:'winter'     },
    // Survival & consistency
    { id:'no_flip_10k',     name:'Steady Hands',        desc:'Go 10,000m without flipping',        icon:'🧘', type:'no_flip',    val:10000     },
    { id:'fuel_save_5k',    name:'Thrifty Tank',        desc:'Go 5000m without running out of fuel', icon:'🛢️', type:'fuel_save', val:5000     },
    { id:'play_250',        name:'Track Veteran',       desc:'Play 250 runs',                       icon:'🎖️', type:'run_count', val:250       },
    { id:'play_500',        name:'Eternal Racer',       desc:'Play 500 runs',                       icon:'♾️', type:'run_count', val:500       },
    // Bot race & fleet
    { id:'bot_25_wins',     name:'Bot Emperor',         desc:'Win 25 bot races',                   icon:'👑', type:'bot_win',    val:25        },
    { id:'vehicle_20',      name:'Mega Garage',         desc:'Own 20 different vehicles',          icon:'🚚', type:'vehicles',   val:20        },
    // --- Second wave of original achievements (appended) ---
    // Distance milestones
    { id:'dist_750k',       name:'Around the Globe',    desc:'Go 750 kilometers',                  icon:'🧳', type:'distance',   val:750000    },
    { id:'dist_5m',         name:'Interstellar Nomad',  desc:'Go 5000 kilometers',                 icon:'🪐', type:'distance',   val:5000000   },
    // Map-specific distance goals (existing map keys)
    { id:'countryside_10k', name:'Alpine Legend',       desc:'Go 10,000m in Countryside',          icon:'🏔️', type:'map_dist',  val:10000, map:'countryside' },
    { id:'desert_5k',       name:'Dune Sovereign',      desc:'Go 5000m in Desert',                 icon:'🐪', type:'map_dist',   val:5000, map:'desert'      },
    { id:'beach_5k',        name:'Tidal Champion',      desc:'Go 5000m in Beach',                  icon:'🏝️', type:'map_dist',  val:5000, map:'beach'       },
    { id:'city_10k',        name:'Skyline Sprinter',    desc:'Go 10,000m in City',                 icon:'🌃', type:'map_dist',   val:10000, map:'city'        },
    { id:'mars_10k',        name:'Red Planet Ruler',    desc:'Go 10,000m in Mars',                 icon:'🛰️', type:'map_dist',  val:10000, map:'mars'        },
    { id:'neon_5k',         name:'Synthwave Rider',     desc:'Go 5000m in Neon City',              icon:'🎆', type:'map_dist',   val:5000, map:'neon'        },
    { id:'wasteland_5k',    name:'Fallout Wanderer',    desc:'Go 5000m in Wasteland',              icon:'🛞', type:'map_dist',   val:5000, map:'wasteland'   },
    // Flip & combo milestones
    { id:'flip_500',        name:'Rotation Overlord',   desc:'Do 500 flips (total)',               icon:'🌀', type:'total_flip', val:500       },
    { id:'flip_1000',       name:'Infinite Spinner',    desc:'Do 1000 flips (total)',              icon:'♾️', type:'total_flip', val:1000      },
    { id:'octa_flip',       name:'Whirlwind Ace',       desc:'Do 8 flips in one run',              icon:'🌪️', type:'run_flips',  val:8        },
    { id:'dodeca_flip',     name:'Dizzy Deity',         desc:'Do 12 flips in one run',             icon:'💫', type:'run_flips',  val:12        },
    { id:'combo_5',         name:'Penta Storm',         desc:'Chain 5 moves at once',              icon:'⚡', type:'combo',      val:5         },
    // Speed
    { id:'speed_350',       name:'Mach Breaker',        desc:'Reach 350 km/h speed',               icon:'🚀', type:'speed',      val:350       },
    { id:'speed_400',       name:'Hyperdrive Hero',     desc:'Reach 400 km/h speed',               icon:'💫', type:'speed',      val:400       },
    // Airtime
    { id:'airtime_90',      name:'Skybound Soul',       desc:'Stay 90 seconds airborne',           icon:'🕊️', type:'airtime',   val:90        },
    { id:'airtime_120',     name:'Weightless Wonder',   desc:'Stay 120 seconds airborne',          icon:'🎈', type:'airtime',    val:120       },
    // Economy
    { id:'coins_500k',      name:'Coin Emperor',        desc:'Collect 500,000 coins',              icon:'👑', type:'total_coins', val:500000   },
    { id:'coins_1m',        name:'Coin Deity',          desc:'Collect 1,000,000 coins',            icon:'🌟', type:'total_coins', val:1000000  },
    { id:'gold_250k',       name:'Vault Overlord',      desc:'Reach 250,000 gold',                 icon:'🏰', type:'gold',       val:250000    },
    { id:'diamond_250',     name:'Diamond Dynasty',     desc:'Collect 250 diamonds',               icon:'💠', type:'diamonds',   val:250       },
    // Survival & consistency
    { id:'no_flip_25k',     name:'Zen Pilot',           desc:'Go 25,000m without flipping',        icon:'🧘', type:'no_flip',    val:25000     },
    { id:'fuel_save_10k',   name:'Efficiency Expert',   desc:'Go 10,000m without running out of fuel', icon:'🔋', type:'fuel_save', val:10000  },
    { id:'play_1000',       name:'Immortal Driver',     desc:'Play 1000 runs',                      icon:'🎗️', type:'run_count', val:1000      },
    // Bot race & fleet
    { id:'bot_50_wins',     name:'Bot Annihilator',     desc:'Win 50 bot races',                   icon:'💥', type:'bot_win',    val:50        },
    { id:'vehicle_25',      name:'Ultimate Collector',  desc:'Own 25 different vehicles',          icon:'🏆', type:'vehicles',   val:25        },
    // --- Third wave of original achievements (appended) ---
    // Distance milestones
    { id:'dist_1500k',      name:'Meridian Master',     desc:'Go 1500 kilometers',                 icon:'🌐', type:'distance',   val:1500000   },
    { id:'dist_3m',         name:'Cosmic Drifter',      desc:'Go 3000 kilometers',                 icon:'☄️', type:'distance',   val:3000000   },
    { id:'dist_10m',        name:'Eternal Voyager',     desc:'Go 10,000 kilometers',               icon:'🌌', type:'distance',   val:10000000  },
    // Map-specific distance goals (existing map keys)
    { id:'countryside_20k', name:'Highland Sovereign',  desc:'Go 20,000m in Countryside',          icon:'⛰️', type:'map_dist',  val:20000, map:'countryside' },
    { id:'desert_10k',      name:'Sahara Emperor',      desc:'Go 10,000m in Desert',               icon:'🏵️', type:'map_dist', val:10000, map:'desert'      },
    { id:'moon_10k',        name:'Lunar Overlord',      desc:'Go 10,000m in Moon',                 icon:'🌗', type:'map_dist',   val:10000, map:'moon'        },
    { id:'volcano_5k',      name:'Magma Monarch',       desc:'Go 5000m in Volcano',                icon:'🌋', type:'map_dist',   val:5000,  map:'volcano'     },
    { id:'jungle_10k',      name:'Rainforest Ruler',    desc:'Go 10,000m in Jungle',               icon:'🦜', type:'map_dist',   val:10000, map:'jungle'      },
    { id:'neon_10k',        name:'Grid Runner',         desc:'Go 10,000m in Neon City',            icon:'🌈', type:'map_dist',   val:10000, map:'neon'        },
    // Flip & combo milestones
    { id:'flip_2500',       name:'Vortex Sovereign',    desc:'Do 2500 flips (total)',              icon:'🌀', type:'total_flip', val:2500      },
    { id:'flip_5000',       name:'Spin Singularity',    desc:'Do 5000 flips (total)',              icon:'💫', type:'total_flip', val:5000      },
    { id:'hexa_dec_flip',   name:'Cyclone Sage',        desc:'Do 15 flips in one run',             icon:'🌪️', type:'run_flips',  val:15       },
    { id:'combo_6',         name:'Hexa Cataclysm',      desc:'Chain 6 moves at once',              icon:'💥', type:'combo',      val:6         },
    // Speed
    { id:'speed_450',       name:'Plasma Pilot',        desc:'Reach 450 km/h speed',               icon:'⚡', type:'speed',      val:450       },
    { id:'speed_500',       name:'Ludicrous Speed',     desc:'Reach 500 km/h speed',               icon:'🌠', type:'speed',      val:500       },
    // Airtime
    { id:'airtime_150',     name:'Cloud Nomad',         desc:'Stay 150 seconds airborne',          icon:'☁️', type:'airtime',    val:150       },
    { id:'airtime_180',     name:'Zero Gravity Zen',    desc:'Stay 180 seconds airborne',          icon:'🧘', type:'airtime',    val:180       },
    // Economy
    { id:'coins_2m',        name:'Coin Overlord',       desc:'Collect 2,000,000 coins',            icon:'👑', type:'total_coins', val:2000000  },
    { id:'gold_500k',       name:'Treasury Titan',      desc:'Reach 500,000 gold',                 icon:'🏦', type:'gold',       val:500000    },
    { id:'diamond_500',     name:'Diamond Deity',       desc:'Collect 500 diamonds',               icon:'💎', type:'diamonds',   val:500       },
    // Survival & consistency
    { id:'no_flip_50k',     name:'Perfect Equilibrium', desc:'Go 50,000m without flipping',        icon:'⚖️', type:'no_flip',   val:50000     },
    { id:'fuel_save_20k',   name:'Fuel Alchemist',      desc:'Go 20,000m without running out of fuel', icon:'⛽', type:'fuel_save', val:20000  },
    { id:'play_2500',       name:'Living Legend',       desc:'Play 2500 runs',                      icon:'🏅', type:'run_count', val:2500      },
    // Bot race & fleet
    { id:'bot_100_wins',    name:'Bot Overlord',        desc:'Win 100 bot races',                  icon:'🤖', type:'bot_win',    val:100       },
    { id:'vehicle_30',      name:'Grand Curator',       desc:'Own 30 different vehicles',          icon:'👑', type:'vehicles',   val:30        },
    // --- Fourth wave of original achievements (appended) ---
    // Distance milestones
    { id:'dist_150',        name:'Warming Up',          desc:'Go 150 meters',                      icon:'🚙', type:'distance',   val:150       },
    { id:'dist_750',        name:'Getting Serious',     desc:'Go 750 meters',                      icon:'🛤️', type:'distance',  val:750       },
    { id:'dist_3500',       name:'Long Hauler',         desc:'Go 3500 meters',                     icon:'🚛', type:'distance',   val:3500      },
    { id:'dist_15k',        name:'Fifteen Club',        desc:'Go 15 kilometers',                   icon:'🎯', type:'distance',   val:15000     },
    { id:'dist_75k',        name:'Regional Runner',     desc:'Go 75 kilometers',                   icon:'🧭', type:'distance',   val:75000     },
    { id:'dist_20m',        name:'Boundless Traveler',  desc:'Go 20,000 kilometers',               icon:'🌠', type:'distance',   val:20000000  },
    // Map-specific distance goals (existing map keys)
    { id:'countryside_50k', name:'Alpine Immortal',     desc:'Go 50,000m in Countryside',          icon:'🏔️', type:'map_dist',  val:50000, map:'countryside' },
    { id:'desert_20k',      name:'Mirage Emperor',      desc:'Go 20,000m in Desert',               icon:'🐫', type:'map_dist',   val:20000, map:'desert'      },
    { id:'winter_10k',      name:'Blizzard Baron',      desc:'Go 10,000m in Winter',               icon:'⛄', type:'map_dist',   val:10000, map:'winter'      },
    { id:'beach_10k',       name:'Shoreline Sovereign', desc:'Go 10,000m in Beach',                icon:'🏖️', type:'map_dist',  val:10000, map:'beach'       },
    { id:'city_20k',        name:'Downtown Deity',      desc:'Go 20,000m in City',                 icon:'🌉', type:'map_dist',   val:20000, map:'city'        },
    { id:'mars_20k',        name:'Martian Monarch',     desc:'Go 20,000m in Mars',                 icon:'🪐', type:'map_dist',   val:20000, map:'mars'        },
    { id:'moon_20k',        name:'Selene Sovereign',    desc:'Go 20,000m in Moon',                 icon:'🌘', type:'map_dist',   val:20000, map:'moon'        },
    { id:'jungle_20k',      name:'Verdant Emperor',     desc:'Go 20,000m in Jungle',               icon:'🌴', type:'map_dist',   val:20000, map:'jungle'      },
    { id:'underwater_10k',  name:'Trench Titan',        desc:'Go 10,000m in Underwater',           icon:'🐳', type:'map_dist',   val:10000, map:'underwater' },
    { id:'canyon_10k',      name:'Ravine Ruler',        desc:'Go 10,000m in Canyon',               icon:'🏞️', type:'map_dist',  val:10000, map:'canyon'      },
    { id:'volcano_10k',     name:'Inferno Emperor',     desc:'Go 10,000m in Volcano',              icon:'🔥', type:'map_dist',   val:10000, map:'volcano'     },
    { id:'neon_20k',        name:'Circuit Sovereign',   desc:'Go 20,000m in Neon City',            icon:'🌈', type:'map_dist',   val:20000, map:'neon'        },
    { id:'wasteland_10k',   name:'Scrapland Warlord',   desc:'Go 10,000m in Wasteland',            icon:'☣️', type:'map_dist',  val:10000, map:'wasteland'   },
    // Flip & combo milestones
    { id:'flip_75',         name:'Tumble Tactician',    desc:'Do 75 flips (total)',                icon:'🤹', type:'total_flip', val:75        },
    { id:'flip_10000',      name:'Perpetual Whirl',     desc:'Do 10,000 flips (total)',            icon:'🌀', type:'total_flip', val:10000     },
    { id:'icosa_flip',      name:'Tempest Titan',       desc:'Do 20 flips in one run',             icon:'🌪️', type:'run_flips',  val:20       },
    { id:'combo_7',         name:'Septa Surge',         desc:'Chain 7 moves at once',              icon:'🎆', type:'combo',      val:7         },
    // Speed
    { id:'speed_600',       name:'Photon Racer',        desc:'Reach 600 km/h speed',               icon:'🚀', type:'speed',      val:600       },
    // Airtime
    { id:'airtime_240',     name:'Stratosphere Soul',   desc:'Stay 240 seconds airborne',          icon:'🛰️', type:'airtime',   val:240       },
    { id:'airtime_300',     name:'Eternal Floater',     desc:'Stay 300 seconds airborne',          icon:'🌌', type:'airtime',    val:300       },
    // Economy
    { id:'coins_5m',        name:'Coin Colossus',       desc:'Collect 5,000,000 coins',            icon:'🏛️', type:'total_coins', val:5000000  },
    { id:'gold_25k',        name:'Coffer Keeper',       desc:'Reach 25,000 gold',                  icon:'🪙', type:'gold',       val:25000     },
    { id:'gold_1m',         name:'Golden Sovereign',    desc:'Reach 1,000,000 gold',               icon:'👑', type:'gold',       val:1000000   },
    { id:'diamond_25',      name:'Gem Enthusiast',      desc:'Collect 25 diamonds',                icon:'🔹', type:'diamonds',   val:25        },
    { id:'diamond_1000',    name:'Crystal Emperor',     desc:'Collect 1000 diamonds',              icon:'💠', type:'diamonds',   val:1000      },
    // Survival & consistency
    { id:'no_flip_100k',    name:'Flawless Gyroscope',  desc:'Go 100,000m without flipping',       icon:'🧘', type:'no_flip',    val:100000    },
    { id:'fuel_save_50k',   name:'Perpetual Reserve',   desc:'Go 50,000m without running out of fuel', icon:'🛢️', type:'fuel_save', val:50000 },
    // Bot race & progression
    { id:'bot_200_wins',    name:'Bot Sovereign',       desc:'Win 200 bot races',                  icon:'🏆', type:'bot_win',    val:200       },
    { id:'play_5000',       name:'Timeless Racer',      desc:'Play 5000 runs',                      icon:'♾️', type:'run_count', val:5000      },
    // --- Fifth wave: original Turkish achievements (appended) ---
    // Mesafe kilometre taşları
    { id:'dist_300',        name:'Isınma Turu',          desc:'Toplam 300 metre yol kat et',        icon:'🚗', type:'distance',   val:300       },
    { id:'dist_400',        name:'İlk Adımlar',          desc:'Toplam 400 metre yol kat et',        icon:'👣', type:'distance',   val:400       },
    { id:'dist_1500',       name:'Yol Arkadaşı',         desc:'1500 metreye ulaş',                  icon:'🛣️', type:'distance',  val:1500      },
    { id:'dist_2500',       name:'Azimli Sürücü',        desc:'2500 metreye ulaş',                  icon:'💪', type:'distance',   val:2500      },
    { id:'dist_4000',       name:'Dört Bin Kulübü',      desc:'4000 metreye ulaş',                  icon:'🏁', type:'distance',   val:4000      },
    { id:'dist_7500',       name:'Uzun Yolcu',           desc:'7500 metreye ulaş',                  icon:'🛤️', type:'distance',  val:7500      },
    { id:'dist_20k',        name:'Yirmi Kilometre',      desc:'20 kilometre yol kat et',            icon:'🎯', type:'distance',   val:20000     },
    { id:'dist_30k',        name:'Otuzların Efendisi',   desc:'30 kilometre yol kat et',            icon:'🧭', type:'distance',   val:30000     },
    { id:'dist_40k',        name:'Kırk Kilometre Kahramanı', desc:'40 kilometre yol kat et',        icon:'🌟', type:'distance',   val:40000     },
    { id:'dist_150k',       name:'Şehirler Arası Yolcu', desc:'150 kilometre yol kat et',           icon:'🗺️', type:'distance',  val:150000    },
    { id:'dist_300k',       name:'Kıta Gezgini',         desc:'300 kilometre yol kat et',           icon:'🌍', type:'distance',   val:300000    },
    { id:'dist_400k',       name:'Sınır Tanımaz Sürücü', desc:'400 kilometre yol kat et',           icon:'🧭', type:'distance',   val:400000    },
    { id:'dist_4m',         name:'Yıldızlar Arası Kaşif', desc:'4000 kilometre yol kat et',         icon:'✨', type:'distance',   val:4000000   },
    { id:'dist_7m',         name:'Galaksi Kaşifi',       desc:'7000 kilometre yol kat et',          icon:'🌌', type:'distance',   val:7000000   },
    { id:'dist_15m',        name:'Sonsuzluk Yolcusu',    desc:'15.000 kilometre yol kat et',        icon:'🪐', type:'distance',   val:15000000  },
    { id:'dist_50m',        name:'Evren Fatihi',         desc:'50.000 kilometre yol kat et',        icon:'🛸', type:'distance',   val:50000000  },
    // Haritaya özel mesafe hedefleri
    { id:'countryside_1k',  name:'Çayır Yürüyüşçüsü',    desc:'Kırsal haritasında 1000m ilerle',    icon:'🌾', type:'map_dist',   val:1000,  map:'countryside' },
    { id:'countryside_3k',  name:'Tepe Bekçisi',         desc:'Kırsal haritasında 3000m ilerle',    icon:'⛰️', type:'map_dist',  val:3000,  map:'countryside' },
    { id:'countryside_30k', name:'Dağların Efsanesi',    desc:'Kırsal haritasında 30.000m ilerle',  icon:'🏔️', type:'map_dist',  val:30000, map:'countryside' },
    { id:'desert_1k',       name:'Kum Yolcusu',          desc:'Çöl haritasında 1000m ilerle',       icon:'🏜️', type:'map_dist',  val:1000,  map:'desert'      },
    { id:'desert_2k',       name:'Vaha Avcısı',          desc:'Çöl haritasında 2000m ilerle',       icon:'🌵', type:'map_dist',   val:2000,  map:'desert'      },
    { id:'desert_7k',       name:'Kum Fırtınası Ustası', desc:'Çöl haritasında 7000m ilerle',       icon:'🌪️', type:'map_dist',  val:7000,  map:'desert'      },
    { id:'desert_15k',      name:'Çöl Sultanı',          desc:'Çöl haritasında 15.000m ilerle',     icon:'🐫', type:'map_dist',   val:15000, map:'desert'      },
    { id:'desert_30k',      name:'Serap İmparatoru',     desc:'Çöl haritasında 30.000m ilerle',     icon:'🏵️', type:'map_dist',  val:30000, map:'desert'      },
    { id:'winter_500',      name:'Kar Tanesi',           desc:'Kış haritasında 500m ilerle',        icon:'❄️', type:'map_dist',  val:500,   map:'winter'      },
    { id:'winter_2k',       name:'Buz Yürüyüşçüsü',      desc:'Kış haritasında 2000m ilerle',       icon:'⛸️', type:'map_dist',  val:2000,  map:'winter'      },
    { id:'winter_7k',       name:'Tipi Kaşifi',          desc:'Kış haritasında 7000m ilerle',       icon:'🌨️', type:'map_dist',  val:7000,  map:'winter'      },
    { id:'winter_20k',      name:'Kutup Hükümdarı',      desc:'Kış haritasında 20.000m ilerle',     icon:'🐧', type:'map_dist',   val:20000, map:'winter'      },
    { id:'beach_500',       name:'Kum Kalesi',           desc:'Sahil haritasında 500m ilerle',      icon:'🏖️', type:'map_dist',  val:500,   map:'beach'       },
    { id:'beach_1k',        name:'Dalga Sörfçüsü',       desc:'Sahil haritasında 1000m ilerle',     icon:'🏄', type:'map_dist',   val:1000,  map:'beach'       },
    { id:'beach_2k',        name:'Deniz Meltemi',        desc:'Sahil haritasında 2000m ilerle',     icon:'🌊', type:'map_dist',   val:2000,  map:'beach'       },
    { id:'beach_7k',        name:'Kıyı Kaptanı',         desc:'Sahil haritasında 7000m ilerle',     icon:'⚓', type:'map_dist',   val:7000,  map:'beach'       },
    { id:'beach_20k',       name:'Okyanus Efendisi',     desc:'Sahil haritasında 20.000m ilerle',   icon:'🐚', type:'map_dist',   val:20000, map:'beach'       },
    { id:'city_1k',         name:'Sokak Kaşifi',         desc:'Şehir haritasında 1000m ilerle',     icon:'🏙️', type:'map_dist',  val:1000,  map:'city'        },
    { id:'city_3k',         name:'Trafik Ustası',        desc:'Şehir haritasında 3000m ilerle',     icon:'🚦', type:'map_dist',   val:3000,  map:'city'        },
    { id:'city_7k',         name:'Gökdelen Yarışçısı',   desc:'Şehir haritasında 7000m ilerle',     icon:'🏢', type:'map_dist',   val:7000,  map:'city'        },
    { id:'city_15k',        name:'Metropol Efsanesi',    desc:'Şehir haritasında 15.000m ilerle',   icon:'🌆', type:'map_dist',   val:15000, map:'city'        },
    { id:'city_30k',        name:'Şehir Kralı',          desc:'Şehir haritasında 30.000m ilerle',   icon:'🌃', type:'map_dist',   val:30000, map:'city'        },
    { id:'jungle_1k',       name:'Orman Yürüyüşçüsü',    desc:'Orman haritasında 1000m ilerle',     icon:'🌱', type:'map_dist',   val:1000,  map:'jungle'      },
    { id:'jungle_3k',       name:'Yaprak Avcısı',        desc:'Orman haritasında 3000m ilerle',     icon:'🍃', type:'map_dist',   val:3000,  map:'jungle'      },
    { id:'jungle_7k',       name:'Vahşi Kaşif',          desc:'Orman haritasında 7000m ilerle',     icon:'🐍', type:'map_dist',   val:7000,  map:'jungle'      },
    { id:'jungle_15k',      name:'Cengel Hükümdarı',     desc:'Orman haritasında 15.000m ilerle',   icon:'🦍', type:'map_dist',   val:15000, map:'jungle'      },
    { id:'mars_2k',         name:'Kızıl Toz Gezgini',    desc:'Mars haritasında 2000m ilerle',      icon:'🔴', type:'map_dist',   val:2000,  map:'mars'        },
    { id:'mars_3k',         name:'Krater Kaşifi',        desc:'Mars haritasında 3000m ilerle',      icon:'🌑', type:'map_dist',   val:3000,  map:'mars'        },
    { id:'mars_7k',         name:'Uzay Öncüsü',          desc:'Mars haritasında 7000m ilerle',      icon:'🛰️', type:'map_dist',  val:7000,  map:'mars'        },
    { id:'mars_15k',        name:'Mars Valisi',          desc:'Mars haritasında 15.000m ilerle',    icon:'🪐', type:'map_dist',   val:15000, map:'mars'        },
    { id:'moon_1k',         name:'Ay Yürüyüşçüsü',       desc:'Ay haritasında 1000m ilerle',        icon:'🌙', type:'map_dist',   val:1000,  map:'moon'        },
    { id:'moon_3k',         name:'Krater Zıpçısı',       desc:'Ay haritasında 3000m ilerle',        icon:'🌛', type:'map_dist',   val:3000,  map:'moon'        },
    { id:'moon_7k',         name:'Yerçekimsiz Kaşif',    desc:'Ay haritasında 7000m ilerle',        icon:'🌝', type:'map_dist',   val:7000,  map:'moon'        },
    { id:'moon_15k',        name:'Ay Hükümdarı',         desc:'Ay haritasında 15.000m ilerle',      icon:'🌕', type:'map_dist',   val:15000, map:'moon'        },
    { id:'neon_1k',         name:'Işık İzcisi',          desc:'Neon Şehir haritasında 1000m ilerle', icon:'💡', type:'map_dist',  val:1000,  map:'neon'        },
    { id:'neon_2k',         name:'Neon Sörfçüsü',        desc:'Neon Şehir haritasında 2000m ilerle', icon:'💜', type:'map_dist',  val:2000,  map:'neon'        },
    { id:'neon_7k',         name:'Piksel Yarışçısı',     desc:'Neon Şehir haritasında 7000m ilerle', icon:'🕹️', type:'map_dist', val:7000,  map:'neon'        },
    { id:'neon_15k',        name:'Devre Efendisi',       desc:'Neon Şehir haritasında 15.000m ilerle', icon:'🌈', type:'map_dist', val:15000, map:'neon'      },
    { id:'volcano_2k',      name:'Kül Yürüyüşçüsü',      desc:'Yanardağ haritasında 2000m ilerle',  icon:'🌋', type:'map_dist',   val:2000,  map:'volcano'     },
    { id:'volcano_7k',      name:'Lav Kaşifi',           desc:'Yanardağ haritasında 7000m ilerle',  icon:'🔥', type:'map_dist',   val:7000,  map:'volcano'     },
    { id:'volcano_15k',     name:'Magma Hükümdarı',      desc:'Yanardağ haritasında 15.000m ilerle', icon:'♨️', type:'map_dist',  val:15000, map:'volcano'    },
    { id:'volcano_20k',     name:'Kor Ateş İmparatoru',  desc:'Yanardağ haritasında 20.000m ilerle', icon:'🌡️', type:'map_dist',  val:20000, map:'volcano'    },
    { id:'underwater_1k',   name:'Sığ Su Dalgıcı',       desc:'Su Altı haritasında 1000m ilerle',   icon:'🤿', type:'map_dist',   val:1000,  map:'underwater'  },
    { id:'underwater_3k',   name:'Mercan Kaşifi',        desc:'Su Altı haritasında 3000m ilerle',   icon:'🐠', type:'map_dist',   val:3000,  map:'underwater'  },
    { id:'underwater_7k',   name:'Derin Dalgıç',         desc:'Su Altı haritasında 7000m ilerle',   icon:'🐡', type:'map_dist',   val:7000,  map:'underwater'  },
    { id:'underwater_15k',  name:'Okyanus Dibi Efendisi', desc:'Su Altı haritasında 15.000m ilerle', icon:'🐙', type:'map_dist', val:15000, map:'underwater' },
    { id:'canyon_1k',       name:'Kaya Yürüyüşçüsü',     desc:'Kanyon haritasında 1000m ilerle',    icon:'🪨', type:'map_dist',   val:1000,  map:'canyon'      },
    { id:'canyon_2k',       name:'Vadi Kaşifi',          desc:'Kanyon haritasında 2000m ilerle',    icon:'🏜️', type:'map_dist',  val:2000,  map:'canyon'      },
    { id:'canyon_7k',       name:'Uçurum Yarışçısı',     desc:'Kanyon haritasında 7000m ilerle',    icon:'🧗', type:'map_dist',   val:7000,  map:'canyon'      },
    { id:'canyon_15k',      name:'Kanyon Hükümdarı',     desc:'Kanyon haritasında 15.000m ilerle',  icon:'🏞️', type:'map_dist',  val:15000, map:'canyon'      },
    { id:'wasteland_1k',    name:'Enkaz Yürüyüşçüsü',    desc:'Çorak Toprak haritasında 1000m ilerle', icon:'🛞', type:'map_dist', val:1000,  map:'wasteland'  },
    { id:'wasteland_3k',    name:'Hurda Avcısı',         desc:'Çorak Toprak haritasında 3000m ilerle', icon:'⚙️', type:'map_dist', val:3000,  map:'wasteland'  },
    { id:'wasteland_7k',    name:'Radyasyon Kaşifi',     desc:'Çorak Toprak haritasında 7000m ilerle', icon:'☢️', type:'map_dist', val:7000,  map:'wasteland'  },
    { id:'wasteland_15k',   name:'Çorak Diyar Savaşçısı', desc:'Çorak Toprak haritasında 15.000m ilerle', icon:'☣️', type:'map_dist', val:15000, map:'wasteland' },
    // Takla ve kombo kilometre taşları
    { id:'flip_15',         name:'Takla Çırağı',         desc:'Toplam 15 takla at',                 icon:'🤸', type:'total_flip', val:15        },
    { id:'flip_150',        name:'Takla Zanaatkârı',     desc:'Toplam 150 takla at',                icon:'🎪', type:'total_flip', val:150       },
    { id:'flip_750',        name:'Dönüş Virtüözü',       desc:'Toplam 750 takla at',                icon:'🌀', type:'total_flip', val:750       },
    { id:'flip_1500',       name:'Girdap Efendisi',      desc:'Toplam 1500 takla at',               icon:'🌪️', type:'total_flip', val:1500     },
    { id:'flip_3000',       name:'Fırıldak Kralı',       desc:'Toplam 3000 takla at',               icon:'🎡', type:'total_flip', val:3000      },
    { id:'flip_7500',       name:'Takla Hükümdarı',      desc:'Toplam 7500 takla at',               icon:'💫', type:'total_flip', val:7500      },
    { id:'flip_25000',      name:'Sonsuz Dönüş',         desc:'Toplam 25.000 takla at',             icon:'♾️', type:'total_flip', val:25000     },
    { id:'flip_50000',      name:'Takla Tanrısı',        desc:'Toplam 50.000 takla at',             icon:'👑', type:'total_flip', val:50000     },
    { id:'run4_flip',       name:'Dörtlü Takla',         desc:'Tek sürüşte 4 takla at',             icon:'🎯', type:'run_flips',  val:4         },
    { id:'run6_flip',       name:'Altılı Fırtına',       desc:'Tek sürüşte 6 takla at',             icon:'🔥', type:'run_flips',  val:6         },
    { id:'run9_flip',       name:'Dokuzlu Kasırga',      desc:'Tek sürüşte 9 takla at',             icon:'🌪️', type:'run_flips', val:9         },
    { id:'run11_flip',      name:'On Birli Girdap',      desc:'Tek sürüşte 11 takla at',            icon:'💫', type:'run_flips',  val:11        },
    { id:'run25_flip',      name:'Yirmi Beşli Efsane',   desc:'Tek sürüşte 25 takla at',            icon:'☄️', type:'run_flips',  val:25        },
    { id:'run30_flip',      name:'Otuzlu Mucize',        desc:'Tek sürüşte 30 takla at',            icon:'🌠', type:'run_flips',  val:30        },
    { id:'combo_8',         name:'Sekizli Patlama',      desc:'Aynı anda 8 hareket zincirle',       icon:'🎆', type:'combo',      val:8         },
    { id:'combo_9',         name:'Dokuzlu Kıyamet',      desc:'Aynı anda 9 hareket zincirle',       icon:'💥', type:'combo',      val:9         },
    { id:'combo_10',        name:'Onlu Kaos',            desc:'Aynı anda 10 hareket zincirle',      icon:'🧨', type:'combo',      val:10        },
    // Hız kilometre taşları
    { id:'speed_50',        name:'İlk Gaz',              desc:'50 km/s hıza ulaş',                  icon:'🚗', type:'speed',      val:50        },
    { id:'speed_125',       name:'Hızlanan',             desc:'125 km/s hıza ulaş',                 icon:'💨', type:'speed',      val:125       },
    { id:'speed_175',       name:'Rüzgâr Gibi',          desc:'175 km/s hıza ulaş',                 icon:'🌬️', type:'speed',     val:175       },
    { id:'speed_550',       name:'Ses Ötesi',            desc:'550 km/s hıza ulaş',                 icon:'🚄', type:'speed',      val:550       },
    { id:'speed_700',       name:'Şimşek Sürücü',        desc:'700 km/s hıza ulaş',                 icon:'⚡', type:'speed',      val:700       },
    { id:'speed_800',       name:'Roket Sürücü',         desc:'800 km/s hıza ulaş',                 icon:'🚀', type:'speed',      val:800       },
    { id:'speed_1000',      name:'Işık Hızı Efendisi',   desc:'1000 km/s hıza ulaş',                icon:'🌠', type:'speed',      val:1000      },
    // Havada kalış kilometre taşları
    { id:'airtime_15',      name:'Havada On Beş',        desc:'15 saniye havada kal',               icon:'🎈', type:'airtime',    val:15        },
    { id:'airtime_75',      name:'Gökyüzü Gezgini',      desc:'75 saniye havada kal',               icon:'🕊️', type:'airtime',   val:75        },
    { id:'airtime_210',     name:'Bulut Yolcusu',        desc:'210 saniye havada kal',              icon:'☁️', type:'airtime',   val:210       },
    { id:'airtime_360',     name:'Stratosfer Ruhu',      desc:'360 saniye havada kal',              icon:'🛰️', type:'airtime',   val:360       },
    { id:'airtime_420',     name:'Yörünge Efendisi',     desc:'420 saniye havada kal',              icon:'🪐', type:'airtime',    val:420       },
    { id:'airtime_600',     name:'Sonsuz Süzülüş',       desc:'600 saniye havada kal',              icon:'🌌', type:'airtime',    val:600       },
    // Ekonomi kilometre taşları
    { id:'coins_250',       name:'İlk Kumbara',          desc:'250 madeni para topla',              icon:'🪙', type:'total_coins', val:250      },
    { id:'coins_2500',      name:'Para Biriktiren',      desc:'2500 madeni para topla',             icon:'💵', type:'total_coins', val:2500     },
    { id:'coins_25k',       name:'Kasa Dolduran',        desc:'25.000 madeni para topla',           icon:'💰', type:'total_coins', val:25000    },
    { id:'coins_75k',       name:'Servet Avcısı',        desc:'75.000 madeni para topla',           icon:'🏦', type:'total_coins', val:75000    },
    { id:'coins_750k',      name:'Altın Baron',          desc:'750.000 madeni para topla',          icon:'👛', type:'total_coins', val:750000   },
    { id:'coins_3m',        name:'Para İmparatoru',      desc:'3.000.000 madeni para topla',        icon:'👑', type:'total_coins', val:3000000  },
    { id:'coins_10m',       name:'Para Devi',            desc:'10.000.000 madeni para topla',       icon:'🏛️', type:'total_coins', val:10000000 },
    { id:'coins_25m',       name:'Para Efsanesi',        desc:'25.000.000 madeni para topla',       icon:'🌟', type:'total_coins', val:25000000 },
    { id:'gold_500',        name:'İlk Altın',            desc:'500 altına ulaş',                    icon:'🪙', type:'gold',       val:500       },
    { id:'gold_2500',       name:'Altın Toplayıcı',      desc:'2500 altına ulaş',                   icon:'💛', type:'gold',       val:2500      },
    { id:'gold_75k',        name:'Altın Sandık',         desc:'75.000 altına ulaş',                 icon:'🏆', type:'gold',       val:75000     },
    { id:'gold_2m',         name:'Altın Hükümdarı',      desc:'2.000.000 altına ulaş',              icon:'🏰', type:'gold',       val:2000000   },
    { id:'gold_5m',         name:'Altın Efsanesi',       desc:'5.000.000 altına ulaş',              icon:'👑', type:'gold',       val:5000000   },
    { id:'diamond_5',       name:'Elmas Meraklısı',      desc:'5 elmas topla',                      icon:'🔹', type:'diamonds',   val:5         },
    { id:'diamond_75',      name:'Elmas Ustası',         desc:'75 elmas topla',                     icon:'🔷', type:'diamonds',   val:75        },
    { id:'diamond_2500',    name:'Elmas Hanedanı',       desc:'2500 elmas topla',                   icon:'💠', type:'diamonds',   val:2500      },
    { id:'diamond_5000',    name:'Kristal Tanrısı',      desc:'5000 elmas topla',                   icon:'💎', type:'diamonds',   val:5000      },
    // Araç ustalığı
    { id:'vehicle_8',       name:'Küçük Filo',           desc:'8 farklı araca sahip ol',            icon:'🚗', type:'vehicles',   val:8         },
    { id:'vehicle_12',      name:'Genişleyen Garaj',     desc:'12 farklı araca sahip ol',           icon:'🚙', type:'vehicles',   val:12        },
    { id:'vehicle_18',      name:'Araç Tutkunu',         desc:'18 farklı araca sahip ol',           icon:'🏎️', type:'vehicles',  val:18        },
    // Bot yarışı kilometre taşları
    { id:'bot_15_wins',     name:'Bot Avcısı',           desc:'15 bot yarışı kazan',                icon:'⚔️', type:'bot_win',   val:15        },
    { id:'bot_75_wins',     name:'Bot Kâbusu',           desc:'75 bot yarışı kazan',                icon:'💀', type:'bot_win',    val:75        },
    { id:'bot_150_wins',    name:'Bot Efendisi',         desc:'150 bot yarışı kazan',               icon:'🥇', type:'bot_win',    val:150       },
    { id:'bot_500_wins',    name:'Bot İmparatoru',       desc:'500 bot yarışı kazan',               icon:'👑', type:'bot_win',    val:500       },
    { id:'bot_1000_wins',   name:'Bot Efsanesi',         desc:'1000 bot yarışı kazan',              icon:'🏆', type:'bot_win',    val:1000      },
    // Hasarsız ve dengeli sürüş
    { id:'no_flip_2500',    name:'Sabit Eller',          desc:'2500m takla atmadan git',            icon:'⚖️', type:'no_flip',   val:2500      },
    { id:'no_flip_15k',     name:'Dengeli Usta',         desc:'15.000m takla atmadan git',          icon:'🧘', type:'no_flip',    val:15000     },
    { id:'no_flip_75k',     name:'Kusursuz Denge',       desc:'75.000m takla atmadan git',          icon:'🎯', type:'no_flip',    val:75000     },
    { id:'no_flip_200k',    name:'Sarsılmaz Jiroskop',   desc:'200.000m takla atmadan git',         icon:'🛡️', type:'no_flip',   val:200000    },
    { id:'no_flip_500k',    name:'Mutlak Denge Efendisi', desc:'500.000m takla atmadan git',        icon:'👑', type:'no_flip',    val:500000    },
    { id:'fuel_save_1k',    name:'Yakıt Bilinçli',       desc:'1000m yakıtın bitmeden git',         icon:'⛽', type:'fuel_save',  val:1000      },
    { id:'fuel_save_15k',   name:'Tutumlu Depo',         desc:'15.000m yakıtın bitmeden git',       icon:'🛢️', type:'fuel_save', val:15000     },
    { id:'fuel_save_30k',   name:'Yakıt Simyacısı',      desc:'30.000m yakıtın bitmeden git',       icon:'🔋', type:'fuel_save',  val:30000     },
    { id:'fuel_save_100k',  name:'Sonsuz Rezerv',        desc:'100.000m yakıtın bitmeden git',      icon:'♾️', type:'fuel_save',  val:100000    },
    // Sürüş sayısı kilometre taşları
    { id:'play_25',         name:'Yeni Alışkanlık',      desc:'25 sürüş oyna',                      icon:'🔄', type:'run_count',  val:25        },
    { id:'play_75',         name:'Bağımlı Sürücü',       desc:'75 sürüş oyna',                      icon:'🎮', type:'run_count',  val:75        },
    { id:'play_750',        name:'Pist Kurdu',           desc:'750 sürüş oyna',                     icon:'🎖️', type:'run_count', val:750       },
    { id:'play_1500',       name:'Yolun Efsanesi',       desc:'1500 sürüş oyna',                    icon:'🏅', type:'run_count',  val:1500      },
    { id:'play_10000',      name:'Ölümsüz Yarışçı',      desc:'10.000 sürüş oyna',                  icon:'♾️', type:'run_count',  val:10000     },
    // --- Sixth wave: Coin Rush, Sakura, yeni araçlar & parçalar (appended) ---
    // Coin Rush modu — sikke biriktirme kilometre taşları
    { id:'cr_coins_1500',   name:'Sikke Yağmuru Çaylağı', desc:'Coin Rush oynayarak toplam 1500 sikke biriktir', icon:'🪙', type:'total_coins', val:1500     },
    { id:'cr_coins_7500',   name:'Coin Rush Ustası',      desc:'Coin Rush oynayarak toplam 7500 sikke biriktir', icon:'💰', type:'total_coins', val:7500     },
    { id:'cr_coins_15k',    name:'Sikke Fırtınası',       desc:'Coin Rush oynayarak toplam 15.000 sikke biriktir', icon:'🌪️', type:'total_coins', val:15000   },
    { id:'cr_coins_300k',   name:'Coin Rush Kralı',       desc:'Coin Rush oynayarak toplam 300.000 sikke biriktir', icon:'👑', type:'total_coins', val:300000 },
    { id:'cr_coins_600k',   name:'Sikke Yağmuru Efsanesi', desc:'Coin Rush oynayarak toplam 600.000 sikke biriktir', icon:'🌟', type:'total_coins', val:600000 },
    // Sakura haritası — mesafe hedefleri
    { id:'sakura_500',      name:'Kiraz Çiçeği Çaylağı',  desc:'Sakura haritasında 500m ilerle',     icon:'🌸', type:'map_dist',   val:500,   map:'sakura'      },
    { id:'sakura_1k',       name:'Sakura Yolcusu',        desc:'Sakura haritasında 1000m ilerle',    icon:'🌸', type:'map_dist',   val:1000,  map:'sakura'      },
    { id:'sakura_2k',       name:'Pembe Yaprak Kaşifi',   desc:'Sakura haritasında 2000m ilerle',    icon:'🏯', type:'map_dist',   val:2000,  map:'sakura'      },
    { id:'sakura_3k',       name:'Bahar Rüzgârı',         desc:'Sakura haritasında 3000m ilerle',    icon:'🍃', type:'map_dist',   val:3000,  map:'sakura'      },
    { id:'sakura_5k',       name:'Sakura Ustası',         desc:'Sakura haritasında 5000m ilerle',    icon:'🌸', type:'map_dist',   val:5000,  map:'sakura'      },
    { id:'sakura_10k',      name:'Kiraz Bahçesi Efendisi', desc:'Sakura haritasında 10.000m ilerle', icon:'🌸', type:'map_dist',   val:10000, map:'sakura'      },
    { id:'sakura_20k',      name:'Sakura İmparatoru',     desc:'Sakura haritasında 20.000m ilerle',  icon:'👑', type:'map_dist',   val:20000, map:'sakura'      },
    // Yeni araçlar — koleksiyon kilometre taşları
    { id:'vehicle_22',      name:'Hoverbike Sürücüsü',    desc:'Hoverbike dahil 22 farklı araca sahip ol', icon:'🛸', type:'vehicles',   val:22        },
    { id:'vehicle_28',      name:'Dragster Koleksiyoncusu', desc:'Dragster dahil 28 farklı araca sahip ol', icon:'🏎️', type:'vehicles',  val:28        },
    { id:'vehicle_35',      name:'Buhar Silindiri Garajı', desc:'Steamroller dahil 35 farklı araca sahip ol', icon:'🚜', type:'vehicles',  val:35        },
    { id:'vehicle_40',      name:'Roket Kızak Filosu',    desc:'Rocket Sled dahil 40 farklı araca sahip ol', icon:'🚀', type:'vehicles',   val:40        },
    { id:'vehicle_45',      name:'Alışveriş Arabası Kralı', desc:'Shopping Cart dahil 45 farklı araca sahip ol', icon:'🛒', type:'vehicles', val:45        },
    { id:'vehicle_50',      name:'Küvet Kaptanı',         desc:'Bathtub dahil 50 farklı araca sahip ol', icon:'🛁', type:'vehicles',   val:50        },
    // Kombo Ustası (combo_master) parçası — kombo kilometre taşları
    { id:'combo_11',        name:'Kombo Ustası Çırağı',   desc:'combo_master parçasıyla aynı anda 11 hareket zincirle', icon:'🎆', type:'combo', val:11        },
    { id:'combo_12',        name:'Kombo Efendisi',        desc:'combo_master parçasıyla aynı anda 12 hareket zincirle', icon:'💥', type:'combo', val:12        },
    { id:'combo_15',        name:'Kombo Virtüözü',        desc:'combo_master parçasıyla aynı anda 15 hareket zincirle', icon:'🧨', type:'combo', val:15        },
    // Yumuşak İniş (smooth_lander) parçası — takla atmadan sürüş
    { id:'no_flip_3500',    name:'Yumuşak İniş Çaylağı',  desc:'smooth_lander ile 3500m takla atmadan git', icon:'🪂', type:'no_flip', val:3500      },
    { id:'no_flip_30k',     name:'Pürüzsüz Sürücü',       desc:'smooth_lander ile 30.000m takla atmadan git', icon:'🕊️', type:'no_flip', val:30000    },
    // Ek kilometre taşları — sürüş, bot, hız, hava, elmas, takla
    { id:'play_40',         name:'Kırk Sürüş',            desc:'40 sürüş oyna',                      icon:'🔄', type:'run_count',  val:40        },
    { id:'play_3000',       name:'Üç Bin Sürüş Efsanesi', desc:'3000 sürüş oyna',                    icon:'🎖️', type:'run_count', val:3000      },
    { id:'bot_30_wins',     name:'Bot Fatihi',            desc:'30 bot yarışı kazan',                icon:'⚔️', type:'bot_win',   val:30        },
    { id:'bot_250_wins',    name:'Bot Hükümdarı',         desc:'250 bot yarışı kazan',               icon:'👑', type:'bot_win',    val:250       },
    { id:'speed_90',        name:'Doksan Hız',            desc:'90 km/s hıza ulaş',                  icon:'🚗', type:'speed',      val:90        },
    { id:'speed_900',       name:'Dokuz Yüz Hız Canavarı', desc:'900 km/s hıza ulaş',                icon:'🚀', type:'speed',      val:900       },
    { id:'airtime_480',     name:'Sekiz Dakika Havada',   desc:'480 saniye havada kal',              icon:'🛰️', type:'airtime',   val:480       },
    { id:'diamond_150',     name:'Elmas Koleksiyoncusu',  desc:'150 elmas topla',                    icon:'🔷', type:'diamonds',   val:150       },
    { id:'diamond_750',     name:'Elmas Hazinesi',        desc:'750 elmas topla',                    icon:'💠', type:'diamonds',   val:750       },
    { id:'flip_200',        name:'İki Yüz Takla',         desc:'Toplam 200 takla at',                icon:'🤸', type:'total_flip', val:200       },
    // --- Seventh wave: Yakıt Denemesi & Kontrol Noktası modları, yeni araç ustalığı, ileri sakura/kombo/hava (appended) ---
    // Yakıt Denemesi (Fuel Trial) modu — yakıtın bitmeden uzun mesafe
    { id:'fuel_trial_2500', name:'Yakıt Denemesi Çaylağı', desc:'Yakıt Denemesi modunda 2500m yakıtın bitmeden git', icon:'⛽', type:'fuel_save', val:2500      },
    { id:'fuel_trial_40k',  name:'Yakıt Denemesi Ustası',  desc:'Yakıt Denemesi modunda 40.000m yakıtın bitmeden git', icon:'🛢️', type:'fuel_save', val:40000    },
    { id:'fuel_trial_75k',  name:'Yakıt Denemesi Şampiyonu', desc:'Yakıt Denemesi modunda 75.000m yakıtın bitmeden git', icon:'🔋', type:'fuel_save', val:75000   },
    // Kontrol Noktası (Checkpoint) modu — mesafe kilometre taşları
    { id:'checkpoint_1500', name:'Kontrol Noktası Avcısı', desc:'Kontrol Noktası modunda 1500m ilerle', icon:'🚩', type:'distance', val:1500      },
    { id:'checkpoint_7500', name:'Kontrol Noktası Ustası', desc:'Kontrol Noktası modunda 7500m ilerle', icon:'🏁', type:'distance', val:7500      },
    { id:'checkpoint_150k', name:'Kontrol Noktası Efsanesi', desc:'Kontrol Noktası modunda 150.000m ilerle', icon:'🏆', type:'distance', val:150000  },
    // En yeni araçlar — koleksiyon ustalığı kilometre taşları
    { id:'vehicle_55',      name:'Zaman Makinesi Garajı',  desc:'Time Machine dahil 55 farklı araca sahip ol', icon:'⏳', type:'vehicles', val:55        },
    { id:'vehicle_60',      name:'Tam Koleksiyon Efendisi', desc:'60 farklı araca sahip ol', icon:'🚗', type:'vehicles', val:60        },
    { id:'vehicle_65',      name:'Efsanevi Filo Komutanı', desc:'65 farklı araca sahip ol', icon:'🏵️', type:'vehicles', val:65        },
    // Sakura haritası — ileri mesafe hedefleri
    { id:'sakura_30k',      name:'Sakura Efsanesi',        desc:'Sakura haritasında 30.000m ilerle',  icon:'🌸', type:'map_dist', val:30000, map:'sakura'  },
    { id:'sakura_50k',      name:'Kiraz Çiçeği Şoguni',    desc:'Sakura haritasında 50.000m ilerle',  icon:'🏯', type:'map_dist', val:50000, map:'sakura'  },
    { id:'sakura_100k',     name:'Ebedi Kiraz Bahçesi',    desc:'Sakura haritasında 100.000m ilerle', icon:'👑', type:'map_dist', val:100000, map:'sakura' },
    // İleri kombo tiyerleri
    { id:'combo_16',        name:'Kombo Kâhini',           desc:'Aynı anda 16 hareket zincirle',      icon:'🎆', type:'combo', val:16        },
    { id:'combo_18',        name:'Kombo Titanı',           desc:'Aynı anda 18 hareket zincirle',      icon:'💥', type:'combo', val:18        },
    { id:'combo_20',        name:'Kombo Tanrısı',          desc:'Aynı anda 20 hareket zincirle',      icon:'🧨', type:'combo', val:20        },
    // Büyük hava süreleri
    { id:'airtime_540',     name:'Dokuz Dakika Süzülüş',   desc:'540 saniye havada kal',              icon:'☁️', type:'airtime', val:540       },
    { id:'airtime_720',     name:'On İki Dakika Uçuş',     desc:'720 saniye havada kal',              icon:'🛰️', type:'airtime', val:720       },
    // --- Eighth wave: en yeni araçlar, haftalık turnuva & yüksek kilometre taşları (appended) ---
    // Genişleyen araç kadrosu — ileri koleksiyon tiyerleri
    { id:'vehicle_70',      name:'Yetmiş Araç Efendisi',   desc:'70 farklı araca sahip ol',           icon:'🚗', type:'vehicles',   val:70        },
    { id:'vehicle_80',      name:'Seksen Araç Baronu',     desc:'80 farklı araca sahip ol',           icon:'🏎️', type:'vehicles',  val:80        },
    { id:'vehicle_100',     name:'Yüz Araç İmparatoru',    desc:'100 farklı araca sahip ol',          icon:'👑', type:'vehicles',   val:100       },
    // Haftalık Turnuva & Eleme (bracket) modu — kazanılan yarışlar
    { id:'bot_750_wins',    name:'Turnuva Şampiyonu',      desc:'Haftalık turnuvalarda 750 yarış kazan', icon:'🏆', type:'bot_win',  val:750       },
    { id:'bot_2000_wins',   name:'Eleme Efsanesi',         desc:'Eleme bracketlerinde 2000 yarış kazan', icon:'🥇', type:'bot_win',  val:2000      },
    // Yüksek sikke kilometre taşları
    { id:'coins_50m',       name:'Para Hükümdarı',         desc:'50.000.000 madeni para topla',       icon:'👑', type:'total_coins', val:50000000  },
    { id:'coins_100m',      name:'Para Tanrısı',           desc:'100.000.000 madeni para topla',      icon:'🌟', type:'total_coins', val:100000000 },
    // Yüksek altın kilometre taşları
    { id:'gold_10m',        name:'Altın Titanı',           desc:'10.000.000 altına ulaş',             icon:'🏛️', type:'gold',      val:10000000  },
    { id:'gold_25m',        name:'Altın Kolossu',          desc:'25.000.000 altına ulaş',             icon:'🏰', type:'gold',       val:25000000  },
    // Yüksek elmas kilometre taşları
    { id:'diamond_10000',   name:'Kristal Hükümdarı',      desc:'10.000 elmas topla',                 icon:'💠', type:'diamonds',   val:10000     },
    { id:'diamond_25000',   name:'Elmas Evreni',           desc:'25.000 elmas topla',                 icon:'💎', type:'diamonds',   val:25000     },
    // Yüksek mesafe kilometre taşları
    { id:'dist_100m',       name:'Gezegen Gezgini',        desc:'100.000 kilometre yol kat et',       icon:'🪐', type:'distance',   val:100000000 },
    { id:'dist_250m',       name:'Evren Ötesi Yolcu',      desc:'250.000 kilometre yol kat et',       icon:'🌌', type:'distance',   val:250000000 },
    // Yüksek sürüş kilometre taşları
    { id:'play_25000',      name:'Yirmi Beş Bin Sürüş',    desc:'25.000 sürüş oyna',                  icon:'🎗️', type:'run_count',  val:25000     },
    { id:'play_50000',      name:'Sonsuz Pist Efsanesi',   desc:'50.000 sürüş oyna',                  icon:'♾️', type:'run_count',  val:50000     },
    // Yüksek takla kilometre taşı
    { id:'flip_100000',     name:'Ebedi Girdap',           desc:'Toplam 100.000 takla at',            icon:'🌀', type:'total_flip', val:100000    },
    // --- Ninth wave: Mezarlık haritası, ileri araç kadrosu & yüksek kilometre taşları (appended) ---
    // Mezarlık (graveyard) haritası — mesafe hedefleri
    { id:'graveyard_500',   name:'Mezar Bekçisi',          desc:'Mezarlık haritasında 500m ilerle',   icon:'🪦', type:'map_dist',   val:500,   map:'graveyard'  },
    { id:'graveyard_2k',    name:'Hayalet Sürücü',         desc:'Mezarlık haritasında 2000m ilerle',  icon:'👻', type:'map_dist',   val:2000,  map:'graveyard'  },
    { id:'graveyard_5k',    name:'Gece Yarısı Kaşifi',     desc:'Mezarlık haritasında 5000m ilerle',  icon:'🌑', type:'map_dist',   val:5000,  map:'graveyard'  },
    { id:'graveyard_10k',   name:'Ruhlar Diyarı Efendisi', desc:'Mezarlık haritasında 10.000m ilerle', icon:'💀', type:'map_dist',  val:10000, map:'graveyard'  },
    { id:'graveyard_20k',   name:'Mezarlık İmparatoru',    desc:'Mezarlık haritasında 20.000m ilerle', icon:'⚰️', type:'map_dist',  val:20000, map:'graveyard'  },
    // İleri araç kadrosu — koleksiyon ustalığı (kadro ~99)
    { id:'vehicle_75',      name:'Yetmiş Beş Araç Ustası', desc:'75 farklı araca sahip ol',           icon:'🚙', type:'vehicles',   val:75        },
    { id:'vehicle_90',      name:'Doksan Araç Sultanı',    desc:'90 farklı araca sahip ol',           icon:'🏁', type:'vehicles',   val:90        },
    { id:'vehicle_99',      name:'Neredeyse Tam Kadro',    desc:'99 farklı araca sahip ol',           icon:'🏆', type:'vehicles',   val:99        },
    // Yüksek hız & havada kalış kilometre taşları
    { id:'speed_1200',      name:'Aşkın Sürat Kâhini',     desc:'1200 km/s hıza ulaş',                icon:'🌠', type:'speed',      val:1200      },
    { id:'airtime_900',     name:'On Beş Dakika Süzülüş',  desc:'900 saniye havada kal',              icon:'🌌', type:'airtime',    val:900       },
    // İleri kombo tiyeri
    { id:'combo_25',        name:'Kombo Efsanesi',         desc:'Aynı anda 25 hareket zincirle',      icon:'💥', type:'combo',      val:25        },
    // Yüksek sürüş, altın & elmas kilometre taşları
    { id:'play_75000',      name:'Yetmiş Beş Bin Sürüş',   desc:'75.000 sürüş oyna',                  icon:'🎗️', type:'run_count',  val:75000     },
    { id:'gold_50m',        name:'Altın Kâinatı',          desc:'50.000.000 altına ulaş',             icon:'👑', type:'gold',       val:50000000  },
    { id:'diamond_50000',   name:'Elmas Galaksisi',        desc:'50.000 elmas topla',                 icon:'💎', type:'diamonds',   val:50000     },
    // En üst araç kadrosu — koleksiyon zirvesi (kadro ~103)
    { id:'vehicle_101',     name:'Yüz Bir Araç Fatihi',    desc:'101 farklı araca sahip ol',          icon:'🚗', type:'vehicles',   val:101       },
    { id:'vehicle_102',     name:'Yüz İki Araç Hükümdarı', desc:'102 farklı araca sahip ol',          icon:'🏎️', type:'vehicles',  val:102       },
    { id:'vehicle_103',     name:'Tam Kadro Efsanesi',     desc:'103 farklı araca sahip ol',          icon:'👑', type:'vehicles',   val:103       },
    // Yeni harita mesafe tiyerleri — Dağlar, Kutup, Yayla
    { id:'mountains_2k',    name:'Yamaç Yürüyüşçüsü',       desc:'Dağlar haritasında 2000m ilerle',    icon:'⛰️', type:'map_dist',  val:2000,  map:'mountains' },
    { id:'mountains_5k',    name:'Zirve Fatihi',           desc:'Dağlar haritasında 5000m ilerle',    icon:'🏔️', type:'map_dist',  val:5000,  map:'mountains' },
    { id:'arctic_2k',       name:'Buzul Gezgini',          desc:'Kutup haritasında 2000m ilerle',     icon:'🧊', type:'map_dist',   val:2000,  map:'arctic'    },
    { id:'arctic_5k',       name:'Kutup Kâşifi',           desc:'Kutup haritasında 5000m ilerle',     icon:'🐧', type:'map_dist',   val:5000,  map:'arctic'    },
    { id:'highland_2k',     name:'Yayla Yolcusu',          desc:'Yayla haritasında 2000m ilerle',     icon:'🏔️', type:'map_dist',  val:2000,  map:'highland'  },
    { id:'highland_5k',     name:'Yüksek Ova Efendisi',    desc:'Yayla haritasında 5000m ilerle',     icon:'🦅', type:'map_dist',   val:5000,  map:'highland'  },
    // En üst hız, havada kalış & sürüş kilometre taşları
    { id:'speed_1500',      name:'Bin Beş Yüz Sürat Efsanesi', desc:'1500 km/s hıza ulaş',            icon:'🌠', type:'speed',      val:1500      },
    { id:'airtime_1200',    name:'Yirmi Dakika Süzülüş',   desc:'1200 saniye havada kal',             icon:'🌌', type:'airtime',    val:1200      },
    { id:'play_100000',     name:'Yüz Bin Sürüş Efsanesi', desc:'100.000 sürüş oyna',                 icon:'♾️', type:'run_count',  val:100000    },
    // --- Tenth wave: Karnaval haritası (teslimat temalı), ileri araç kadrosu & yüksek kilometre taşları (appended) ---
    // Karnaval (carnival) haritası — teslimat temalı mesafe hedefleri
    { id:'carnival_1k',     name:'Karnaval Teslimatçısı',  desc:'Karnaval haritasında 1000m ilerle',  icon:'🎡', type:'map_dist',   val:1000,  map:'carnival'  },
    { id:'carnival_3k',     name:'Atlıkarınca Yolcusu',    desc:'Karnaval haritasında 3000m ilerle',  icon:'🎠', type:'map_dist',   val:3000,  map:'carnival'  },
    { id:'carnival_5k',     name:'Şeker Pamuğu Kuryesi',   desc:'Karnaval haritasında 5000m ilerle',  icon:'🍭', type:'map_dist',   val:5000,  map:'carnival'  },
    { id:'carnival_10k',    name:'Panayır Ustası',         desc:'Karnaval haritasında 10.000m ilerle', icon:'🎪', type:'map_dist',  val:10000, map:'carnival'  },
    { id:'carnival_20k',    name:'Karnaval İmparatoru',    desc:'Karnaval haritasında 20.000m ilerle', icon:'🎆', type:'map_dist',  val:20000, map:'carnival'  },
    // İleri araç kadrosu — koleksiyon zirvesi (kadro ~107)
    { id:'vehicle_105',     name:'Yüz Beş Araç Hükümdarı', desc:'105 farklı araca sahip ol',          icon:'🚚', type:'vehicles',   val:105       },
    { id:'vehicle_107',     name:'Eksiksiz Kadro Efsanesi', desc:'107 farklı araca sahip ol',         icon:'👑', type:'vehicles',   val:107       },
    // Yüksek sikke kilometre taşları
    { id:'coins_150k',      name:'Sikke Zanaatkârı',       desc:'150.000 madeni para topla',          icon:'💰', type:'total_coins', val:150000   },
    { id:'coins_75m',       name:'Para Kâinatı',           desc:'75.000.000 madeni para topla',       icon:'🌟', type:'total_coins', val:75000000 },
    // Yüksek takla, havada kalış & sürüş kilometre taşları
    { id:'flip_15000',      name:'On Beş Bin Takla Bilgesi', desc:'Toplam 15.000 takla at',           icon:'🌀', type:'total_flip', val:15000     },
    { id:'airtime_1800',    name:'Otuz Dakika Süzülüş',    desc:'1800 saniye havada kal',             icon:'🌌', type:'airtime',    val:1800      },
    { id:'play_150000',     name:'Yüz Elli Bin Sürüş Efsanesi', desc:'150.000 sürüş oyna',            icon:'♾️', type:'run_count',  val:150000    },
    // --- Eleventh wave: yeni harita mesafe tiyerleri, ileri araç kadrosu & en yüksek kilometre taşları (appended) ---
    // Otoyol (highway) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'otoyol_2k',       name:'Asfalt Sürücüsü',        desc:'Otoyol haritasında 2000m ilerle',    icon:'🛣️', type:'map_dist',  val:2000,  map:'otoyol'    },
    { id:'otoyol_5k',       name:'Otoban Yarışçısı',       desc:'Otoyol haritasında 5000m ilerle',    icon:'🚗', type:'map_dist',   val:5000,  map:'otoyol'    },
    // Hot Yol (hotwheels) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'hotwheels_2k',    name:'Loop Çaylağı',           desc:'Hot Yol haritasında 2000m ilerle',   icon:'🏎️', type:'map_dist',  val:2000,  map:'hotwheels' },
    { id:'hotwheels_5k',    name:'Turbo Şampiyonu',        desc:'Hot Yol haritasında 5000m ilerle',   icon:'🔥', type:'map_dist',   val:5000,  map:'hotwheels' },
    // Bataklık (swamp) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'swamp_1k',        name:'Sazlık Yürüyüşçüsü',     desc:'Bataklık haritasında 1000m ilerle',  icon:'🐸', type:'map_dist',   val:1000,  map:'swamp'     },
    { id:'swamp_3k',        name:'Çamur Kaşifi',           desc:'Bataklık haritasında 3000m ilerle',  icon:'🐊', type:'map_dist',   val:3000,  map:'swamp'     },
    // İleri araç kadrosu — koleksiyon zirvesi (kadro ~111)
    { id:'vehicle_109',     name:'Yüz Dokuz Araç Sultanı', desc:'109 farklı araca sahip ol',          icon:'🚗', type:'vehicles',   val:109       },
    { id:'vehicle_111',     name:'Tam Kadro İmparatoru',   desc:'111 farklı araca sahip ol',          icon:'👑', type:'vehicles',   val:111       },
    // En yüksek ekonomi & ilerleme kilometre taşları
    { id:'gold_100m',       name:'Altın Evreni',           desc:'100.000.000 altına ulaş',            icon:'🌌', type:'gold',       val:100000000 },
    { id:'diamond_100000',  name:'Elmas Kâinatı',          desc:'100.000 elmas topla',                icon:'💠', type:'diamonds',   val:100000    },
    { id:'coins_150m',      name:'Para Kozmosu',           desc:'150.000.000 madeni para topla',      icon:'🌟', type:'total_coins', val:150000000 },
    { id:'play_200000',     name:'İki Yüz Bin Sürüş Efsanesi', desc:'200.000 sürüş oyna',             icon:'♾️', type:'run_count',  val:200000    },
    // --- Twelfth wave: Yel Değirmeni haritası, ek harita tiyerleri & yüksek kilometre taşları (appended) ---
    // Yel Değirmeni (windmill) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'windmill_2k',     name:'Değirmen Yolcusu',       desc:'Yel Değirmeni haritasında 2000m ilerle',  icon:'🌾', type:'map_dist',   val:2000,  map:'windmill'  },
    { id:'windmill_5k',     name:'Rüzgâr Değirmencisi',    desc:'Yel Değirmeni haritasında 5000m ilerle',  icon:'🍃', type:'map_dist',   val:5000,  map:'windmill'  },
    { id:'windmill_10k',    name:'Yel Değirmeni Efendisi', desc:'Yel Değirmeni haritasında 10.000m ilerle', icon:'💨', type:'map_dist',  val:10000, map:'windmill'  },
    // Sonbahar (autumn) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'autumn_2k',       name:'Yaprak Döküm Kaşifi',    desc:'Sonbahar haritasında 2000m ilerle',   icon:'🍂', type:'map_dist',   val:2000,  map:'autumn'    },
    { id:'autumn_5k',       name:'Sonbahar Efendisi',      desc:'Sonbahar haritasında 5000m ilerle',   icon:'🍁', type:'map_dist',   val:5000,  map:'autumn'    },
    // Buzul (glacier) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'glacier_2k',      name:'Buzul Yürüyüşçüsü',      desc:'Buzul haritasında 2000m ilerle',      icon:'🧊', type:'map_dist',   val:2000,  map:'glacier'   },
    { id:'glacier_5k',      name:'Buzul Fatihi',           desc:'Buzul haritasında 5000m ilerle',      icon:'🏔️', type:'map_dist',  val:5000,  map:'glacier'   },
    // Şekerdiyarı (candy) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'candy_2k',        name:'Şeker Yolcusu',          desc:'Şeker haritasında 2000m ilerle',      icon:'🍬', type:'map_dist',   val:2000,  map:'candy'     },
    { id:'candy_5k',        name:'Şekerdiyarı Efendisi',   desc:'Şeker haritasında 5000m ilerle',      icon:'🍭', type:'map_dist',   val:5000,  map:'candy'     },
    // İleri araç kadrosu — koleksiyon zirvesi (kadro ~115)
    { id:'vehicle_113',     name:'Yüz On Üç Araç Hükümdarı', desc:'113 farklı araca sahip ol',        icon:'🚗', type:'vehicles',   val:113       },
    { id:'vehicle_115',     name:'Efsanevi Kadro Komutanı', desc:'115 farklı araca sahip ol',         icon:'👑', type:'vehicles',   val:115       },
    // En üst hız, havada kalış, kombo & sürüş kilometre taşları
    { id:'speed_2000',      name:'İki Bin Sürat Kâhini',   desc:'2000 km/s hıza ulaş',                 icon:'🌠', type:'speed',      val:2000      },
    { id:'airtime_2400',    name:'Kırk Dakika Süzülüş',    desc:'2400 saniye havada kal',              icon:'🌌', type:'airtime',    val:2400      },
    { id:'combo_30',        name:'Kombo Kıyameti',         desc:'Aynı anda 30 hareket zincirle',       icon:'💥', type:'combo',      val:30        },
    { id:'play_250000',     name:'İki Yüz Elli Bin Sürüş Efsanesi', desc:'250.000 sürüş oyna',         icon:'♾️', type:'run_count',  val:250000    },
    // --- Thirteenth wave: kalan gerçek haritalar, ileri araç kadrosu & en yüksek kilometre taşları (appended) ---
    // Gök Adası (skyland) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'skyland_2k',      name:'Gökyüzü Adası Kaşifi',   desc:'Gök Adası haritasında 2000m ilerle',  icon:'☁️', type:'map_dist',   val:2000,  map:'skyland'   },
    { id:'skyland_5k',      name:'Gökada Efendisi',         desc:'Gök Adası haritasında 5000m ilerle',  icon:'🪂', type:'map_dist',   val:5000,  map:'skyland'   },
    // Mağara (cave) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'cave_2k',         name:'Mağara Yürüyüşçüsü',      desc:'Mağara haritasında 2000m ilerle',     icon:'🦇', type:'map_dist',   val:2000,  map:'cave'      },
    { id:'cave_5k',         name:'Yeraltı Kâşifi',          desc:'Mağara haritasında 5000m ilerle',     icon:'🔦', type:'map_dist',   val:5000,  map:'cave'      },
    // Savan (savanna) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'savanna_2k',      name:'Savan Yolcusu',           desc:'Savan haritasında 2000m ilerle',      icon:'🦁', type:'map_dist',   val:2000,  map:'savanna'   },
    { id:'savanna_5k',      name:'Bozkır Efendisi',         desc:'Savan haritasında 5000m ilerle',      icon:'🦒', type:'map_dist',   val:5000,  map:'savanna'   },
    // Harabeler (ruins) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'ruins_2k',        name:'Antik Kaşif',             desc:'Harabeler haritasında 2000m ilerle',  icon:'🏺', type:'map_dist',   val:2000,  map:'ruins'     },
    { id:'ruins_5k',        name:'Kayıp Şehir Efendisi',    desc:'Harabeler haritasında 5000m ilerle',  icon:'🏛️', type:'map_dist',  val:5000,  map:'ruins'     },
    // İleri araç kadrosu — koleksiyon zirvesi (kadro ~119)
    { id:'vehicle_117',     name:'Yüz On Yedi Araç Sultanı', desc:'117 farklı araca sahip ol',         icon:'🚗', type:'vehicles',   val:117       },
    { id:'vehicle_119',     name:'Görkemli Kadro Efsanesi', desc:'119 farklı araca sahip ol',          icon:'👑', type:'vehicles',   val:119       },
    // En üst hız, havada kalış, sürüş & kombo kilometre taşları
    { id:'speed_2500',      name:'İki Bin Beş Yüz Sürat Efsanesi', desc:'2500 km/s hıza ulaş',          icon:'🌠', type:'speed',      val:2500      },
    { id:'airtime_3000',    name:'Elli Dakika Süzülüş',     desc:'3000 saniye havada kal',              icon:'🌌', type:'airtime',    val:3000      },
    { id:'play_300000',     name:'Üç Yüz Bin Sürüş Efsanesi', desc:'300.000 sürüş oyna',                icon:'♾️', type:'run_count',  val:300000    },
    { id:'combo_35',        name:'Kombo Kâinatı',           desc:'Aynı anda 35 hareket zincirle',       icon:'💥', type:'combo',      val:35        },
    // --- Fourteenth wave: kalan gerçek haritalar (map_dist yoktu) & araç koleksiyonu zirvesi (appended) ---
    // Lav Nehri (lava_river) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'lava_river_2k',   name:'Lav Nehri Yolcusu',       desc:'Lav Nehri haritasında 2000m ilerle',   icon:'🌋', type:'map_dist',   val:2000,  map:'lava_river'   },
    { id:'lava_river_5k',   name:'Magma Kaptanı',           desc:'Lav Nehri haritasında 5000m ilerle',   icon:'🔥', type:'map_dist',   val:5000,  map:'lava_river'   },
    // Kristal Mağara (crystal_cave) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'crystal_cave_2k', name:'Kristal Kâşifi',          desc:'Kristal Mağara haritasında 2000m ilerle', icon:'💎', type:'map_dist',   val:2000,  map:'crystal_cave' },
    { id:'crystal_cave_5k', name:'Prizma Efendisi',         desc:'Kristal Mağara haritasında 5000m ilerle', icon:'🔮', type:'map_dist',   val:5000,  map:'crystal_cave' },
    // Siber Izgara (cyber_grid) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'cyber_grid_2k',   name:'Veri Sürücüsü',           desc:'Siber Izgara haritasında 2000m ilerle', icon:'🌐', type:'map_dist',   val:2000,  map:'cyber_grid'   },
    { id:'cyber_grid_5k',   name:'Devre Efendisi',          desc:'Siber Izgara haritasında 5000m ilerle', icon:'💾', type:'map_dist',   val:5000,  map:'cyber_grid'   },
    // Mantar Diyarı (mushroom) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'mushroom_2k',     name:'Spor Yolcusu',            desc:'Mantar Diyarı haritasında 2000m ilerle', icon:'🍄', type:'map_dist',   val:2000,  map:'mushroom'     },
    // Fırtına Zirvesi (stormpeak) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'stormpeak_2k',    name:'Şimşek Avcısı',           desc:'Fırtına Zirvesi haritasında 2000m ilerle', icon:'⛈️', type:'map_dist',  val:2000,  map:'stormpeak'    },
    // Dağ Zirvesi (dag) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'dag_2k',          name:'Sarp Tırmanışçı',         desc:'Dağ Zirvesi haritasında 2000m ilerle',  icon:'🗻', type:'map_dist',   val:2000,  map:'dag'          },
    // İnşaat (construction) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'construction_2k', name:'Şantiye Ustası',          desc:'İnşaat haritasında 2000m ilerle',       icon:'🚧', type:'map_dist',   val:2000,  map:'construction' },
    // Kar Fırtınası (blizzard) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'blizzard_2k',     name:'Tipi Yolcusu',            desc:'Kar Fırtınası haritasında 2000m ilerle', icon:'🌨️', type:'map_dist',  val:2000,  map:'blizzard'     },
    // Toksik (toxic) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'toxic_2k',        name:'Radyasyon Kâşifi',        desc:'Toksik haritasında 2000m ilerle',       icon:'🧪', type:'map_dist',   val:2000,  map:'toxic'        },
    // Hız Treni (rollercoaster) haritası — mesafe hedefleri (önceden achievement yoktu)
    { id:'rollercoaster_2k', name:'Vagonet Sürücüsü',       desc:'Hız Treni haritasında 2000m ilerle',    icon:'🎢', type:'map_dist',   val:2000,  map:'rollercoaster' },
    // İleri araç kadrosu — koleksiyon zirvesi (kadro ~123)
    { id:'vehicle_121',     name:'Yüz Yirmi Bir Araç Hükümdarı', desc:'121 farklı araca sahip ol',       icon:'🚗', type:'vehicles',   val:121       },
    { id:'vehicle_123',     name:'Eksiksiz Kadro İmparatoru', desc:'123 farklı araca sahip ol',          icon:'👑', type:'vehicles',   val:123       },
    // --- Fifteenth wave: eksik 5k harita tiyerleri, ileri araç kadrosu (~127) & en yüksek kilometre taşları (appended) ---
    // Sadece 2k tiyeri olan haritalara 5k hedefleri (gerçek map id'leri terrain.js'te doğrulandı)
    { id:'mushroom_5k',     name:'Mantar Diyarı Efendisi',  desc:'Mantar Diyarı haritasında 5000m ilerle', icon:'🍄', type:'map_dist',   val:5000,  map:'mushroom'      },
    { id:'stormpeak_5k',    name:'Fırtına Zirvesi Fatihi',  desc:'Fırtına Zirvesi haritasında 5000m ilerle', icon:'⛈️', type:'map_dist', val:5000,  map:'stormpeak'    },
    { id:'dag_5k',          name:'Dağ Zirvesi Hükümdarı',   desc:'Dağ Zirvesi haritasında 5000m ilerle',   icon:'🗻', type:'map_dist',   val:5000,  map:'dag'          },
    { id:'construction_5k', name:'İnşaat Ustabaşısı',       desc:'İnşaat haritasında 5000m ilerle',        icon:'🚧', type:'map_dist',   val:5000,  map:'construction' },
    { id:'blizzard_5k',     name:'Kar Fırtınası Efendisi',  desc:'Kar Fırtınası haritasında 5000m ilerle', icon:'🌨️', type:'map_dist',  val:5000,  map:'blizzard'     },
    { id:'toxic_5k',        name:'Toksik Diyar Efendisi',   desc:'Toksik haritasında 5000m ilerle',        icon:'🧪', type:'map_dist',   val:5000,  map:'toxic'        },
    { id:'rollercoaster_5k', name:'Hız Treni Şampiyonu',    desc:'Hız Treni haritasında 5000m ilerle',     icon:'🎢', type:'map_dist',   val:5000,  map:'rollercoaster' },
    // İleri araç kadrosu — koleksiyon zirvesi (kadro ~127)
    { id:'vehicle_125',     name:'Yüz Yirmi Beş Araç Efendisi', desc:'125 farklı araca sahip ol',          icon:'🚗', type:'vehicles',   val:125       },
    { id:'vehicle_127',     name:'Muhteşem Kadro İmparatoru', desc:'127 farklı araca sahip ol',            icon:'👑', type:'vehicles',   val:127       },
    // En yüksek hız, havada kalış, kombo & sürüş kilometre taşları
    { id:'speed_3000',      name:'Üç Bin Sürat Efsanesi',   desc:'3000 km/s hıza ulaş',                    icon:'🌠', type:'speed',      val:3000      },
    { id:'airtime_3600',    name:'Bir Saat Süzülüş',        desc:'3600 saniye havada kal',                 icon:'🌌', type:'airtime',    val:3600      },
    { id:'combo_40',        name:'Kombo Sonsuzluğu',        desc:'Aynı anda 40 hareket zincirle',          icon:'💥', type:'combo',      val:40        },
    { id:'play_400000',     name:'Dört Yüz Bin Sürüş Efsanesi', desc:'400.000 sürüş oyna',                 icon:'♾️', type:'run_count',  val:400000    },
    // En yüksek ekonomi kilometre taşları — sikke, altın, elmas
    { id:'coins_200m',      name:'Para Sonsuzluğu',         desc:'200.000.000 madeni para topla',          icon:'🌟', type:'total_coins', val:200000000 },
    { id:'gold_150m',       name:'Altın Sonsuzluğu',        desc:'150.000.000 altına ulaş',                icon:'🌌', type:'gold',       val:150000000 },
    { id:'diamond_250000',  name:'Elmas Sonsuzluğu',        desc:'250.000 elmas topla',                    icon:'💠', type:'diamonds',   val:250000    },
    // --- Sixteenth wave: Bambu haritası (yeni gerçek map_dist), en üst araç kadrosu (~131), eksik 10k harita tiyerleri & en yüksek kilometre taşları (appended) ---
    // Bambu (bamboo) haritası — mesafe hedefleri (terrain.js MAPS registry'de doğrulandı, önceden achievement yoktu)
    { id:'bamboo_2k',       name:'Bambu Yolcusu',           desc:'Bambu haritasında 2000m ilerle',         icon:'🎋', type:'map_dist',   val:2000,  map:'bamboo'    },
    { id:'bamboo_5k',       name:'Bambu Ormanı Kaşifi',     desc:'Bambu haritasında 5000m ilerle',         icon:'🎍', type:'map_dist',   val:5000,  map:'bamboo'    },
    { id:'bamboo_10k',      name:'Bambu Diyarı Efendisi',   desc:'Bambu haritasında 10.000m ilerle',       icon:'🐼', type:'map_dist',   val:10000, map:'bamboo'    },
    // Sadece 2k/5k tiyeri olan gerçek haritalara 10k hedefleri (map id'leri terrain.js MAPS'te doğrulandı)
    { id:'skyland_10k',     name:'Gökada Hükümdarı',        desc:'Gök Adası haritasında 10.000m ilerle',   icon:'☁️', type:'map_dist',  val:10000, map:'skyland'   },
    { id:'cave_10k',        name:'Yeraltı Hükümdarı',       desc:'Mağara haritasında 10.000m ilerle',      icon:'🦇', type:'map_dist',   val:10000, map:'cave'      },
    { id:'savanna_10k',     name:'Bozkır Hükümdarı',        desc:'Savan haritasında 10.000m ilerle',       icon:'🦁', type:'map_dist',   val:10000, map:'savanna'   },
    { id:'lava_river_10k',  name:'Magma Nehri İmparatoru',  desc:'Lav Nehri haritasında 10.000m ilerle',   icon:'🌋', type:'map_dist',   val:10000, map:'lava_river' },
    // En üst araç kadrosu — koleksiyon zirvesi (kadro ~131)
    { id:'vehicle_129',     name:'Yüz Yirmi Dokuz Araç Sultanı', desc:'129 farklı araca sahip ol',         icon:'🚗', type:'vehicles',   val:129       },
    { id:'vehicle_131',     name:'Zirve Kadro İmparatoru',  desc:'131 farklı araca sahip ol',              icon:'👑', type:'vehicles',   val:131       },
    // En yüksek hız, havada kalış, kombo & sürüş kilometre taşları
    { id:'speed_3500',      name:'Üç Bin Beş Yüz Sürat Kâhini', desc:'3500 km/s hıza ulaş',                icon:'🌠', type:'speed',      val:3500      },
    { id:'speed_4000',      name:'Dört Bin Sürat Efsanesi', desc:'4000 km/s hıza ulaş',                    icon:'🚀', type:'speed',      val:4000      },
    { id:'airtime_4200',    name:'Yetmiş Dakika Süzülüş',   desc:'4200 saniye havada kal',                 icon:'🌌', type:'airtime',    val:4200      },
    { id:'combo_45',        name:'Kombo Kozmosu',           desc:'Aynı anda 45 hareket zincirle',          icon:'💥', type:'combo',      val:45        },
    { id:'play_500000',     name:'Beş Yüz Bin Sürüş Efsanesi', desc:'500.000 sürüş oyna',                  icon:'♾️', type:'run_count',  val:500000    },
    // --- Seventeenth wave: sadece 2k/5k tiyeri olan gerçek haritalara 10k hedefleri, en üst araç kadrosu (~135) & en yüksek kilometre taşları (appended) ---
    // Sadece 2k/5k tiyeri olan gerçek haritalara 10k hedefleri (map id'leri terrain.js MAPS registry'de doğrulandı)
    { id:'mountains_10k',   name:'Dağların Hükümdarı',       desc:'Dağlar haritasında 10.000m ilerle',       icon:'🏔️', type:'map_dist',  val:10000, map:'mountains' },
    { id:'arctic_10k',      name:'Kutup Hükümdarı',          desc:'Kutup haritasında 10.000m ilerle',        icon:'🧊', type:'map_dist',   val:10000, map:'arctic'    },
    { id:'highland_10k',    name:'Yayla İmparatoru',         desc:'Yayla haritasında 10.000m ilerle',        icon:'🦅', type:'map_dist',   val:10000, map:'highland'  },
    { id:'otoyol_10k',      name:'Otoban Efsanesi',          desc:'Otoyol haritasında 10.000m ilerle',       icon:'🛣️', type:'map_dist',  val:10000, map:'otoyol'    },
    { id:'hotwheels_10k',   name:'Turbo Loop Efendisi',      desc:'Hot Yol haritasında 10.000m ilerle',      icon:'🔥', type:'map_dist',   val:10000, map:'hotwheels' },
    { id:'autumn_10k',      name:'Sonbahar Hükümdarı',       desc:'Sonbahar haritasında 10.000m ilerle',     icon:'🍁', type:'map_dist',   val:10000, map:'autumn'    },
    // En üst araç kadrosu — koleksiyon zirvesi (kadro ~135)
    { id:'vehicle_133',     name:'Yüz Otuz Üç Araç Sultanı', desc:'133 farklı araca sahip ol',              icon:'🚗', type:'vehicles',   val:133       },
    { id:'vehicle_135',     name:'Muazzam Kadro İmparatoru', desc:'135 farklı araca sahip ol',              icon:'👑', type:'vehicles',   val:135       },
    // En yüksek hız, havada kalış & kombo kilometre taşları
    { id:'speed_4500',      name:'Dört Bin Beş Yüz Sürat Kâhini', desc:'4500 km/s hıza ulaş',               icon:'🌠', type:'speed',      val:4500      },
    { id:'airtime_4800',    name:'Seksen Dakika Süzülüş',    desc:'4800 saniye havada kal',                  icon:'🌌', type:'airtime',    val:4800      },
    { id:'combo_50',        name:'Kombo Efsanevi Zirvesi',   desc:'Aynı anda 50 hareket zincirle',           icon:'💥', type:'combo',      val:50        },
    // En yüksek ekonomi, sürüş & bot kilometre taşları
    { id:'coins_300m',      name:'Para Kozmik Efendisi',     desc:'300.000.000 madeni para topla',           icon:'🌟', type:'total_coins', val:300000000 },
    { id:'gold_200m',       name:'Altın Kozmosu',            desc:'200.000.000 altına ulaş',                 icon:'🌌', type:'gold',       val:200000000 },
    { id:'diamond_500000',  name:'Elmas Kozmosu',            desc:'500.000 elmas topla',                     icon:'💠', type:'diamonds',   val:500000    },
    { id:'play_750000',     name:'Yedi Yüz Elli Bin Sürüş Efsanesi', desc:'750.000 sürüş oyna',             icon:'♾️', type:'run_count',  val:750000    },
    { id:'bot_3000_wins',   name:'Bot Ölümsüzü',             desc:'3000 bot yarışı kazan',                  icon:'🏆', type:'bot_win',    val:3000      },
    // --- Eighteenth wave: kalan gerçek haritaların 10k tiyerleri, en üst araç kadrosu (~139) & en yüksek kilometre taşları (appended) ---
    // Sadece 2k/5k (veya 3k) tiyeri olan kalan gerçek haritalara 10.000m hedefleri (map id'leri terrain.js MAPS registry'de doğrulandı)
    { id:'glacier_10k',     name:'Buzul Hükümdarı',          desc:'Buzul haritasında 10.000m ilerle',        icon:'🧊', type:'map_dist',   val:10000, map:'glacier'      },
    { id:'candy_10k',       name:'Şekerdiyarı Hükümdarı',    desc:'Şeker haritasında 10.000m ilerle',        icon:'🍭', type:'map_dist',   val:10000, map:'candy'        },
    { id:'ruins_10k',       name:'Antik Diyar İmparatoru',   desc:'Harabeler haritasında 10.000m ilerle',    icon:'🏛️', type:'map_dist',  val:10000, map:'ruins'        },
    { id:'crystal_cave_10k', name:'Prizma İmparatoru',       desc:'Kristal Mağara haritasında 10.000m ilerle', icon:'💎', type:'map_dist', val:10000, map:'crystal_cave' },
    { id:'cyber_grid_10k',  name:'Izgara Hükümdarı',         desc:'Siber Izgara haritasında 10.000m ilerle', icon:'🌐', type:'map_dist',   val:10000, map:'cyber_grid'   },
    { id:'swamp_10k',       name:'Bataklık Efendisi',        desc:'Bataklık haritasında 10.000m ilerle',     icon:'🐊', type:'map_dist',   val:10000, map:'swamp'        },
    // En üst araç kadrosu — koleksiyon zirvesi (kadro ~139)
    { id:'vehicle_137',     name:'Yüz Otuz Yedi Araç Sultanı', desc:'137 farklı araca sahip ol',            icon:'🚗', type:'vehicles',   val:137       },
    { id:'vehicle_139',     name:'Muhteşem Kadro Efsanesi',  desc:'139 farklı araca sahip ol',               icon:'👑', type:'vehicles',   val:139       },
    // En yüksek hız, havada kalış & kombo kilometre taşları
    { id:'speed_5000',      name:'Beş Bin Sürat Efsanesi',   desc:'5000 km/s hıza ulaş',                     icon:'🌠', type:'speed',      val:5000      },
    { id:'airtime_5400',    name:'Doksan Dakika Süzülüş',    desc:'5400 saniye havada kal',                  icon:'🌌', type:'airtime',    val:5400      },
    { id:'combo_60',        name:'Kombo Efsanevi Kâinatı',   desc:'Aynı anda 60 hareket zincirle',           icon:'💥', type:'combo',      val:60        },
    // En yüksek ekonomi, sürüş & elmas kilometre taşları
    { id:'coins_500m',      name:'Para Kâinat Efendisi',     desc:'500.000.000 madeni para topla',           icon:'🌟', type:'total_coins', val:500000000 },
    { id:'gold_250m',       name:'Altın Kozmik Efendisi',    desc:'250.000.000 altına ulaş',                 icon:'👑', type:'gold',       val:250000000 },
    { id:'diamond_1m',      name:'Elmas Kozmosu Efendisi',   desc:'1.000.000 elmas topla',                   icon:'💠', type:'diamonds',   val:1000000   },
    { id:'play_1000000',    name:'Bir Milyon Sürüş Efsanesi', desc:'1.000.000 sürüş oyna',                   icon:'♾️', type:'run_count',  val:1000000   },
    // --- Nineteenth wave: kalan haritaların 10k tiyerleri, popüler haritalara 20k, en üst araç kadrosu (~143) & en yüksek kilometre taşları (appended) ---
    // Sadece 2k/5k tiyeri kalan gerçek haritalara 10.000m hedefleri (map id'leri terrain.js MAPS registry'de doğrulandı)
    { id:'mushroom_10k',    name:'Mantar Diyarı Hükümdarı',  desc:'Mantar Diyarı haritasında 10.000m ilerle', icon:'🍄', type:'map_dist',   val:10000, map:'mushroom'      },
    { id:'stormpeak_10k',   name:'Fırtına Zirvesi Efendisi', desc:'Fırtına Zirvesi haritasında 10.000m ilerle', icon:'⛈️', type:'map_dist', val:10000, map:'stormpeak'    },
    { id:'dag_10k',         name:'Dağ Zirvesi İmparatoru',   desc:'Dağ Zirvesi haritasında 10.000m ilerle',   icon:'🗻', type:'map_dist',   val:10000, map:'dag'          },
    { id:'construction_10k', name:'İnşaat İmparatoru',       desc:'İnşaat haritasında 10.000m ilerle',        icon:'🚧', type:'map_dist',   val:10000, map:'construction' },
    { id:'blizzard_10k',    name:'Kar Fırtınası Hükümdarı',  desc:'Kar Fırtınası haritasında 10.000m ilerle', icon:'🌨️', type:'map_dist',  val:10000, map:'blizzard'     },
    { id:'toxic_10k',       name:'Toksik Diyar İmparatoru',  desc:'Toksik haritasında 10.000m ilerle',        icon:'🧪', type:'map_dist',   val:10000, map:'toxic'        },
    { id:'rollercoaster_10k', name:'Hız Treni İmparatoru',   desc:'Hız Treni haritasında 10.000m ilerle',     icon:'🎢', type:'map_dist',   val:10000, map:'rollercoaster' },
    // Popüler eski haritalara 20.000m hedefleri (yalnızca 15k tiyeri vardı)
    { id:'underwater_20k',  name:'Derin Okyanus İmparatoru', desc:'Su Altı haritasında 20.000m ilerle',       icon:'🐳', type:'map_dist',   val:20000, map:'underwater'   },
    { id:'canyon_20k',      name:'Kanyon İmparatoru',        desc:'Kanyon haritasında 20.000m ilerle',        icon:'🏞️', type:'map_dist',  val:20000, map:'canyon'       },
    { id:'wasteland_20k',   name:'Çorak Diyar İmparatoru',   desc:'Çorak Toprak haritasında 20.000m ilerle',  icon:'☣️', type:'map_dist',  val:20000, map:'wasteland'    },
    // En üst araç kadrosu — koleksiyon zirvesi (kadro ~143)
    { id:'vehicle_141',     name:'Yüz Kırk Bir Araç Sultanı', desc:'141 farklı araca sahip ol',               icon:'🚗', type:'vehicles',   val:141       },
    { id:'vehicle_143',     name:'Tam Kadro Zirvesi İmparatoru', desc:'143 farklı araca sahip ol',            icon:'👑', type:'vehicles',   val:143       },
    // En yüksek hız, havada kalış, kombo & sürüş kilometre taşları
    { id:'speed_5500',      name:'Beş Bin Beş Yüz Sürat Kâhini', desc:'5500 km/s hıza ulaş',                  icon:'🌠', type:'speed',      val:5500      },
    { id:'airtime_6000',    name:'Yüz Dakika Süzülüş',       desc:'6000 saniye havada kal',                   icon:'🌌', type:'airtime',    val:6000      },
    { id:'combo_70',        name:'Kombo Efsanevi Sonsuzluğu', desc:'Aynı anda 70 hareket zincirle',           icon:'💥', type:'combo',      val:70        },
    { id:'play_1500000',    name:'Bir Buçuk Milyon Sürüş Efsanesi', desc:'1.500.000 sürüş oyna',              icon:'♾️', type:'run_count',  val:1500000   },
    // --- Twentieth wave: 20k tiyeri olmayan gerçek haritalara 20.000m hedefleri, en üst araç kadrosu (~147) & en yüksek kilometre taşları (appended) ---
    // Sadece 10k tiyeri olan gerçek haritalara 20.000m hedefleri (map id'leri ui.js harita kaydında doğrulandı)
    { id:'mountains_20k',   name:'Dağların İmparatoru',      desc:'Dağlar haritasında 20.000m ilerle',       icon:'🏔️', type:'map_dist',  val:20000, map:'mountains' },
    { id:'arctic_20k',      name:'Kutup Kâinatı Efendisi',   desc:'Kutup haritasında 20.000m ilerle',        icon:'🧊', type:'map_dist',   val:20000, map:'arctic'    },
    { id:'otoyol_20k',      name:'Otoban İmparatoru',        desc:'Otoyol haritasında 20.000m ilerle',       icon:'🛣️', type:'map_dist',  val:20000, map:'otoyol'    },
    // En üst araç kadrosu — koleksiyon zirvesi (kadro ~147)
    { id:'vehicle_145',     name:'Yüz Kırk Beş Araç Sultanı', desc:'145 farklı araca sahip ol',              icon:'🚗', type:'vehicles',   val:145       },
    { id:'vehicle_147',     name:'Efsanevi Kadro Zirvesi İmparatoru', desc:'147 farklı araca sahip ol',       icon:'👑', type:'vehicles',   val:147       },
    // En yüksek hız, havada kalış & kombo kilometre taşları
    { id:'speed_6000',      name:'Altı Bin Sürat Efsanesi',  desc:'6000 km/s hıza ulaş',                     icon:'🌠', type:'speed',      val:6000      },
    { id:'airtime_7200',    name:'Yüz Yirmi Dakika Süzülüş', desc:'7200 saniye havada kal',                  icon:'🌌', type:'airtime',    val:7200      },
    { id:'combo_80',        name:'Kombo Ebedi Kozmosu',      desc:'Aynı anda 80 hareket zincirle',           icon:'💥', type:'combo',      val:80        },
    // En yüksek ekonomi kilometre taşları — sikke, altın, elmas
    { id:'coins_750m',      name:'Para Kâinat Hükümdarı',    desc:'750.000.000 madeni para topla',           icon:'🌟', type:'total_coins', val:750000000 },
    { id:'gold_500m',       name:'Altın Kâinat Efendisi',    desc:'500.000.000 altına ulaş',                 icon:'👑', type:'gold',       val:500000000 },
    { id:'diamond_2m',      name:'Elmas Kâinat Efendisi',    desc:'2.000.000 elmas topla',                   icon:'💠', type:'diamonds',   val:2000000   },
    // En yüksek sürüş, bot yarışı, yakıt & takla atmadan sürüş kilometre taşları
    { id:'play_2000000',    name:'İki Milyon Sürüş Efsanesi', desc:'2.000.000 sürüş oyna',                   icon:'♾️', type:'run_count',  val:2000000   },
    { id:'bot_5000_wins',   name:'Bot Kâinat Efendisi',      desc:'5000 bot yarışı kazan',                   icon:'🏆', type:'bot_win',    val:5000      },
    { id:'fuel_save_150k',  name:'Ebedi Yakıt Rezervi',      desc:'150.000m yakıtın bitmeden git',           icon:'♾️', type:'fuel_save',  val:150000    },
    { id:'no_flip_1m',      name:'Kâinat Denge Efendisi',    desc:'1.000.000m takla atmadan git',            icon:'👑', type:'no_flip',    val:1000000   },

    // ═══════════════════════════════════════════════════════════════════════
    //  KLAN BAŞARIMLARI (15) — "Klan sistemi.txt" §11.2  ·  3 Ağu 2026, Ajan H
    // ═══════════════════════════════════════════════════════════════════════
    // 🔴 ÖDÜL YALNIZ KP. Tasarım tablosu elmas + altın veriyor; sözleşme §6
    //    ("Klan sistemi ASLA altın/elmas vermez") gereği `Klan.kpCevir()` ile
    //    tek KP değerine çevrildi:  KP = round(altın/100 + elmas×4)
    //    Örnek: Klan Duayeni 2.000 elmas + 50.000 altın → 8.500 KP (§6 tablosu).
    //    ⚠ Bu yüzden burada `reward:` alanı YOK — `_notifyUnlock()` `reward`
    //      görürse SaveData.addGold/addDiamonds çağırırdı. `kpHam` alanını
    //      `KlanBasarim` (dosya sonu) okur ve `Klan.kpEkle` ile öder.
    //
    // 🔴 `type` HER BAŞARIMDA BENZERSİZ ve `id` ile AYNI. Gerekçe (ölçüldü):
    //    hızlı indeks (`_grup[tip]`) yalnız (a) çağrının kendi tipini,
    //    (b) `_DURUM_TIPLERI`'ni, (c) `rank`/`manual`'ı tarar. Ortak bir
    //    `type:'klan'` `switch`'e yeni bir `case` eklemeyi gerektirirdi;
    //    `type:'manual'` ise 15 üyeyi HER `check()` çağrısında taranan gruba
    //    sokardı (kare başına +45 gezinme). Benzersiz tip = SICAK YOLDA SIFIR
    //    maliyet: grup yalnız `Achievements.check('klan_kurucu')` gibi kendi
    //    olayı tetiklendiğinde geziliyor. `default:` dalı (`ach.type === type`)
    //    zaten doğru davranıyor → MOTOR HİÇ DEĞİŞMEDİ.
    { id:'klan_kurucu',      name:'Klan Kurucusu',      desc:'Bir klan kur',                              icon:'🏰', type:'klan_kurucu',      kpHam:210,  kaynakAltin:1000,  kaynakElmas:50,   zorluk:'Kolay'    },
    { id:'klan_savascisi',   name:'Klan Savaşçısı',     desc:'10 etkinlikte yer al',                      icon:'⚔️', type:'klan_savascisi',   kpHam:420,  kaynakAltin:2000,  kaynakElmas:100,  zorluk:'Orta'     },
    { id:'klan_lideri',      name:'Klan Lideri',        desc:'Klanını 10. seviyeye getir',                icon:'👑', type:'klan_lideri',      kpHam:850,  kaynakAltin:5000,  kaynakElmas:200,  zorluk:'Orta'     },
    { id:'klan_efsanevi',    name:'Efsanevi Klan',      desc:'Klanını Efsane ligine taşı',                icon:'🌟', type:'klan_efsanevi',    kpHam:2100, kaynakAltin:10000, kaynakElmas:500,  zorluk:'Çok Zor'  },
    { id:'klan_toplayici',   name:'Klan Toplayıcısı',   desc:'20 üye topla',                              icon:'🤝', type:'klan_toplayici',   kpHam:630,  kaynakAltin:3000,  kaynakElmas:150,  zorluk:'Kolay'    },
    { id:'klan_savas_galibi',name:'Klan Savaşı Galibi', desc:'10 klan savaşı kazan',                      icon:'🛡️', type:'klan_savas_galibi',kpHam:1275, kaynakAltin:7500,  kaynakElmas:300,  zorluk:'Zor'      },
    { id:'klan_bagisci',     name:'Klan Bağışçısı',     desc:'100 bağış yap',                             icon:'🎁', type:'klan_bagisci',     kpHam:315,  kaynakAltin:1500,  kaynakElmas:75,   zorluk:'Kolay'    },
    { id:'klan_ustasi',      name:'Klan Ustası',        desc:'50.000 Klan XP topla',                      icon:'📈', type:'klan_ustasi',      kpHam:1060, kaynakAltin:6000,  kaynakElmas:250,  zorluk:'Zor'      },
    { id:'klan_sadik',       name:'Klan Sadık',         desc:'30 gün üst üste klanında kal',              icon:'🗓️', type:'klan_sadik',       kpHam:420,  kaynakAltin:2000,  kaynakElmas:100,  zorluk:'Kolay'    },
    { id:'klan_rekortmen',   name:'Klan Rekortmeni',    desc:'Bir etkinlikte 100.000 puan topla',         icon:'🏅', type:'klan_rekortmen',   kpHam:1680, kaynakAltin:8000,  kaynakElmas:400,  zorluk:'Çok Zor'  },
    { id:'klan_diplomat',    name:'Klan Diplomatı',     desc:'5 farklı klanla dostluk kur',               icon:'🕊️', type:'klan_diplomat',    kpHam:210,  kaynakAltin:1000,  kaynakElmas:50,   zorluk:'Orta'     },
    { id:'klan_egitmen',     name:'Klan Eğitmeni',      desc:'10 yeni üyeye mentorluk yap',               icon:'🎓', type:'klan_egitmen',     kpHam:630,  kaynakAltin:3000,  kaynakElmas:150,  zorluk:'Orta'     },
    { id:'klan_fatihi',      name:'Klan Fatihi',        desc:'Tüm liglerde 1. ol',                        icon:'🗺️', type:'klan_fatihi',      kpHam:4200, kaynakAltin:20000, kaynakElmas:1000, zorluk:'Efsane'   },
    { id:'klan_koleksiyon',  name:'Klan Koleksiyoncusu',desc:'Tüm klan kutularını aç',                    icon:'📦', type:'klan_koleksiyon',  kpHam:2100, kaynakAltin:10000, kaynakElmas:500,  zorluk:'Zor'      },
    { id:'klan_duayeni',     name:'Klan Duayeni',       desc:'Klan seviyesi 50\'ye ulaş',                 icon:'💎', type:'klan_duayeni',     kpHam:8500, kaynakAltin:50000, kaynakElmas:2000, zorluk:'İmkansız' },
  ],

  pendingToast: [],
  _runFlips: 0,
  _runAirtime: 0,
  _runNoFlip: 0,
  _runMaxDist: 0,

  resetRun() {
    this._runFlips = 0;
    this._runAirtime = 0;
    this._runNoFlip = 0;
    this._runMaxDist = 0;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // HIZLI İNDEKS (29 Tmz) — kare başına 1.804 → ~0 kontrol
  // ═══════════════════════════════════════════════════════════════════════
  //
  //   🔴 ÖLÇÜLEN SORUN: `check()` her çağrıldığında **591 başarımın TAMAMINI**
  //   geziyor ve her biri için `SaveData.hasAchievement()` çağırıyordu.
  //   `checkDistance()` her karede 3 kez `check()` çağırdığı için:
  //       300 karede 541.356 hasAchievement çağrısı = kare başı 1.804
  //   Mantık ucuz olsa da bu kadar çağrı + geçici nesne, çöp toplayıcıyı
  //   tetikliyordu → 10 saniyede +3,8 MB, p99 kare 203 ms, en kötü 2.050 ms.
  //
  //   ▶ İKİ KATMANLI İNDEKS:
  //     1. `_grup[tip].uyeler` — yalnız AÇILMAMIŞ başarımlar (açılan düşer).
  //     2. `_grup[tip].min`    — o tipteki en düşük eşik. Oyuncunun değeri
  //                              bu eşiğin altındaysa GRUP HİÇ GEZİLMEZ.
  //
  //   ⚠ DAVRANIŞ BİREBİR KORUNDU: aşağıdaki `switch` hiç değişmedi, yalnız
  //     hangi başarımların ona SOKULDUĞU daraltıldı.
  //   ⚠ `SaveData.setAchievement` başka dosyalardan da çağrılabiliyor
  //     (`economy.js` rank_bronze…). Bu yüzden gezerken `hasAchievement`
  //     kontrolü KORUNDU — ama artık 591 değil, birkaç aday üzerinde.
  //   ⚠ Kayıt sıfırlanınca `Achievements._grup = null` yapılmalı (lazy kurulur).

  // Değere bağlı ("durum") tipler: `type` ne olursa olsun her çağrıda
  // kontrol edilmeleri gerekir — ama eşik atlamasıyla çoğu zaman atlanırlar.
  _DURUM_TIPLERI: ['distance', 'total_flip', 'total_coins', 'gold',
                   'diamonds', 'vehicles', 'bot_win', 'run_count'],

  _adayKur() {
    this._grup = {};
    for (const a of this.list) {
      if (!a || !a.type) continue;
      if (typeof SaveData !== 'undefined' && SaveData.hasAchievement(a.id)) continue;
      const g = this._grup[a.type] || (this._grup[a.type] = { uyeler: [], min: Infinity });
      g.uyeler.push(a);
      if (typeof a.val === 'number' && a.val < g.min) g.min = a.val;
    }
  },

  // Açılan başarımı gruptan düşür ve eşiği yeniden hesapla.
  _dus(ach) {
    if (!this._grup) return;
    const g = this._grup[ach.type];
    if (!g) return;
    const i = g.uyeler.indexOf(ach);
    if (i < 0) return;
    g.uyeler.splice(i, 1);
    g.min = Infinity;
    for (const a of g.uyeler) {
      if (typeof a.val === 'number' && a.val < g.min) g.min = a.val;
    }
  },

  check(type, data) {
    data = data || {};
    const gold = SaveData.get('gold');
    const totalCoins = SaveData.get('totalCoins') || 0;
    const owned = SaveData.get('ownedVehicles') || [];
    const totalFlips = SaveData.get('totalFlips') || 0;
    const botWins = SaveData.get('botWins') || 0;
    const runCount = SaveData.get('runCount') || 0;
    const maxDist = SaveData.get('maxDistance') || 0;
    const diamonds = SaveData.get('diamonds') || 0;
    const rank = SaveData.getRank(maxDist);

    if (!this._grup) this._adayKur();

    // Oyuncunun her "durum" tipindeki güncel değeri — eşik atlaması için.
    const _deger = {
      distance: maxDist, total_flip: totalFlips, total_coins: totalCoins,
      gold: gold, diamonds: diamonds, vehicles: owned.length,
      bot_win: botWins, run_count: runCount
    };

    // Taranacak tipler: (a) çağrının kendi tipi, (b) eşiği aşılmış durum
    // tipleri, (c) `rank` ve `manual` (sayısal eşiği yok, ikisi de çok küçük).
    const _tarama = [];
    if (this._grup[type] && this._grup[type].uyeler.length) _tarama.push(type);
    for (const t of this._DURUM_TIPLERI) {
      if (t === type) continue;
      const g = this._grup[t];
      if (!g || !g.uyeler.length) continue;
      if (_deger[t] < g.min) continue;          // 🔴 eşik altında → GRUBU ATLA
      _tarama.push(t);
    }
    for (const t of ['rank', 'manual']) {
      if (t === type) continue;
      if (this._grup[t] && this._grup[t].uyeler.length) _tarama.push(t);
    }
    if (!_tarama.length) return;

    const _acilan = [];
    for (const _t of _tarama) {
    const _g = this._grup[_t];
    if (!_g) continue;
    for (const ach of _g.uyeler) {
      if (SaveData.hasAchievement(ach.id)) { _acilan.push(ach); continue; }
      let earned = false;

      switch(ach.type) {
        case 'distance':
          earned = (type === 'distance' && data.distance >= ach.val) || maxDist >= ach.val; break;
        case 'map_dist':
          earned = type === 'map_dist' && data.map === ach.map && data.distance >= ach.val; break;
        case 'flip':
          earned = type === 'flip' && data.flips >= ach.val; break;
        case 'total_flip':
          earned = totalFlips >= ach.val; break;
        case 'run_flips':
          earned = type === 'run_flips' && data.flips >= ach.val; break;
        case 'airtime':
          earned = type === 'airtime' && data.airtime >= ach.val; break;
        case 'total_coins':
          earned = totalCoins >= ach.val; break;
        case 'gold':
          earned = gold >= ach.val; break;
        case 'diamonds':
          earned = diamonds >= ach.val; break;
        case 'vehicles':
          earned = owned.length >= ach.val; break;
        case 'bot_win':
          earned = botWins >= ach.val; break;
        case 'rank':
          const ranks = ['YENİ BAŞLAYAN','BRONZ','GÜMÜŞ','ALTIN','ELMAS','EFSANE'];
          earned = ranks.indexOf(rank) >= ranks.indexOf(ach.val); break;
        case 'speed':
          earned = type === 'speed' && data.speed >= ach.val; break;
        case 'no_flip':
          earned = type === 'no_flip' && data.dist >= ach.val; break;
        case 'fuel_save':
          earned = type === 'fuel_save' && data.dist >= ach.val; break;
        case 'run_count':
          earned = runCount >= ach.val; break;
        case 'combo':
          earned = type === 'combo' && data.count >= ach.val; break;
        case 'manual':
          earned = type === ach.id; break;
        default:
          if (ach.type === type) earned = true; break;
      }

      if (earned) {
        if (SaveData.setAchievement(ach.id)) {
          // 🔴 SIZINTI (29 Tmz): `pendingToast` yalnız `shift()` ile tüketiliyor;
          //   tüketen çağrılmazsa sınırsız büyüyordu (ölçümde 132 eleman).
          this.pendingToast.push(ach);
          while (this.pendingToast.length > 20) this.pendingToast.shift();
          this._notifyUnlock(ach);
        }
        _acilan.push(ach);
      }
    }
    }
    // ⚠ Gezerken diziyi DEĞİŞTİRME — açılanlar döngü bittikten sonra düşer.
    for (let i = 0; i < _acilan.length; i++) this._dus(_acilan[i]);
  },

  // Additive unlock feedback: UI toast + sound + one-time reward grant.
  // Only ever invoked on a NEW unlock, and reward grant is guarded to be idempotent.
  _notifyUnlock(ach) {
    if (!ach || !ach.id) return;
    this._rewardsGranted = this._rewardsGranted || {};
    var name = ach.name || ach.label || ach.id;
    var icon = ach.icon ? (ach.icon + ' ') : '';
    // UI toast (guarded)
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('🏆 ' + icon + name);
    }
    // Sound (guarded): prefer playUnlock, else playConfirm, else playMilestone, else playCoin
    if (typeof Audio !== 'undefined') {
      if (Audio.playUnlock) Audio.playUnlock();
      else if (Audio.playConfirm) Audio.playConfirm();
      else if (Audio.playMilestone) Audio.playMilestone();
      else if (Audio.playCoin) Audio.playCoin();
    }
    // Reward grant (guarded + idempotent): only if a reward field exists and not already granted
    if (ach.reward && !this._rewardsGranted[ach.id] && typeof SaveData !== 'undefined') {
      var r = ach.reward;
      var goldAmt = (r.coins || 0) + (r.gold || 0);
      var gemAmt = (r.gems || 0) + (r.diamonds || 0);
      if (goldAmt && SaveData.addGold) SaveData.addGold(goldAmt);
      if (gemAmt && SaveData.addDiamonds) SaveData.addDiamonds(gemAmt);
      if (r.xp && SaveData.addXP) SaveData.addXP(r.xp);
      this._rewardsGranted[ach.id] = true;
    }
  },

  checkDistance(distance, mapId) {
    this.check('distance', { distance });
    this.check('map_dist', { distance, map: mapId });
    this.check('rank');
  },

  checkFlip(totalRunFlips) {
    this._runFlips = totalRunFlips;
    const totalFlips = (SaveData.get('totalFlips') || 0) + 1;
    SaveData.data.totalFlips = totalFlips;
    this.check('flip', { flips: 1 });
    this.check('run_flips', { flips: totalRunFlips });
    this.check('total_flip');
  },

  checkAirtime(seconds) {
    this._runAirtime += seconds;
    this.check('airtime', { airtime: this._runAirtime });
  },

  checkSpeed(kmh) {
    this.check('speed', { speed: kmh });
  },

  checkBotWin() {
    const w = (SaveData.get('botWins') || 0) + 1;
    SaveData.data.botWins = w;
    this.check('bot_win');
  },

  checkRunCount() {
    const rc = (SaveData.get('runCount') || 0) + 1;
    SaveData.data.runCount = rc;
    this.check('run_count');
  },

  getProgress(achId) {
    const ach = this.list.find(a => a.id === achId);
    if (!ach) return { current: 0, total: 1, pct: 0 };
    const gold = SaveData.get('gold') || 0;
    const totalCoins = SaveData.get('totalCoins') || 0;
    const owned = SaveData.get('ownedVehicles') || [];
    const maxDist = SaveData.get('maxDistance') || 0;
    const totalFlips = SaveData.get('totalFlips') || 0;
    const botWins = SaveData.get('botWins') || 0;
    const runCount = SaveData.get('runCount') || 0;
    let current = 0;
    switch(ach.type) {
      case 'distance': current = maxDist; break;
      case 'gold': current = gold; break;
      case 'total_coins': current = totalCoins; break;
      case 'vehicles': current = owned.length; break;
      case 'total_flip': current = totalFlips; break;
      case 'bot_win': current = botWins; break;
      case 'run_count': current = runCount; break;
    }
    const total = typeof ach.val === 'number' ? ach.val : 1;
    return { current, total, pct: Math.min(1, current / total) };
  },

  getToast() {
    return this.pendingToast.shift() || null;
  },

  getUnlocked() {
    return this.list.filter(a => SaveData.hasAchievement(a.id));
  },

  getLocked() {
    return this.list.filter(a => !SaveData.hasAchievement(a.id));
  },

  getStats() {
    const total = this.list.length;
    const unlocked = this.getUnlocked().length;
    return { total, unlocked, pct: Math.round(100 * unlocked / total) };
  },

  // ─── YENİ KATEGORİLER VE EK BAŞARIMLAR ───────────────────────────────────

  HIDDEN_ACHIEVEMENTS: [
    { id: 'hidden_backflip10',   name: 'Backflip Master',    desc: 'Do 10 backflips in a row',              icon: '🤸', points: 150, category: 'hidden', hint: 'Push the laws of physics...' },
    { id: 'hidden_midnight_run', name: 'Night Traveler',     desc: 'Play between 00:00-04:00',              icon: '🌙', points: 100, category: 'hidden', hint: 'Something hidden in the dark...' },
    { id: 'hidden_nosave',       name: 'Backupless Hero',    desc: 'Go 10km without saving',                 icon: '⚡', points: 200, category: 'hidden', hint: 'Without a safety net...' },
    { id: 'hidden_gold_streak',  name: 'Gold Maniac',        desc: 'Collect 100 gold, spend nothing',        icon: '💰', points: 120, category: 'hidden', hint: 'Resist the urge to spend...' },
    { id: 'hidden_no_nitro',     name: 'Pure Power',         desc: 'Go 5km without using nitro',             icon: '💪', points: 180, category: 'hidden', hint: 'Sometimes less is more...' },
    { id: 'hidden_flip_combo',   name: 'Acrobat',            desc: 'Do 3 different flip types in one run',  icon: '🎪', points: 130, category: 'hidden', hint: '...' },
    { id: 'hidden_perfect_land', name: 'Perfect Landing',    desc: 'Do 10 perfect landings',                icon: '🎯', points: 90,  category: 'hidden', hint: 'The secret of a flat landing...' },
    { id: 'hidden_coin_magnet',  name: 'Coin Magnet',        desc: 'Collect 500+ gold in one run',           icon: '🧲', points: 160, category: 'hidden', hint: 'Catch them all...' },
    { id: 'hidden_speedster',    name: 'Speed Beast',        desc: 'Reach max speed 5 times',               icon: '🚀', points: 140, category: 'hidden', hint: 'Push the limit...' },
    { id: 'hidden_survival',     name: 'Survivor',           desc: 'Survive for 20 minutes',                icon: '🛡', points: 200, category: 'hidden', hint: 'Time is your friend...' },
    { id: 'hidden_world_end',    name: 'End of the World',   desc: 'Reach the far edge of the map',         icon: '🌍', points: 300, category: 'hidden', hint: 'Keep exploring...' },
    { id: 'hidden_ghost_driver', name: 'Ghost Driver',       desc: 'Go 10km in a run with no rivals',       icon: '👻', points: 80,  category: 'hidden', hint: 'Alone but free...' }
  ],

  CHALLENGE_ACHIEVEMENTS: [
    { id: 'ch_1m_distance',    name: 'Millioner',       desc: 'Travel 1,000,000m total distance',     icon: '🏅', points: 1000, category: 'challenge', difficulty: 'legendary' },
    { id: 'ch_10k_flips',      name: 'God of Flips',    desc: 'Do 10,000 total flips',                icon: '🌀', points: 800,  category: 'challenge', difficulty: 'legendary' },
    { id: 'ch_all_vehicles',   name: 'Completionist',   desc: 'Own all vehicles',                     icon: '🚗', points: 600,  category: 'challenge', difficulty: 'hard' },
    { id: 'ch_no_damage_5km',  name: 'Damage Free',     desc: 'Go 5km without taking damage',         icon: '💎', points: 500,  category: 'challenge', difficulty: 'hard' },
    { id: 'ch_win_100_races',  name: 'Race Legend',     desc: 'Win 100 bot races',                    icon: '🏆', points: 700,  category: 'challenge', difficulty: 'hard' },
    { id: 'ch_gold_hoarder',   name: 'Gold Treasure',   desc: 'Save up 50,000 gold',                  icon: '💎', points: 600,  category: 'challenge', difficulty: 'hard' },
    { id: 'ch_500_runs',       name: 'Endless Runner',  desc: 'Complete 500 runs',                    icon: '🎽', points: 400,  category: 'challenge', difficulty: 'medium' },
    { id: 'ch_100km_single',   name: 'In One Breath',   desc: 'Go 100km in one run',                  icon: '🛣', points: 900,  category: 'challenge', difficulty: 'legendary' },
    { id: 'ch_perfect_week',   name: 'Perfect Week',    desc: 'Complete 7 daily missions in a row',   icon: '📅', points: 350,  category: 'challenge', difficulty: 'medium' },
    { id: 'ch_flip_marathon',  name: 'Flip Marathon',   desc: 'Do 100 flips in one run',              icon: '🌪', points: 450,  category: 'challenge', difficulty: 'hard' }
  ],

  ACHIEVEMENT_CHAINS: [
    { id: 'chain_distance', name: 'Distance Chain', desc: 'Distance achievements',
      steps:   ['dist_100m','dist_500m','dist_1km','dist_5km','dist_10km','dist_25km','dist_50km'],
      rewards: [10,20,50,100,200,400,800] },
    { id: 'chain_flips',    name: 'Flip Chain',     desc: 'Flip achievements',
      steps:   ['flip_1','flip_10','flip_50','flip_100','flip_500'],
      rewards: [5,25,75,150,500] },
    { id: 'chain_vehicles', name: 'Vehicle Chain',  desc: 'Vehicle collection',
      steps:   ['buy_first','own_3_vehicles','own_5_vehicles','own_10_vehicles'],
      rewards: [20,60,120,300] },
    { id: 'chain_races',    name: 'Race Chain',     desc: 'Race victories',
      steps:   ['first_race_win','win_5_races','win_20_races','win_100_races'],
      rewards: [30,80,200,600] },
    { id: 'chain_gold',     name: 'Gold Chain',     desc: 'Gold accumulation',
      steps:   ['gold_100','gold_500','gold_2000','gold_10000','gold_50000'],
      rewards: [10,30,100,300,700] }
  ],

  DAILY_ACHIEVEMENTS: [
    { id: 'daily_1km',      name: 'Daily Runner',   desc: 'Go 1km today',            icon: '📍', points: 20, type: 'daily', target: 1000 },
    { id: 'daily_5_flips',  name: 'Daily Acrobat',  desc: 'Do 5 flips today',         icon: '🤸', points: 15, type: 'daily', target: 5 },
    { id: 'daily_50_coins', name: 'Daily Earner',   desc: 'Earn 50 gold today',       icon: '🪙', points: 25, type: 'daily', target: 50 },
    { id: 'daily_3_runs',   name: 'Daily Athlete',  desc: 'Play 3 runs today',        icon: '🎮', points: 10, type: 'daily', target: 3 },
    { id: 'daily_win',      name: 'Daily Victory',  desc: 'Win 1 bot race today',     icon: '🏁', points: 30, type: 'daily', target: 1 }
  ],

  WEEKLY_ACHIEVEMENTS: [
    { id: 'weekly_10km',     name: 'Weekly Runner',     desc: 'Go 10km in 7 days',        icon: '🗓', points: 100, type: 'weekly', target: 10000 },
    { id: 'weekly_50_flips', name: 'Weekly Acrobat',    desc: 'Do 50 flips in 7 days',    icon: '🌀', points: 80,  type: 'weekly', target: 50 },
    { id: 'weekly_5_wins',   name: 'Weekly Champion',   desc: 'Win 5 races in 7 days',    icon: '🏆', points: 120, type: 'weekly', target: 5 },
    { id: 'weekly_gold',     name: 'Weekly Treasure',   desc: 'Earn 500 gold in 7 days',  icon: '💰', points: 90,  type: 'weekly', target: 500 },
    { id: 'weekly_streak',   name: 'Weekly Streak',     desc: 'Play 7 days in a row',     icon: '🔥', points: 150, type: 'weekly', target: 7 }
  ],

  SEASONAL_ACHIEVEMENTS: [
    { id: 'seasonal_spring', name: 'Spring Master', desc: 'Complete the spring event',    icon: '🌸', points: 300, season: 'spring' },
    { id: 'seasonal_summer', name: 'Summer Storm',  desc: 'Complete the summer event',    icon: '☀',       points: 300, season: 'summer' },
    { id: 'seasonal_autumn', name: 'Autumn Legend', desc: 'Complete the autumn event',    icon: '🍂', points: 300, season: 'autumn' },
    { id: 'seasonal_winter', name: 'Winter Warrior', desc: 'Complete the winter event',   icon: '❅',       points: 300, season: 'winter' }
  ],

  EXTRA_ACHIEVEMENTS: [
    { id: 'extra_first_flip',     name: 'First Flip',         desc: 'Do your first flip',                    icon: '🤸', points: 5,   category: 'skill',      type: 'flip',        val: 1 },
    { id: 'extra_flip_5',         name: 'Rookie Acrobat',     desc: 'Do 5 flips',                             icon: '🌀', points: 10,  category: 'skill',      type: 'flip',        val: 5 },
    { id: 'extra_flip_25',        name: 'Spinning Dervish',   desc: 'Do 25 flips',                            icon: '💫', points: 30,  category: 'skill',      type: 'flip',        val: 25 },
    { id: 'extra_triple_flip',    name: 'Triple Flip',        desc: 'Do 3 flips in one run',                  icon: '🔄', points: 40,  category: 'skill',      type: 'triple_flip', val: 1 },
    { id: 'extra_first_vehicle',  name: 'First Vehicle',      desc: 'Buy your first vehicle',                 icon: '🚗', points: 15,  category: 'collection', type: 'vehicles',    val: 2 },
    { id: 'extra_five_vehicles',  name: 'Garage Owner',       desc: 'Own 5 vehicles',                         icon: '🏠', points: 80,  category: 'collection', type: 'vehicles',    val: 5 },
    { id: 'extra_eight_vehicles', name: 'Big Garage',         desc: 'Own 8 vehicles',                         icon: '🏭', points: 150, category: 'collection', type: 'vehicles',    val: 8 },
    { id: 'extra_dist_2km',       name: '2km Run',            desc: 'Travel 2km distance',                    icon: '📏', points: 15,  category: 'distance',   type: 'distance',    val: 2000 },
    { id: 'extra_dist_3km',       name: '3km Run',            desc: 'Travel 3km distance',                    icon: '📏', points: 20,  category: 'distance',   type: 'distance',    val: 3000 },
    { id: 'extra_dist_7km',       name: '7km Run',            desc: 'Travel 7km distance',                    icon: '📏', points: 60,  category: 'distance',   type: 'distance',    val: 7000 },
    { id: 'extra_dist_15km',      name: '15km Run',           desc: 'Travel 15km distance',                   icon: '🗺', points: 120, category: 'distance',   type: 'distance',    val: 15000 },
    { id: 'extra_dist_30km',      name: '30km Run',           desc: 'Travel 30km distance',                   icon: '🌐', points: 250, category: 'distance',   type: 'distance',    val: 30000 },
    { id: 'extra_dist_75km',      name: '75km Run',           desc: 'Travel 75km distance',                   icon: '🚀', points: 500, category: 'distance',   type: 'distance',    val: 75000 },
    { id: 'extra_gold_50',        name: 'Small Savings',      desc: 'Save up 50 gold',                        icon: '🪙', points: 10,  category: 'economy',    type: 'gold',        val: 50 },
    { id: 'extra_gold_250',       name: 'Medium Savings',     desc: 'Save up 250 gold',                       icon: '💵', points: 25,  category: 'economy',    type: 'gold',        val: 250 },
    { id: 'extra_gold_750',       name: 'Good Savings',       desc: 'Save up 750 gold',                       icon: '💴', points: 60,  category: 'economy',    type: 'gold',        val: 750 },
    { id: 'extra_gold_2500',      name: 'Big Savings',        desc: 'Save up 2500 gold',                      icon: '💶', points: 120, category: 'economy',    type: 'gold',        val: 2500 },
    { id: 'extra_gold_7500',      name: 'Giant Treasure',     desc: 'Save up 7500 gold',                      icon: '💷', points: 250, category: 'economy',    type: 'gold',        val: 7500 },
    { id: 'extra_coins_100',      name: 'Hundred Coins',      desc: 'Earn 100 gold total',                    icon: '🪙', points: 10,  category: 'economy',    type: 'total_coins', val: 100 },
    { id: 'extra_coins_1000',     name: 'Thousand Coins',     desc: 'Earn 1000 gold total',                   icon: '💰', points: 40,  category: 'economy',    type: 'total_coins', val: 1000 },
    { id: 'extra_coins_5000',     name: 'Five Thousand Coins', desc: 'Earn 5000 gold total',                  icon: '🏦', points: 150, category: 'economy',    type: 'total_coins', val: 5000 },
    { id: 'extra_win_1',          name: 'First Victory',      desc: 'Win a bot race',                         icon: '🥇', points: 20,  category: 'race',       type: 'bot_win',     val: 1 },
    { id: 'extra_win_3',          name: 'Three Victories',    desc: 'Win 3 bot races',                        icon: '🏆', points: 45,  category: 'race',       type: 'bot_win',     val: 3 },
    { id: 'extra_win_10',         name: 'Ten Victories',      desc: 'Win 10 bot races',                       icon: '👑', points: 120, category: 'race',       type: 'bot_win',     val: 10 },
    { id: 'extra_win_25',         name: 'Twenty-Five Victories', desc: 'Win 25 bot races',                    icon: '🎖', points: 250, category: 'race',       type: 'bot_win',     val: 25 },
    { id: 'extra_run_5',          name: 'Five Runs',          desc: 'Play 5 runs',                            icon: '🎮', points: 10,  category: 'dedication', type: 'run_count',   val: 5 },
    { id: 'extra_run_15',         name: 'Fifteen Runs',       desc: 'Play 15 runs',                           icon: '🎮', points: 20,  category: 'dedication', type: 'run_count',   val: 15 },
    { id: 'extra_run_30',         name: 'Thirty Runs',        desc: 'Play 30 runs',                           icon: '🕹', points: 40,  category: 'dedication', type: 'run_count',   val: 30 },
    { id: 'extra_run_75',         name: 'Seventy-Five Runs',  desc: 'Play 75 runs',                           icon: '🕹', points: 80,  category: 'dedication', type: 'run_count',   val: 75 },
    { id: 'extra_run_200',        name: 'Two Hundred Runs',   desc: 'Play 200 runs',                          icon: '🎯', points: 200, category: 'dedication', type: 'run_count',   val: 200 },
    { id: 'extra_flip_75',        name: 'Flip Master II',     desc: 'Do 75 flips',                            icon: '🌪', points: 70,  category: 'skill',      type: 'total_flip',  val: 75 },
    { id: 'extra_flip_200',       name: 'Flip Master III',    desc: 'Do 200 flips',                           icon: '🌀', points: 160, category: 'skill',      type: 'total_flip',  val: 200 },
    { id: 'extra_flip_500',       name: 'Flip Legend',        desc: 'Do 500 flips',                           icon: '💥', points: 400, category: 'skill',      type: 'total_flip',  val: 500 }
  ],

  ACHIEVEMENT_BADGES: {
    'distance':   { shape: 'circle',  color: '#4488FF', icon: '📏', size: 48 },
    'skill':      { shape: 'star',    color: '#FFD700', icon: '⭐', size: 48 },
    'collection': { shape: 'shield',  color: '#44AAFF', icon: '🛡', size: 48 },
    'economy':    { shape: 'diamond', color: '#FFD700', icon: '💎', size: 48 },
    'race':       { shape: 'trophy',  color: '#FF8800', icon: '🏆', size: 48 },
    'dedication': { shape: 'circle',  color: '#FF44FF', icon: '🎯', size: 48 },
    'hidden':     { shape: 'mystery', color: '#8888FF', icon: '❓', size: 48 },
    'challenge':  { shape: 'flame',   color: '#FF4400', icon: '🔥', size: 48 },
    'daily':      { shape: 'sun',     color: '#FFCC00', icon: '☀',       size: 40 },
    'weekly':     { shape: 'moon',    color: '#8888CC', icon: '📅', size: 44 },
    'seasonal':   { shape: 'leaf',    color: '#44CC44', icon: '🌿', size: 48 }
  },

  getChainProgress(chainId) {
    var chain = (this.ACHIEVEMENT_CHAINS || []).filter(function(c){return c.id===chainId;})[0];
    if (!chain) return null;
    var completed = 0;
    for (var i = 0; i < chain.steps.length; i++) {
      if (typeof SaveData !== 'undefined' && SaveData.hasAchievement(chain.steps[i])) completed++;
    }
    return {
      chainId: chainId, name: chain.name, completed: completed,
      total: chain.steps.length,
      pct: Math.min(1, completed / chain.steps.length),
      nextStep: chain.steps[completed] || null,
      totalReward: chain.rewards.reduce(function(s,r){return s+r;},0),
      earnedReward: chain.rewards.slice(0, completed).reduce(function(s,r){return s+r;},0)
    };
  },

  checkHiddenAchievements(gameState) {
    if (!gameState) return [];
    var unlocked = [];
    var self = this;
    (this.HIDDEN_ACHIEVEMENTS || []).forEach(function(ha) {
      if (typeof SaveData !== 'undefined' && SaveData.hasAchievement(ha.id)) return;
      var shouldUnlock = false;
      switch (ha.id) {
        case 'hidden_backflip10':   shouldUnlock = (gameState.sessionBackflips||0) >= 10; break;
        case 'hidden_midnight_run': var h=new Date().getHours(); shouldUnlock=(h>=0&&h<4); break;
        case 'hidden_nosave':       shouldUnlock = (gameState.sessionDistance||0)>=10000&&!gameState.savedThisSession; break;
        case 'hidden_gold_streak':  shouldUnlock = (gameState.gold||0)>=100&&!gameState.spentGoldThisSession; break;
        case 'hidden_no_nitro':     shouldUnlock = (gameState.sessionDistance||0)>=5000&&!gameState.usedNitro; break;
        case 'hidden_flip_combo':   shouldUnlock = (gameState.flipTypes||[]).length>=3; break;
        case 'hidden_perfect_land': shouldUnlock = (gameState.perfectLandings||0)>=10; break;
        case 'hidden_coin_magnet':  shouldUnlock = (gameState.sessionCoins||0)>=500; break;
        case 'hidden_speedster':    shouldUnlock = (gameState.maxSpeedHits||0)>=5; break;
        case 'hidden_survival':     shouldUnlock = (gameState.sessionSeconds||0)>=1200; break;
        case 'hidden_world_end':    shouldUnlock = !!(gameState.reachedWorldEnd); break;
        case 'hidden_ghost_driver': shouldUnlock = (gameState.sessionDistance||0)>=10000&&!gameState.hasBot; break;
      }
      if (shouldUnlock) {
        if (typeof SaveData !== 'undefined') { SaveData.setAchievement(ha.id); self.pendingToast.push(ha); self._notifyUnlock(ha); }
        unlocked.push(ha);
      }
    });
    return unlocked;
  },

  getAchievementCategory(id) {
    var lists = [
      [this.HIDDEN_ACHIEVEMENTS||[], 'hidden'],
      [this.CHALLENGE_ACHIEVEMENTS||[], 'challenge'],
      [this.DAILY_ACHIEVEMENTS||[], 'daily'],
      [this.WEEKLY_ACHIEVEMENTS||[], 'weekly'],
      [this.SEASONAL_ACHIEVEMENTS||[], 'seasonal']
    ];
    for (var li = 0; li < lists.length; li++) {
      for (var ai = 0; ai < lists[li][0].length; ai++) {
        if (lists[li][0][ai].id === id) return lists[li][1];
      }
    }
    var extra = (this.EXTRA_ACHIEVEMENTS||[]).filter(function(a){return a.id===id;})[0];
    if (extra) return extra.category || 'extra';
    var main = (this.list||[]).filter(function(a){return a.id===id;})[0];
    if (main) return main.category || 'general';
    return 'unknown';
  },

  getAchievementDifficulty(id) {
    var ch = (this.CHALLENGE_ACHIEVEMENTS||[]).filter(function(a){return a.id===id;})[0];
    if (ch) return ch.difficulty || 'hard';
    var hid = (this.HIDDEN_ACHIEVEMENTS||[]).filter(function(a){return a.id===id;})[0];
    if (hid) return 'medium';
    var extra = (this.EXTRA_ACHIEVEMENTS||[]).filter(function(a){return a.id===id;})[0];
    var main  = (this.list||[]).filter(function(a){return a.id===id;})[0];
    var pts = extra ? extra.points : (main ? main.points : 0);
    if (pts >= 400) return 'legendary';
    if (pts >= 150) return 'hard';
    if (pts >= 50)  return 'medium';
    return 'easy';
  },

  getTotalPoints() {
    var all = (this.list||[]).concat(this.EXTRA_ACHIEVEMENTS||[]).concat(this.HIDDEN_ACHIEVEMENTS||[]).concat(this.CHALLENGE_ACHIEVEMENTS||[]);
    var total = 0;
    all.forEach(function(a) {
      if (typeof SaveData !== 'undefined' && SaveData.hasAchievement(a.id)) total += (a.points||0);
    });
    return total;
  },

  getPointsByCategory() {
    var all = (this.list||[]).concat(this.EXTRA_ACHIEVEMENTS||[]).concat(this.HIDDEN_ACHIEVEMENTS||[]).concat(this.CHALLENGE_ACHIEVEMENTS||[]);
    var byCategory = {};
    var self = this;
    all.forEach(function(a) {
      if (typeof SaveData !== 'undefined' && SaveData.hasAchievement(a.id)) {
        var cat = self.getAchievementCategory(a.id);
        byCategory[cat] = (byCategory[cat]||0) + (a.points||0);
      }
    });
    return byCategory;
  },

  getAllAchievements() {
    var hidden = (this.HIDDEN_ACHIEVEMENTS||[]).map(function(a){var c=Object.assign({},a);c.isHidden=true;return c;});
    return (this.list||[]).concat(this.EXTRA_ACHIEVEMENTS||[]).concat(hidden).concat(this.CHALLENGE_ACHIEVEMENTS||[]).concat(this.DAILY_ACHIEVEMENTS||[]).concat(this.WEEKLY_ACHIEVEMENTS||[]).concat(this.SEASONAL_ACHIEVEMENTS||[]);
  },

  getFilteredAchievements(filter) {
    var all = this.getAllAchievements();
    var self = this;
    if (!filter || filter === 'all') return all;
    if (filter === 'unlocked') return all.filter(function(a){return typeof SaveData!=='undefined'&&SaveData.hasAchievement(a.id);});
    if (filter === 'locked')   return all.filter(function(a){return !(typeof SaveData!=='undefined'&&SaveData.hasAchievement(a.id));});
    return all.filter(function(a){return self.getAchievementCategory(a.id)===filter;});
  },

  drawAchievementCard(ctx, x, y, achievement, unlocked, progress, t) {
    var W=200, H=80;
    var prog=progress||{pct:0,current:0,total:1};
    var isHidden=achievement.isHidden&&!unlocked;
    var badge=(this.ACHIEVEMENT_BADGES||{})[achievement.category]||{color:'#888',icon:'?'};
    ctx.save(); ctx.translate(x,y);
    ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=10; ctx.shadowOffsetY=3;
    ctx.fillStyle=unlocked?'rgba(20,30,10,0.95)':'rgba(15,15,20,0.6)';
    ctx.beginPath(); ctx.roundRect(0,0,W,H,10); ctx.fill();
    ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    ctx.strokeStyle=unlocked?'#FFD700':'rgba(255,255,255,0.1)';
    ctx.lineWidth=unlocked?2:1;
    ctx.beginPath(); ctx.roundRect(0,0,W,H,10); ctx.stroke();
    ctx.fillStyle=unlocked?(badge.color+'33'):'rgba(100,100,100,0.1)';
    ctx.beginPath(); ctx.roundRect(6,6,H-12,H-12,6); ctx.fill();
    ctx.font='28px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(isHidden?'❓':(achievement.icon||badge.icon),6+(H-12)/2,H/2);
    var textX=H+4;
    ctx.fillStyle=unlocked?'#FFFFFF':(isHidden?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.6)');
    ctx.font='bold 12px Arial'; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(isHidden?'???':(achievement.name||''),textX,8);
    ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.font='9px Arial';
    var descText=isHidden?(achievement.hint||'Gizli basarim...'):(achievement.desc||'');
    var maxLineW=W-textX-6;
    var words=String(descText).split(' ');
    var line='',lineY=26;
    for(var wi=0;wi<words.length;wi++){
      var test=line+words[wi]+' ';
      if(ctx.measureText(test).width>maxLineW&&line!==''){
        ctx.fillText(line.trim(),textX,lineY); line=words[wi]+' '; lineY+=12;
      } else { line=test; }
    }
    if(line) ctx.fillText(line.trim(),textX,lineY);
    if(!unlocked&&prog.total>1){
      var barY=H-16, barW=W-textX-6;
      ctx.fillStyle='rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.roundRect(textX,barY,barW,6,3); ctx.fill();
      ctx.fillStyle='#4488FF';
      ctx.beginPath(); ctx.roundRect(textX,barY,barW*prog.pct,6,3); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='7px monospace';
      ctx.textAlign='right'; ctx.textBaseline='top';
      ctx.fillText(prog.current+'/'+prog.total,W-4,barY-1);
    }
    if(unlocked){
      ctx.fillStyle='#44FF88'; ctx.font='bold 12px Arial';
      ctx.textAlign='right'; ctx.textBaseline='top';
      ctx.fillText('✓',W-6,6);
      if(achievement.points){
        ctx.fillStyle='#FFD700'; ctx.font='bold 9px Arial';
        ctx.textAlign='right'; ctx.textBaseline='bottom';
        ctx.fillText('+'+achievement.points+'pts',W-6,H-5);
      }
    }
    ctx.restore();
  },

  drawAchievementPage(ctx, W, H, page, filter, t) {
    page=page||0; filter=filter||'all';
    var allAchs=this.getFilteredAchievements(filter);
    var cardsPerPage=6;
    var pageAchs=allAchs.slice(page*cardsPerPage,(page+1)*cardsPerPage);
    var totalPages=Math.ceil(allAchs.length/cardsPerPage);
    var self=this;
    ctx.save();
    ctx.fillStyle='rgba(5,5,15,0.97)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#FFD700'; ctx.font='bold 22px Arial';
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText('ACHIEVEMENTS',W/2,16);
    var stats=this.getStats();
    var totalPts=this.getTotalPoints();
    ctx.fillStyle='rgba(255,215,0,0.1)';
    ctx.beginPath(); ctx.roundRect(W/2-160,44,320,28,8); ctx.fill();
    ctx.fillStyle='#aaa'; ctx.font='11px Arial';
    ctx.fillText(stats.unlocked+'/'+stats.total+' unlocked  •  '+totalPts+' points  •  '+stats.pct+'%',W/2,58);
    var filterTabs=['all','unlocked','locked','challenge','hidden','daily'];
    var tabW=(W-20)/filterTabs.length;
    filterTabs.forEach(function(f,i){
      var tx=10+i*tabW;
      ctx.fillStyle=filter===f?'rgba(255,215,0,0.2)':'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.roundRect(tx,78,tabW-4,22,4); ctx.fill();
      ctx.fillStyle=filter===f?'#FFD700':'rgba(255,255,255,0.5)';
      ctx.font=(filter===f?'bold ':'')+' 10px Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(f.toUpperCase(),tx+(tabW-4)/2,89);
    });
    var cardW=(W-30)/2, cardH=85, startY=108;
    pageAchs.forEach(function(ach,i){
      var col=i%2, row=Math.floor(i/2);
      var cx=10+col*(cardW+10), cy=startY+row*(cardH+8);
      var unlockedState=typeof SaveData!=='undefined'&&SaveData.hasAchievement(ach.id);
      var prog=self.getProgress(ach.id);
      self.drawAchievementCard(ctx,cx,cy,ach,unlockedState,prog,t);
    });
    ctx.fillStyle='#888'; ctx.font='11px Arial';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('Page '+(page+1)+' / '+totalPages,W/2,H-6);
    if(page>0){ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='bold 18px Arial';ctx.textAlign='left';ctx.fillText('◀',14,H-6);}
    if(page<totalPages-1){ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='bold 18px Arial';ctx.textAlign='right';ctx.fillText('▶',W-14,H-6);}
    ctx.restore();
  }

};


// ============================================================
// ACHIEVEMENT CATEGORIES
// ============================================================
const ACHIEVEMENT_CATEGORIES = {
  distance: {
    id: 'distance',
    name: 'Distance',
    icon: '🛣️',
    color: '#3498db',
    description: 'Achievements earned by traveling far distances across all your runs.'
  },
  speed: {
    id: 'speed',
    name: 'Speed',
    icon: '⚡',
    color: '#f39c12',
    description: 'Achievements for reaching high speeds and sustaining velocity.'
  },
  flips: {
    id: 'flips',
    name: 'Flips & Stunts',
    icon: '🔄',
    color: '#9b59b6',
    description: 'Achievements for performing aerial flips, tricks, and stunts.'
  },
  coins: {
    id: 'coins',
    name: 'Coins',
    icon: '🪙',
    color: '#f1c40f',
    description: 'Achievements related to collecting coins and accumulating wealth.'
  },
  vehicles: {
    id: 'vehicles',
    name: 'Vehicles',
    icon: '🚗',
    color: '#e74c3c',
    description: 'Achievements tied to unlocking and mastering different vehicles.'
  },
  maps: {
    id: 'maps',
    name: 'Maps & Worlds',
    icon: '🗺️',
    color: '#27ae60',
    description: 'Achievements for exploring and completing various maps and worlds.'
  },
  cups: {
    id: 'cups',
    name: 'Cups & Trophies',
    icon: '🏆',
    color: '#e67e22',
    description: 'Achievements for winning cups, tournaments, and championships.'
  },
  social: {
    id: 'social',
    name: 'Social',
    icon: '👥',
    color: '#1abc9c',
    description: 'Achievements earned through social interactions, sharing, and community.'
  },
  special: {
    id: 'special',
    name: 'Special',
    icon: '⭐',
    color: '#e91e63',
    description: 'Rare and unique achievements for extraordinary accomplishments.'
  },
  secret: {
    id: 'secret',
    name: 'Secret',
    icon: '🔒',
    color: '#607d8b',
    description: 'Hidden achievements revealed only when you unlock them.'
  }
};

// ============================================================
// EXTRA_ACHIEVEMENTS ARRAY (50 new achievements)
// ============================================================
const EXTRA_ACHIEVEMENTS = [
  {
    id: 'astronaut',
    name: 'Astronaut',
    desc: 'Reach an altitude of 50 meters above the ground in a single jump.',
    icon: '🚀',
    category: 'flips',
    condition: { type: 'max_altitude', value: 50 },
    reward: { coins: 500, gems: 2 },
    secret: false,
    xp: 300
  },
  {
    id: 'fish_tank',
    name: 'Fish Tank',
    desc: 'Complete an underwater level without losing any fuel.',
    icon: '🐠',
    category: 'maps',
    condition: { type: 'underwater_no_fuel_loss', value: 1 },
    reward: { coins: 750, gems: 3 },
    secret: true,
    xp: 400
  },
  {
    id: 'pyromaniac',
    name: 'Pyromaniac',
    desc: 'Drive through 100 fire obstacles across all runs.',
    icon: '🔥',
    category: 'special',
    condition: { type: 'fire_obstacles_hit', value: 100 },
    reward: { coins: 1000, gems: 5 },
    secret: false,
    xp: 500
  },
  {
    id: 'ghost_hunter',
    name: 'Ghost Hunter',
    desc: 'Beat a ghost time on 10 different tracks.',
    icon: '👻',
    category: 'social',
    condition: { type: 'ghost_times_beaten', value: 10 },
    reward: { coins: 600, gems: 3 },
    secret: false,
    xp: 350
  },
  {
    id: 'fuel_hoarder',
    name: 'Fuel Hoarder',
    desc: 'Finish a level with 90% or more fuel remaining.',
    icon: '⛽',
    category: 'special',
    condition: { type: 'fuel_remaining_pct', value: 90 },
    reward: { coins: 400, gems: 2 },
    secret: false,
    xp: 250
  },
  {
    id: 'combo_king',
    name: 'Combo King',
    desc: 'Achieve a combo multiplier of x10 or higher in a single run.',
    icon: '👑',
    category: 'flips',
    condition: { type: 'max_combo', value: 10 },
    reward: { coins: 800, gems: 4 },
    secret: false,
    xp: 450
  },
  {
    id: 'stunt_master',
    name: 'Stunt Master',
    desc: 'Perform 500 total stunts across all your runs.',
    icon: '🎪',
    category: 'flips',
    condition: { type: 'total_stunts', value: 500 },
    reward: { coins: 1200, gems: 6 },
    secret: false,
    xp: 600
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    desc: 'Play the game before 7 AM local time.',
    icon: '🌅',
    category: 'special',
    condition: { type: 'play_before_7am', value: 1 },
    reward: { coins: 300, gems: 1 },
    secret: true,
    xp: 200
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    desc: 'Play the game after midnight local time.',
    icon: '🦉',
    category: 'special',
    condition: { type: 'play_after_midnight', value: 1 },
    reward: { coins: 300, gems: 1 },
    secret: true,
    xp: 200
  },
  {
    id: 'coin_collector_10k',
    name: 'Coin Millionaire Jr.',
    desc: 'Collect 10,000 coins in total across all runs.',
    icon: '💰',
    category: 'coins',
    condition: { type: 'total_coins', value: 10000 },
    reward: { coins: 2000, gems: 8 },
    secret: false,
    xp: 700
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    desc: 'Reach a top speed of 200 km/h.',
    icon: '💨',
    category: 'speed',
    condition: { type: 'max_speed_kmh', value: 200 },
    reward: { coins: 900, gems: 4 },
    secret: false,
    xp: 500
  },
  {
    id: 'triple_backflip',
    name: 'Triple Threat',
    desc: 'Perform 3 backflips in a single jump.',
    icon: '🔁',
    category: 'flips',
    condition: { type: 'flips_in_jump', value: 3 },
    reward: { coins: 600, gems: 3 },
    secret: false,
    xp: 350
  },
  {
    id: 'marathon_runner',
    name: 'Marathon Runner',
    desc: 'Travel a total cumulative distance of 42.195 km.',
    icon: '🏃',
    category: 'distance',
    condition: { type: 'total_distance_m', value: 42195 },
    reward: { coins: 1500, gems: 7 },
    secret: false,
    xp: 650
  },
  {
    id: 'vehicle_collector',
    name: 'Collector',
    desc: 'Unlock 15 different vehicles.',
    icon: '🚘',
    category: 'vehicles',
    condition: { type: 'vehicles_unlocked', value: 15 },
    reward: { coins: 2500, gems: 10 },
    secret: false,
    xp: 800
  },
  {
    id: 'map_explorer',
    name: 'Map Explorer',
    desc: 'Complete every level in 5 different worlds.',
    icon: '🌍',
    category: 'maps',
    condition: { type: 'worlds_completed', value: 5 },
    reward: { coins: 2000, gems: 8 },
    secret: false,
    xp: 750
  },
  {
    id: 'cup_champion',
    name: 'Cup Champion',
    desc: 'Win 10 cups across any game modes.',
    icon: '🥇',
    category: 'cups',
    condition: { type: 'cups_won', value: 10 },
    reward: { coins: 3000, gems: 12 },
    secret: false,
    xp: 900
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    desc: 'Share a replay with 5 different friends.',
    icon: '🦋',
    category: 'social',
    condition: { type: 'replays_shared', value: 5 },
    reward: { coins: 500, gems: 2 },
    secret: false,
    xp: 300
  },
  {
    id: 'head_banger',
    name: 'Head Banger',
    desc: 'Flip your vehicle 1000 times in total.',
    icon: '🤘',
    category: 'flips',
    condition: { type: 'total_flips', value: 1000 },
    reward: { coins: 1800, gems: 7 },
    secret: false,
    xp: 700
  },
  {
    id: 'survivor',
    name: 'Survivor',
    desc: 'Complete a level with less than 1% fuel remaining.',
    icon: '😅',
    category: 'special',
    condition: { type: 'fuel_remaining_pct_max', value: 1 },
    reward: { coins: 700, gems: 3 },
    secret: false,
    xp: 400
  },
  {
    id: 'perfect_landing',
    name: 'Perfect Landing',
    desc: 'Land perfectly from a height of 20m without crashing.',
    icon: '🎯',
    category: 'flips',
    condition: { type: 'perfect_landing_height', value: 20 },
    reward: { coins: 600, gems: 3 },
    secret: false,
    xp: 350
  },
  {
    id: 'underground',
    name: 'Subterranean',
    desc: 'Complete all underground/cave levels.',
    icon: '⛏️',
    category: 'maps',
    condition: { type: 'cave_levels_done', value: 1 },
    reward: { coins: 1100, gems: 5 },
    secret: false,
    xp: 500
  },
  {
    id: 'ice_cold',
    name: 'Ice Cold',
    desc: 'Complete all winter/ice levels.',
    icon: '❄️',
    category: 'maps',
    condition: { type: 'ice_levels_done', value: 1 },
    reward: { coins: 1100, gems: 5 },
    secret: false,
    xp: 500
  },
  {
    id: 'on_fire',
    name: 'On Fire',
    desc: 'Complete 5 levels in a row without restarting.',
    icon: '🔥',
    category: 'special',
    condition: { type: 'levels_no_restart_streak', value: 5 },
    reward: { coins: 800, gems: 4 },
    secret: false,
    xp: 450
  },
  {
    id: 'grinding',
    name: 'Grind Master',
    desc: 'Play for a total of 10 hours.',
    icon: '⏰',
    category: 'special',
    condition: { type: 'total_playtime_hours', value: 10 },
    reward: { coins: 1500, gems: 6 },
    secret: false,
    xp: 600
  },
  {
    id: 'zen_driver',
    name: 'Zen Driver',
    desc: 'Complete a level without using turbo at all.',
    icon: '🧘',
    category: 'special',
    condition: { type: 'level_no_turbo', value: 1 },
    reward: { coins: 400, gems: 2 },
    secret: true,
    xp: 250
  },
  {
    id: 'daredevil',
    name: 'Daredevil',
    desc: 'Get airborne for a continuous 5 seconds.',
    icon: '🦅',
    category: 'flips',
    condition: { type: 'airborne_seconds', value: 5 },
    reward: { coins: 700, gems: 3 },
    secret: false,
    xp: 400
  },
  {
    id: 'mechanic',
    name: 'Master Mechanic',
    desc: 'Fully upgrade any one vehicle.',
    icon: '🔧',
    category: 'vehicles',
    condition: { type: 'vehicle_fully_upgraded', value: 1 },
    reward: { coins: 1000, gems: 5 },
    secret: false,
    xp: 500
  },
  {
    id: 'team_player',
    name: 'Team Player',
    desc: 'Join a team and participate in a team event.',
    icon: '🤝',
    category: 'social',
    condition: { type: 'team_event_participated', value: 1 },
    reward: { coins: 500, gems: 2 },
    secret: false,
    xp: 300
  },
  {
    id: 'first_blood',
    name: 'First Blood',
    desc: 'Crash for the very first time.',
    icon: '💥',
    category: 'special',
    condition: { type: 'first_crash', value: 1 },
    reward: { coins: 100, gems: 0 },
    secret: true,
    xp: 50
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    desc: 'Win a race after being in last place at the halfway point.',
    icon: '🔄',
    category: 'cups',
    condition: { type: 'comeback_win', value: 1 },
    reward: { coins: 900, gems: 4 },
    secret: true,
    xp: 500
  },
  {
    id: 'sky_high',
    name: 'Sky High',
    desc: 'Spend a cumulative total of 60 seconds airborne.',
    icon: '☁️',
    category: 'flips',
    condition: { type: 'total_airborne_seconds', value: 60 },
    reward: { coins: 700, gems: 3 },
    secret: false,
    xp: 400
  },
  {
    id: 'speed_runner',
    name: 'Speed Runner',
    desc: 'Complete a level in under 30 seconds.',
    icon: '🏎️',
    category: 'speed',
    condition: { type: 'level_time_seconds_max', value: 30 },
    reward: { coins: 800, gems: 4 },
    secret: false,
    xp: 450
  },
  {
    id: 'rich_racer',
    name: 'Rich Racer',
    desc: 'Have 50,000 coins at the same time.',
    icon: '💎',
    category: 'coins',
    condition: { type: 'simultaneous_coins', value: 50000 },
    reward: { coins: 5000, gems: 15 },
    secret: false,
    xp: 1000
  },
  {
    id: 'legend',
    name: 'Living Legend',
    desc: 'Unlock every single non-secret achievement.',
    icon: '🌟',
    category: 'special',
    condition: { type: 'all_non_secret_unlocked', value: 1 },
    reward: { coins: 10000, gems: 50 },
    secret: false,
    xp: 5000
  },
  {
    id: 'dedication',
    name: 'Dedicated',
    desc: 'Log in 30 days in a row.',
    icon: '📅',
    category: 'social',
    condition: { type: 'login_streak_days', value: 30 },
    reward: { coins: 3000, gems: 12 },
    secret: false,
    xp: 900
  },
  {
    id: 'whale',
    name: 'Whale',
    desc: 'Purchase gems 10 times.',
    icon: '🐋',
    category: 'coins',
    condition: { type: 'gem_purchases', value: 10 },
    secret: true,
    reward: { coins: 2000, gems: 20 },
    xp: 1000
  },
  {
    id: 'demolition_derby',
    name: 'Demolition Derby',
    desc: 'Crash 500 times in total.',
    icon: '🚨',
    category: 'special',
    condition: { type: 'total_crashes', value: 500 },
    reward: { coins: 1000, gems: 4 },
    secret: false,
    xp: 500
  },
  {
    id: 'mountain_goat',
    name: 'Mountain Goat',
    desc: 'Climb a total vertical distance of 5000 meters.',
    icon: '🐐',
    category: 'distance',
    condition: { type: 'total_vertical_m', value: 5000 },
    reward: { coins: 1200, gems: 5 },
    secret: false,
    xp: 550
  },
  {
    id: 'rolling_thunder',
    name: 'Rolling Thunder',
    desc: 'Complete 10 levels using only the Monster Truck.',
    icon: '🚛',
    category: 'vehicles',
    condition: { type: 'levels_with_vehicle', vehicleId: 'monster_truck', value: 10 },
    reward: { coins: 900, gems: 4 },
    secret: false,
    xp: 450
  },
  {
    id: 'dragster',
    name: 'Dragster',
    desc: 'Maintain top speed for 10 consecutive seconds.',
    icon: '🏁',
    category: 'speed',
    condition: { type: 'top_speed_sustained_seconds', value: 10 },
    reward: { coins: 750, gems: 3 },
    secret: false,
    xp: 400
  },
  {
    id: 'loop_master',
    name: 'Loop Master',
    desc: 'Complete 50 loops across all runs.',
    icon: '⭕',
    category: 'flips',
    condition: { type: 'total_loops', value: 50 },
    reward: { coins: 800, gems: 4 },
    secret: false,
    xp: 450
  },
  {
    id: 'across_the_world',
    name: 'Across the World',
    desc: 'Play a run in every single available world.',
    icon: '🌐',
    category: 'maps',
    condition: { type: 'worlds_played', value: 'all' },
    reward: { coins: 2500, gems: 10 },
    secret: false,
    xp: 800
  },
  {
    id: 'trophy_hunter',
    name: 'Trophy Hunter',
    desc: 'Earn 5 trophies from the trophy room.',
    icon: '🦁',
    category: 'cups',
    condition: { type: 'trophies_earned', value: 5 },
    reward: { coins: 1500, gems: 7 },
    secret: false,
    xp: 650
  },
  {
    id: 'xp_addict',
    name: 'XP Addict',
    desc: 'Reach XP Level 50.',
    icon: '📈',
    category: 'special',
    condition: { type: 'xp_level', value: 50 },
    reward: { coins: 5000, gems: 20 },
    secret: false,
    xp: 2000
  },
  {
    id: 'photo_finish',
    name: 'Photo Finish',
    desc: 'Win a race by less than 0.1 seconds.',
    icon: '📷',
    category: 'cups',
    condition: { type: 'win_margin_seconds_max', value: 0.1 },
    reward: { coins: 800, gems: 4 },
    secret: true,
    xp: 500
  },
  {
    id: 'secret_passage',
    name: 'Secret Passage',
    desc: 'Find and use a hidden shortcut in any level.',
    icon: '🚪',
    category: 'secret',
    condition: { type: 'shortcuts_used', value: 1 },
    reward: { coins: 600, gems: 3 },
    secret: true,
    xp: 400
  },
  {
    id: 'coin_rain',
    name: 'Coin Rain',
    desc: 'Collect 500 coins in a single run.',
    icon: '🌧️',
    category: 'coins',
    condition: { type: 'coins_in_run', value: 500 },
    reward: { coins: 600, gems: 2 },
    secret: false,
    xp: 350
  },
  {
    id: 'extreme_sports',
    name: 'Extreme Sports',
    desc: 'Perform a backflip, frontflip, and barrel roll in one run.',
    icon: '🏋️',
    category: 'flips',
    condition: { type: 'all_flip_types_in_run', value: 1 },
    reward: { coins: 700, gems: 3 },
    secret: false,
    xp: 400
  },
  {
    id: 'invincible',
    name: 'Invincible',
    desc: 'Complete 3 levels in a row without taking any damage.',
    icon: '🛡️',
    category: 'special',
    condition: { type: 'no_damage_level_streak', value: 3 },
    reward: { coins: 1000, gems: 5 },
    secret: false,
    xp: 550
  },
  {
    id: 'zen_master',
    name: 'Zen Master',
    desc: 'Unlock all secret achievements.',
    icon: '☯️',
    category: 'secret',
    condition: { type: 'all_secrets_unlocked', value: 1 },
    reward: { coins: 8000, gems: 30 },
    secret: true,
    xp: 3000
  }
];

// ============================================================
// ACHIEVEMENT_TRACKER
// ============================================================
const ACHIEVEMENT_TRACKER = {
  eventHistory: [],
  counters: {},

  EVENT_TYPES: {
    DISTANCE_TRAVELED:        'DISTANCE_TRAVELED',
    COIN_COLLECTED:           'COIN_COLLECTED',
    FLIP_PERFORMED:           'FLIP_PERFORMED',
    BACKFLIP_PERFORMED:       'BACKFLIP_PERFORMED',
    FRONTFLIP_PERFORMED:      'FRONTFLIP_PERFORMED',
    BARREL_ROLL_PERFORMED:    'BARREL_ROLL_PERFORMED',
    CRASH_OCCURRED:           'CRASH_OCCURRED',
    LEVEL_COMPLETED:          'LEVEL_COMPLETED',
    LEVEL_RESTARTED:          'LEVEL_RESTARTED',
    SPEED_RECORDED:           'SPEED_RECORDED',
    ALTITUDE_RECORDED:        'ALTITUDE_RECORDED',
    AIRBORNE_TIME:            'AIRBORNE_TIME',
    VEHICLE_UNLOCKED:         'VEHICLE_UNLOCKED',
    VEHICLE_UPGRADED:         'VEHICLE_UPGRADED',
    VEHICLE_FULLY_UPGRADED:   'VEHICLE_FULLY_UPGRADED',
    CUP_WON:                  'CUP_WON',
    RACE_WON:                 'RACE_WON',
    RACE_LOST:                'RACE_LOST',
    TURBO_USED:               'TURBO_USED',
    FUEL_LEVEL_RECORDED:      'FUEL_LEVEL_RECORDED',
    GHOST_BEATEN:             'GHOST_BEATEN',
    REPLAY_SHARED:            'REPLAY_SHARED',
    TEAM_EVENT_JOINED:        'TEAM_EVENT_JOINED',
    LOGIN_STREAK:             'LOGIN_STREAK',
    PLAYTIME_SECONDS:         'PLAYTIME_SECONDS',
    GEM_PURCHASED:            'GEM_PURCHASED',
    SHORTCUT_USED:            'SHORTCUT_USED',
    LOOP_COMPLETED:           'LOOP_COMPLETED',
    WORLD_ENTERED:            'WORLD_ENTERED',
    WORLD_COMPLETED:          'WORLD_COMPLETED',
    STUNT_PERFORMED:          'STUNT_PERFORMED',
    COMBO_MULTIPLIER:         'COMBO_MULTIPLIER',
    FIRE_OBSTACLE_HIT:        'FIRE_OBSTACLE_HIT',
    PERFECT_LANDING:          'PERFECT_LANDING',
    VERTICAL_DISTANCE:        'VERTICAL_DISTANCE',
    COMEBACK_WIN:             'COMEBACK_WIN',
    PHOTO_FINISH_WIN:         'PHOTO_FINISH_WIN',
    TROPHY_EARNED:            'TROPHY_EARNED',
    XP_GAINED:                'XP_GAINED',
    ACHIEVEMENT_UNLOCKED:     'ACHIEVEMENT_UNLOCKED',
    SESSION_STARTED:          'SESSION_STARTED',
    SESSION_ENDED:            'SESSION_ENDED',
    CAVE_LEVEL_DONE:          'CAVE_LEVEL_DONE',
    ICE_LEVEL_DONE:           'ICE_LEVEL_DONE',
    NO_DAMAGE_LEVEL:          'NO_DAMAGE_LEVEL',
    UNDERWATER_NO_FUEL_LOSS:  'UNDERWATER_NO_FUEL_LOSS',
    TOP_SPEED_SUSTAINED:      'TOP_SPEED_SUSTAINED',
    COINS_IN_RUN:             'COINS_IN_RUN',
    ALL_FLIP_TYPES_IN_RUN:    'ALL_FLIP_TYPES_IN_RUN',
    FIRST_CRASH:              'FIRST_CRASH'
  },

  trackEvent: function(eventType, value, context) {
    var entry = {
      type: eventType,
      value: value,
      context: context || {},
      timestamp: Date.now()
    };
    this.eventHistory.push(entry);
    // Keep history manageable
    if (this.eventHistory.length > 2000) {
      this.eventHistory.splice(0, 500);
    }

    // Update counters
    if (!this.counters[eventType]) {
      this.counters[eventType] = { total: 0, max: 0, count: 0 };
    }
    var c = this.counters[eventType];
    c.total += (typeof value === 'number' ? value : 1);
    c.count += 1;
    if (typeof value === 'number' && value > c.max) c.max = value;

    // Check all EXTRA_ACHIEVEMENTS for unlock
    var tracker = this;
    if (typeof EXTRA_ACHIEVEMENTS !== 'undefined') {
      EXTRA_ACHIEVEMENTS.forEach(function(ach) {
        if (!ach._unlocked) {
          var prog = tracker.getProgress(ach.id);
          if (prog >= 100) {
            ach._unlocked = true;
            ach._unlockedAt = Date.now();
            tracker.trackEvent(tracker.EVENT_TYPES.ACHIEVEMENT_UNLOCKED, 1, { achievementId: ach.id });
          }
        }
      });
    }
  },

  getProgress: function(achievementId) {
    var ach = null;
    if (typeof EXTRA_ACHIEVEMENTS !== 'undefined') {
      for (var i = 0; i < EXTRA_ACHIEVEMENTS.length; i++) {
        if (EXTRA_ACHIEVEMENTS[i].id === achievementId) { ach = EXTRA_ACHIEVEMENTS[i]; break; }
      }
    }
    if (!ach) return 0;
    if (ach._unlocked) return 100;
    var cond = ach.condition;
    if (!cond || !cond.type) return 0;

    var c = this.counters;
    var val = 0;
    switch (cond.type) {
      case 'total_flips':
        val = (c['FLIP_PERFORMED'] && c['FLIP_PERFORMED'].total) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'total_coins':
        val = (c['COIN_COLLECTED'] && c['COIN_COLLECTED'].total) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'total_crashes':
        val = (c['CRASH_OCCURRED'] && c['CRASH_OCCURRED'].count) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'total_stunts':
        val = (c['STUNT_PERFORMED'] && c['STUNT_PERFORMED'].count) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'max_speed_kmh':
        val = (c['SPEED_RECORDED'] && c['SPEED_RECORDED'].max) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'max_altitude':
        val = (c['ALTITUDE_RECORDED'] && c['ALTITUDE_RECORDED'].max) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'total_distance_m':
        val = (c['DISTANCE_TRAVELED'] && c['DISTANCE_TRAVELED'].total) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'cups_won':
        val = (c['CUP_WON'] && c['CUP_WON'].count) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'vehicles_unlocked':
        val = (c['VEHICLE_UNLOCKED'] && c['VEHICLE_UNLOCKED'].count) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'ghost_times_beaten':
        val = (c['GHOST_BEATEN'] && c['GHOST_BEATEN'].count) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'max_combo':
        val = (c['COMBO_MULTIPLIER'] && c['COMBO_MULTIPLIER'].max) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'total_loops':
        val = (c['LOOP_COMPLETED'] && c['LOOP_COMPLETED'].count) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'replays_shared':
        val = (c['REPLAY_SHARED'] && c['REPLAY_SHARED'].count) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'login_streak_days':
        val = (c['LOGIN_STREAK'] && c['LOGIN_STREAK'].max) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'total_playtime_hours':
        val = ((c['PLAYTIME_SECONDS'] && c['PLAYTIME_SECONDS'].total) || 0) / 3600;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'gem_purchases':
        val = (c['GEM_PURCHASED'] && c['GEM_PURCHASED'].count) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'trophies_earned':
        val = (c['TROPHY_EARNED'] && c['TROPHY_EARNED'].count) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'fire_obstacles_hit':
        val = (c['FIRE_OBSTACLE_HIT'] && c['FIRE_OBSTACLE_HIT'].count) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'total_airborne_seconds':
        val = (c['AIRBORNE_TIME'] && c['AIRBORNE_TIME'].total) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      case 'coins_in_run':
        val = (c['COINS_IN_RUN'] && c['COINS_IN_RUN'].max) || 0;
        return Math.min(100, Math.floor((val / cond.value) * 100));
      default:
        return 0;
    }
  },

  getNearCompletion: function(threshold) {
    if (threshold === undefined) threshold = 80;
    var tracker = this;
    var result = [];
    if (typeof EXTRA_ACHIEVEMENTS === 'undefined') return result;
    EXTRA_ACHIEVEMENTS.forEach(function(ach) {
      if (ach._unlocked) return;
      var prog = tracker.getProgress(ach.id);
      if (prog >= threshold && prog < 100) {
        result.push({ achievement: ach, progress: prog });
      }
    });
    result.sort(function(a, b) { return b.progress - a.progress; });
    return result;
  }
};

// ============================================================
// ACHIEVEMENT_DISPLAY EXTENSIONS
// ============================================================
const ACHIEVEMENT_DISPLAY = {
  drawAchievementGrid: function(ctx, W, H, filter, page) {
    if (!ctx) return;
    page = page || 0;
    var achievements = (typeof EXTRA_ACHIEVEMENTS !== 'undefined') ? EXTRA_ACHIEVEMENTS : [];
    if (filter && filter !== 'all') {
      achievements = achievements.filter(function(a) { return a.category === filter; });
    }
    var cols = 4;
    var rows = 3;
    var perPage = cols * rows;
    var totalPages = Math.ceil(achievements.length / perPage);
    page = Math.max(0, Math.min(page, totalPages - 1));
    var startIdx = page * perPage;
    var pageAchs = achievements.slice(startIdx, startIdx + perPage);

    var padX = 20, padY = 60;
    var cellW = (W - padX * 2) / cols;
    var cellH = (H - padY * 2 - 40) / rows;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Achievements' + (filter && filter !== 'all' ? ' — ' + filter : ''), W / 2, 36);

    pageAchs.forEach(function(ach, i) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var x = padX + col * cellW;
      var y = padY + row * cellH;
      var isUnlocked = ach._unlocked;
      var catColor = (typeof ACHIEVEMENT_CATEGORIES !== 'undefined' && ACHIEVEMENT_CATEGORIES[ach.category])
        ? ACHIEVEMENT_CATEGORIES[ach.category].color : '#888';

      ctx.fillStyle = isUnlocked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = isUnlocked ? catColor : '#444';
      ctx.lineWidth = isUnlocked ? 2 : 1;
      var rx = x + 4, ry = y + 4, rw = cellW - 8, rh = cellH - 8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, 8);
      else ctx.rect(rx, ry, rw, rh);
      ctx.fill();
      ctx.stroke();

      ctx.font = '26px Arial';
      ctx.textAlign = 'center';
      ctx.globalAlpha = isUnlocked ? 1 : 0.35;
      ctx.fillText(ach.secret && !isUnlocked ? '❓' : ach.icon, x + cellW / 2, y + 34);
      ctx.globalAlpha = 1;

      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = isUnlocked ? '#fff' : '#777';
      ctx.textAlign = 'center';
      var name = ach.secret && !isUnlocked ? '???' : ach.name;
      ctx.fillText(name, x + cellW / 2, y + 52);

      if (isUnlocked) {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#aaa';
        var desc = ach.desc.length > 28 ? ach.desc.substring(0, 25) + '...' : ach.desc;
        ctx.fillText(desc, x + cellW / 2, y + 64);
      } else {
        var prog = (typeof ACHIEVEMENT_TRACKER !== 'undefined') ? ACHIEVEMENT_TRACKER.getProgress(ach.id) : 0;
        if (prog > 0) {
          var bx = rx + 8, by = ry + rh - 16, bw = rw - 16, bh = 8;
          ctx.fillStyle = '#333';
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = catColor;
          ctx.fillRect(bx, by, bw * (prog / 100), bh);
          ctx.fillStyle = '#ccc';
          ctx.font = '9px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(prog + '%', x + cellW / 2, by + 7);
        }
      }
    });

    // Pagination
    ctx.fillStyle = '#aaa';
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText((page + 1) + ' / ' + totalPages, W / 2, H - 8);

    if (page > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('◀', 14, H - 6);
    }
    if (page < totalPages - 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('▶', W - 14, H - 6);
    }
    ctx.restore();
  },

  drawAchievementDetail: function(ctx, W, H, achievement) {
    if (!ctx || !achievement) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, W, H);

    var catColor = (typeof ACHIEVEMENT_CATEGORIES !== 'undefined' && ACHIEVEMENT_CATEGORIES[achievement.category])
      ? ACHIEVEMENT_CATEGORIES[achievement.category].color : '#888';
    var isUnlocked = achievement._unlocked;

    // Header bar
    ctx.fillStyle = catColor;
    ctx.fillRect(0, 0, W, 6);
    ctx.fillRect(0, H - 6, W, 6);

    ctx.font = '52px Arial';
    ctx.textAlign = 'center';
    ctx.globalAlpha = isUnlocked ? 1 : 0.4;
    ctx.fillText(achievement.secret && !isUnlocked ? '🔒' : achievement.icon, W / 2, 80);
    ctx.globalAlpha = 1;

    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(achievement.secret && !isUnlocked ? '???' : achievement.name, W / 2, 110);

    ctx.font = '14px Arial';
    ctx.fillStyle = '#bbb';
    var desc = (achievement.secret && !isUnlocked) ? 'Unlock to reveal this secret achievement.' : achievement.desc;
    var words = desc.split(' ');
    var line = '', lines = [];
    words.forEach(function(w) {
      if ((line + w).length > 34) { lines.push(line.trim()); line = ''; }
      line += w + ' ';
    });
    if (line.trim()) lines.push(line.trim());
    lines.forEach(function(l, i) { ctx.fillText(l, W / 2, 132 + i * 18); });

    var yOff = 132 + lines.length * 18 + 14;

    // Category badge
    ctx.fillStyle = catColor;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    var catLabel = (typeof ACHIEVEMENT_CATEGORIES !== 'undefined' && ACHIEVEMENT_CATEGORIES[achievement.category])
      ? ACHIEVEMENT_CATEGORIES[achievement.category].name : achievement.category;
    ctx.fillText('▶ ' + catLabel.toUpperCase(), W / 2, yOff);
    yOff += 20;

    // XP reward
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('+ ' + achievement.xp + ' XP', W / 2, yOff);
    yOff += 20;

    // Coins/Gems reward
    if (achievement.reward) {
      ctx.fillStyle = '#fff';
      ctx.font = '13px Arial';
      var rewardStr = '';
      if (achievement.reward.coins) rewardStr += '🪙 ' + achievement.reward.coins;
      if (achievement.reward.gems) rewardStr += '  💎 ' + achievement.reward.gems;
      ctx.fillText(rewardStr, W / 2, yOff);
      yOff += 18;
    }

    // Progress
    if (!isUnlocked) {
      var prog = (typeof ACHIEVEMENT_TRACKER !== 'undefined') ? ACHIEVEMENT_TRACKER.getProgress(achievement.id) : 0;
      var bx = W / 2 - 80, by = yOff + 8, bw = 160, bh = 14;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = catColor;
      ctx.fillRect(bx, by, bw * (prog / 100), bh);
      ctx.strokeStyle = '#555';
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(prog + '%', W / 2, by + 11);
    } else {
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('✔ UNLOCKED', W / 2, yOff + 20);
      if (achievement._unlockedAt) {
        ctx.fillStyle = '#888';
        ctx.font = '11px Arial';
        ctx.fillText(new Date(achievement._unlockedAt).toLocaleDateString(), W / 2, yOff + 36);
      }
    }

    ctx.restore();
  },

  drawAchievementProgress: function(ctx, x, y, w, achievement) {
    if (!ctx || !achievement) return;
    ctx.save();
    var prog = (typeof ACHIEVEMENT_TRACKER !== 'undefined') ? ACHIEVEMENT_TRACKER.getProgress(achievement.id) : 0;
    if (achievement._unlocked) prog = 100;
    var h = 32;
    var catColor = (typeof ACHIEVEMENT_CATEGORIES !== 'undefined' && ACHIEVEMENT_CATEGORIES[achievement.category])
      ? ACHIEVEMENT_CATEGORIES[achievement.category].color : '#3498db';

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = catColor;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x, y, w * (prog / 100), h);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(achievement.icon + ' ' + achievement.name, x + 8, y + 14);

    ctx.fillStyle = '#ccc';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(prog + '%', x + w - 8, y + 14);

    if (!achievement._unlocked && prog > 0 && prog < 100) {
      ctx.fillStyle = '#aaa';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(achievement.desc.substring(0, 32) + (achievement.desc.length > 32 ? '…' : ''), x + 8, y + 26);
    } else if (achievement._unlocked) {
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('✔ Completed', x + 8, y + 26);
    }

    ctx.restore();
  },

  drawSecretAchievement: function(ctx, x, y, w, h) {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = 'rgba(50,50,50,0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#607d8b';
    ctx.font = (h * 0.45) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', x + w / 2, y + h * 0.58);

    ctx.fillStyle = '#888';
    ctx.font = 'bold ' + Math.floor(h * 0.22) + 'px Arial';
    ctx.fillText('???', x + w / 2, y + h * 0.88);
    ctx.restore();
  }
};

// ============================================================
// MILESTONE_SYSTEM
// ============================================================
const MILESTONE_SYSTEM = {
  MILESTONES: [
    { id: 'ms_100m',   distance: 100,      label: '100 Meters',   icon: '🐣', reward: { coins: 50,   xp: 20  } },
    { id: 'ms_500m',   distance: 500,      label: '500 Meters',   icon: '🚗', reward: { coins: 100,  xp: 40  } },
    { id: 'ms_1km',    distance: 1000,     label: '1 Kilometer',  icon: '🏁', reward: { coins: 200,  xp: 75  } },
    { id: 'ms_2km',    distance: 2000,     label: '2 Kilometers', icon: '🌄', reward: { coins: 300,  xp: 100 } },
    { id: 'ms_5km',    distance: 5000,     label: '5 Kilometers', icon: '🏔️', reward: { coins: 500,  xp: 150 } },
    { id: 'ms_10km',   distance: 10000,    label: '10 Kilometers',icon: '🌍', reward: { coins: 800,  xp: 250 } },
    { id: 'ms_25km',   distance: 25000,    label: '25 Kilometers',icon: '🚀', reward: { coins: 1500, xp: 400 } },
    { id: 'ms_50km',   distance: 50000,    label: '50 Kilometers',icon: '⭐', reward: { coins: 2500, xp: 600 } },
    { id: 'ms_100km',  distance: 100000,   label: '100 Kilometers',icon:'🌟', reward: { coins: 5000, xp: 1000} },
    { id: 'ms_250km',  distance: 250000,   label: '250 Kilometers',icon:'💫', reward: { coins: 10000,xp: 2000} },
    { id: 'ms_500km',  distance: 500000,   label: '500 Kilometers',icon:'🏆', reward: { coins: 20000,xp: 4000} },
    { id: 'ms_1000km', distance: 1000000,  label: '1000 Km',      icon: '👑', reward: { coins: 50000,xp: 8000} },
    { id: 'ms_marathon', distance: 42195,  label: 'Marathon!',    icon: '🏃', reward: { coins: 2000, xp: 500 } },
    { id: 'ms_half_marathon', distance: 21097, label: 'Half Marathon', icon: '🏃', reward: { coins: 1000, xp: 250 } },
    { id: 'ms_ultramarathon', distance: 160934, label: 'Ultra Marathon', icon: '🦸', reward: { coins: 15000, xp: 3000 } },
    { id: 'ms_moon_dist', distance: 384400000, label: 'Moon Distance', icon: '🌙', reward: { coins: 999999, xp: 99999 } },
    { id: 'ms_lap',    distance: 400,      label: 'One Lap',      icon: '🔄', reward: { coins: 80,   xp: 30  } },
    { id: 'ms_mile',   distance: 1609,     label: '1 Mile',       icon: '🚩', reward: { coins: 220,  xp: 80  } },
    { id: 'ms_10miles',distance: 16093,    label: '10 Miles',     icon: '🗺️', reward: { coins: 1200, xp: 300 } },
    { id: 'ms_100miles',distance: 160934,  label: '100 Miles',    icon: '🎖️', reward: { coins: 12000,xp: 2500} }
  ],

  _reached: {},

  checkMilestone: function(distanceMeters) {
    var triggered = [];
    var sys = this;
    this.MILESTONES.forEach(function(ms) {
      if (!sys._reached[ms.id] && distanceMeters >= ms.distance) {
        sys._reached[ms.id] = true;
        triggered.push(ms);
        if (typeof ACHIEVEMENT_TRACKER !== 'undefined') {
          ACHIEVEMENT_TRACKER.trackEvent('DISTANCE_TRAVELED', distanceMeters, { milestone: ms.id });
        }
      }
    });
    return triggered;
  },

  getMilestoneReward: function(milestone) {
    if (!milestone) return null;
    var ms = milestone;
    if (typeof milestone === 'string') {
      var found = null;
      this.MILESTONES.forEach(function(m) { if (m.id === milestone) found = m; });
      ms = found;
    }
    if (!ms) return null;
    if (typeof XP_SYSTEM !== 'undefined' && ms.reward.xp) {
      XP_SYSTEM.addXP(ms.reward.xp, 'milestone_' + ms.id);
    }
    return ms.reward;
  },

  drawMilestoneUnlock: function(ctx, W, H, milestone, t) {
    if (!ctx || !milestone) return;
    // t: animation progress 0..1
    t = Math.max(0, Math.min(1, t || 0));
    var alpha = t < 0.1 ? t / 0.1 : t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
    var scale = t < 0.1 ? 0.7 + 0.3 * (t / 0.1) : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.translate(-W / 2, -H / 2);

    // Panel
    var pw = 280, ph = 160;
    var px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 16);
    else ctx.rect(px, py, pw, ph);
    ctx.fill();

    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MILESTONE REACHED!', W / 2, py + 28);

    ctx.font = '40px Arial';
    ctx.fillText(milestone.icon, W / 2, py + 72);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(milestone.label, W / 2, py + 100);

    ctx.fillStyle = '#aaa';
    ctx.font = '13px Arial';
    var r = milestone.reward;
    var rStr = '';
    if (r.coins) rStr += '🪙 ' + r.coins + '  ';
    if (r.xp)    rStr += '+' + r.xp + ' XP';
    ctx.fillText(rStr.trim(), W / 2, py + 120);

    ctx.fillStyle = '#888';
    ctx.font = '11px Arial';
    ctx.fillText('Keep going!', W / 2, py + 140);

    ctx.restore();
  }
};

// ============================================================
// XP_SYSTEM
// ============================================================
const XP_SYSTEM = {
  totalXP: 0,
  currentLevel: 1,
  _history: [],

  XP_SOURCES: {
    achievement_unlock:     { amount: 0,    note: 'Varies per achievement' },
    level_complete:         { amount: 50,   note: 'Per level completed' },
    level_perfect:          { amount: 120,  note: 'Three stars on a level' },
    cup_win:                { amount: 200,  note: 'Win a cup' },
    cup_participate:        { amount: 50,   note: 'Participate in a cup' },
    daily_login:            { amount: 30,   note: 'Daily login bonus' },
    login_streak_7:         { amount: 150,  note: '7-day login streak' },
    login_streak_30:        { amount: 700,  note: '30-day login streak' },
    flip_combo_5:           { amount: 25,   note: 'Combo of 5+ flips' },
    flip_combo_10:          { amount: 60,   note: 'Combo of 10+ flips' },
    coin_collect_100:       { amount: 15,   note: 'Collect 100 coins in a run' },
    coin_collect_500:       { amount: 50,   note: 'Collect 500 coins in a run' },
    vehicle_unlock:         { amount: 80,   note: 'Unlock a new vehicle' },
    vehicle_upgrade:        { amount: 20,   note: 'Upgrade a vehicle stat' },
    vehicle_max:            { amount: 250,  note: 'Fully upgrade a vehicle' },
    race_win:               { amount: 100,  note: 'Win a race' },
    ghost_beat:             { amount: 40,   note: 'Beat a ghost time' },
    milestone_reached:      { amount: 0,    note: 'Varies per milestone' },
    share_replay:           { amount: 20,   note: 'Share a replay' },
    team_event:             { amount: 60,   note: 'Complete a team event' },
    first_crash:            { amount: 5,    note: 'First crash ever (learning!)' }
  },

  addXP: function(amount, source) {
    if (typeof amount !== 'number' || amount <= 0) return;
    this.totalXP += amount;
    this._history.push({ amount: amount, source: source || 'unknown', at: Date.now() });
    if (this._history.length > 500) this._history.splice(0, 100);
    var newLevel = this.getLevelFromXP(this.totalXP);
    if (newLevel > this.currentLevel) {
      this.currentLevel = newLevel;
      // Could fire a level-up event here
      if (typeof ACHIEVEMENT_TRACKER !== 'undefined') {
        ACHIEVEMENT_TRACKER.trackEvent('XP_GAINED', amount, { source: source, totalXP: this.totalXP, level: this.currentLevel });
      }
    }
    return this.currentLevel;
  },

  getLevelFromXP: function(xp) {
    var level = 1;
    while (this.getXPForLevel(level + 1) <= xp) { level++; if (level >= 1000) break; }
    return level;
  },

  getXPForLevel: function(level) {
    if (level <= 1) return 0;
    // Exponential curve: base 100, multiplier 1.15 per level
    var total = 0;
    for (var l = 2; l <= level; l++) {
      total += Math.floor(100 * Math.pow(1.15, l - 2));
    }
    return total;
  },

  getXPProgress: function() {
    var curLevelXP = this.getXPForLevel(this.currentLevel);
    var nextLevelXP = this.getXPForLevel(this.currentLevel + 1);
    var span = nextLevelXP - curLevelXP;
    var progress = this.totalXP - curLevelXP;
    return { current: progress, needed: span, pct: span > 0 ? progress / span : 1 };
  },

  drawXPBar: function(ctx, x, y, w, h, current, max) {
    if (!ctx) return;
    current = (typeof current === 'number') ? current : 0;
    max = (typeof max === 'number' && max > 0) ? max : 100;
    var pct = Math.min(1, Math.max(0, current / max));

    ctx.save();
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, h);

    // XP fill gradient
    var grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#8e44ad');
    grad.addColorStop(0.5, '#3498db');
    grad.addColorStop(1, '#1abc9c');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w * pct, h);

    // Border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.floor(h * 0.65) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LVL ' + this.currentLevel, x + w / 2, y + h * 0.75);

    // XP numbers (small, right-aligned)
    ctx.font = Math.floor(h * 0.5) + 'px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(current + '/' + max + ' XP', x + w - 4, y + h * 0.72);

    ctx.restore();
  }
};

// ============================================================
// TROPHY_ROOM
// ============================================================
const TROPHY_ROOM = {
  earnedTrophies: [],

  TROPHIES: [
    {
      id: 'bronze_racer',
      name: 'Bronze Racer',
      tier: 'bronze',
      icon: '🥉',
      color: '#cd7f32',
      desc: 'Complete your first 10 levels.',
      condition: { type: 'levels_completed', value: 10 },
      xp: 100,
      coins: 300
    },
    {
      id: 'silver_racer',
      name: 'Silver Racer',
      tier: 'silver',
      icon: '🥈',
      color: '#c0c0c0',
      desc: 'Complete 50 levels.',
      condition: { type: 'levels_completed', value: 50 },
      xp: 300,
      coins: 800
    },
    {
      id: 'gold_racer',
      name: 'Gold Racer',
      tier: 'gold',
      icon: '🥇',
      color: '#ffd700',
      desc: 'Complete 200 levels.',
      condition: { type: 'levels_completed', value: 200 },
      xp: 800,
      coins: 2000
    },
    {
      id: 'platinum_racer',
      name: 'Platinum Racer',
      tier: 'platinum',
      icon: '🏆',
      color: '#e5e4e2',
      desc: 'Complete 500 levels.',
      condition: { type: 'levels_completed', value: 500 },
      xp: 2000,
      coins: 5000
    },
    {
      id: 'speed_trophy',
      name: 'Speed Trophy',
      tier: 'gold',
      icon: '⚡',
      color: '#ffd700',
      desc: 'Reach 150 km/h.',
      condition: { type: 'max_speed_kmh', value: 150 },
      xp: 500,
      coins: 1200
    },
    {
      id: 'flip_trophy',
      name: 'Acrobat Trophy',
      tier: 'silver',
      icon: '🔄',
      color: '#c0c0c0',
      desc: 'Perform 500 total flips.',
      condition: { type: 'total_flips', value: 500 },
      xp: 400,
      coins: 900
    },
    {
      id: 'coin_trophy',
      name: 'Coin Baron Trophy',
      tier: 'gold',
      icon: '💰',
      color: '#ffd700',
      desc: 'Collect 5,000 coins in total.',
      condition: { type: 'total_coins', value: 5000 },
      xp: 600,
      coins: 1500
    },
    {
      id: 'diamond_trophy',
      name: 'Diamond Trophy',
      tier: 'diamond',
      icon: '💎',
      color: '#b9f2ff',
      desc: 'Unlock 25 achievements.',
      condition: { type: 'achievements_unlocked', value: 25 },
      xp: 3000,
      coins: 8000
    },
    {
      id: 'legendary_trophy',
      name: 'Legendary Trophy',
      tier: 'legendary',
      icon: '🌟',
      color: '#ff6b35',
      desc: 'Reach XP Level 100.',
      condition: { type: 'xp_level', value: 100 },
      xp: 10000,
      coins: 25000
    },
    {
      id: 'ghost_trophy',
      name: 'Ghost Buster Trophy',
      tier: 'silver',
      icon: '👻',
      color: '#c0c0c0',
      desc: 'Beat 20 ghost times.',
      condition: { type: 'ghost_times_beaten', value: 20 },
      xp: 350,
      coins: 750
    }
  ],

  earnTrophy: function(trophyId) {
    var trophy = null;
    for (var i = 0; i < this.TROPHIES.length; i++) {
      if (this.TROPHIES[i].id === trophyId) { trophy = this.TROPHIES[i]; break; }
    }
    if (!trophy) return false;

    for (var j = 0; j < this.earnedTrophies.length; j++) {
      if (this.earnedTrophies[j].id === trophyId) return false; // Already earned
    }

    var earned = Object.assign({}, trophy, { earnedAt: Date.now() });
    this.earnedTrophies.push(earned);

    if (typeof XP_SYSTEM !== 'undefined') {
      XP_SYSTEM.addXP(trophy.xp, 'trophy_' + trophyId);
    }
    if (typeof ACHIEVEMENT_TRACKER !== 'undefined') {
      ACHIEVEMENT_TRACKER.trackEvent('TROPHY_EARNED', 1, { trophyId: trophyId });
    }
    return earned;
  },

  drawTrophyCase: function(ctx, W, H, trophies) {
    if (!ctx) return;
    trophies = trophies || this.earnedTrophies;
    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(10,8,5,0.95)';
    ctx.fillRect(0, 0, W, H);

    // Wooden shelf effect at bottom
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(0, H - 28, W, 28);
    ctx.fillStyle = '#7d5227';
    ctx.fillRect(0, H - 32, W, 4);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏛️ Trophy Room', W / 2, 32);

    if (trophies.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px Arial';
      ctx.fillText('No trophies yet. Keep racing!', W / 2, H / 2);
      ctx.restore();
      return;
    }

    var allTrophies = this.TROPHIES;
    var cols = Math.min(5, allTrophies.length);
    var cellW = (W - 24) / cols;
    var cellH = (H - 80) / Math.ceil(allTrophies.length / cols);

    allTrophies.forEach(function(trophy, idx) {
      var isEarned = false;
      for (var k = 0; k < trophies.length; k++) {
        if (trophies[k].id === trophy.id) { isEarned = true; break; }
      }
      var col = idx % cols;
      var row = Math.floor(idx / cols);
      var x = 12 + col * cellW;
      var y = 50 + row * cellH;

      ctx.globalAlpha = isEarned ? 1 : 0.25;

      // Trophy glow
      if (isEarned) {
        ctx.shadowColor = trophy.color;
        ctx.shadowBlur = 16;
      }

      ctx.font = Math.floor(cellH * 0.45) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(trophy.icon, x + cellW / 2, y + cellH * 0.55);

      ctx.shadowBlur = 0;

      ctx.fillStyle = isEarned ? trophy.color : '#555';
      ctx.font = 'bold ' + Math.floor(cellH * 0.14) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(trophy.name, x + cellW / 2, y + cellH * 0.78);

      if (isEarned) {
        ctx.fillStyle = '#aaa';
        ctx.font = Math.floor(cellH * 0.11) + 'px Arial';
        ctx.fillText(trophy.tier.toUpperCase(), x + cellW / 2, y + cellH * 0.9);
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
    });

    // Earned count
    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(trophies.length + ' / ' + this.TROPHIES.length + ' earned', W / 2, H - 10);

    ctx.restore();
  }
};

// ============================================================
// ACHIEVEMENT_CATALOG_EXTENDED MODULE
// ============================================================
(function() {
  'use strict';

  window.ACHIEVEMENT_CATALOG_EXTENDED = {
    version: '2.0.0',
    totalAchievements: 120,

    achievements: [

      // ==================== SPEED CATEGORY ====================
      {
        id: 'speed_rookie',
        name: 'Speed Rookie',
        description: 'Reach 50 km/h for the first time. Every legend starts somewhere!',
        category: 'speed',
        rarity: 'common',
        xpReward: 50,
        coinReward: 200,
        diamondReward: 0,
        icon: 'icon_speed_bronze',
        condition: { type: 'max_speed', value: 50 },
        progressMax: 50,
        secret: false,
        chainId: 'speed_chain',
        chainStep: 1
      },
      {
        id: 'speed_racer',
        name: 'Speed Racer',
        description: 'Reach 100 km/h. You are starting to feel the rush!',
        category: 'speed',
        rarity: 'common',
        xpReward: 100,
        coinReward: 500,
        diamondReward: 1,
        icon: 'icon_speed_silver',
        condition: { type: 'max_speed', value: 100 },
        progressMax: 100,
        secret: false,
        chainId: 'speed_chain',
        chainStep: 2
      },
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Reach 150 km/h. The world becomes a blur at this velocity.',
        category: 'speed',
        rarity: 'rare',
        xpReward: 250,
        coinReward: 1000,
        diamondReward: 3,
        icon: 'icon_speed_gold',
        condition: { type: 'max_speed', value: 150 },
        progressMax: 150,
        secret: false,
        chainId: 'speed_chain',
        chainStep: 3
      },
      {
        id: 'speed_legend',
        name: 'Speed Legend',
        description: 'Reach 200 km/h. You have transcended mortal driving.',
        category: 'speed',
        rarity: 'epic',
        xpReward: 500,
        coinReward: 3000,
        diamondReward: 10,
        icon: 'icon_speed_platinum',
        condition: { type: 'max_speed', value: 200 },
        progressMax: 200,
        secret: false,
        chainId: 'speed_chain',
        chainStep: 4
      },
      {
        id: 'sonic',
        name: 'Sonic Boom',
        description: 'Maintain 120+ km/h for 10 consecutive seconds. Blink and you will miss it.',
        category: 'speed',
        rarity: 'rare',
        xpReward: 300,
        coinReward: 1500,
        diamondReward: 5,
        icon: 'icon_sonic',
        condition: { type: 'sustained_speed', value: 120, duration: 10 },
        progressMax: 10,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'mach',
        name: 'Mach Driver',
        description: 'Maintain 150+ km/h for 5 consecutive seconds. Pure insanity on wheels.',
        category: 'speed',
        rarity: 'epic',
        xpReward: 450,
        coinReward: 2000,
        diamondReward: 8,
        icon: 'icon_mach',
        condition: { type: 'sustained_speed', value: 150, duration: 5 },
        progressMax: 5,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'nitro_first',
        name: 'Nitro Newbie',
        description: 'Use nitro for the first time. That extra kick feels amazing, right?',
        category: 'speed',
        rarity: 'common',
        xpReward: 30,
        coinReward: 100,
        diamondReward: 0,
        icon: 'icon_nitro_bronze',
        condition: { type: 'nitro_uses', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'nitro_chain',
        chainStep: 1
      },
      {
        id: 'nitro_addict',
        name: 'Nitro Addict',
        description: 'Use nitro 100 times total. You simply cannot help yourself.',
        category: 'speed',
        rarity: 'uncommon',
        xpReward: 200,
        coinReward: 800,
        diamondReward: 2,
        icon: 'icon_nitro_silver',
        condition: { type: 'nitro_uses_total', value: 100 },
        progressMax: 100,
        secret: false,
        chainId: 'nitro_chain',
        chainStep: 2
      },
      {
        id: 'speed_freak',
        name: 'Speed Freak',
        description: 'Travel 10 km in a single run without stopping. Momentum is everything.',
        category: 'speed',
        rarity: 'rare',
        xpReward: 350,
        coinReward: 2000,
        diamondReward: 5,
        icon: 'icon_speed_freak',
        condition: { type: 'single_run_distance', value: 10000 },
        progressMax: 10000,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'hyperdrive',
        name: 'Hyperdrive',
        description: 'Travel 1 km in under 30 seconds. Physics optional.',
        category: 'speed',
        rarity: 'epic',
        xpReward: 500,
        coinReward: 2500,
        diamondReward: 10,
        icon: 'icon_hyperdrive',
        condition: { type: 'distance_time', distance: 1000, maxTime: 30 },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'bullet_train',
        name: 'Bullet Train',
        description: 'Complete 5 consecutive runs each over 5 km. Consistency at its finest.',
        category: 'speed',
        rarity: 'rare',
        xpReward: 400,
        coinReward: 2200,
        diamondReward: 7,
        icon: 'icon_bullet_train',
        condition: { type: 'consecutive_runs_distance', count: 5, minDistance: 5000 },
        progressMax: 5,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'drag_racer',
        name: 'Drag Racer',
        description: 'Complete a quarter mile in under 15 seconds. Old school cool.',
        category: 'speed',
        rarity: 'rare',
        xpReward: 380,
        coinReward: 1800,
        diamondReward: 6,
        icon: 'icon_drag_racer',
        condition: { type: 'quarter_mile_time', maxTime: 15 },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'top_gear',
        name: 'Top Gear',
        description: 'Use all 6 gears in a single run. A true driver knows every gear.',
        category: 'speed',
        rarity: 'uncommon',
        xpReward: 150,
        coinReward: 600,
        diamondReward: 2,
        icon: 'icon_top_gear',
        condition: { type: 'all_gears_used', gears: 6 },
        progressMax: 6,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'afterburner',
        name: 'Afterburner',
        description: 'Use 3 nitros back to back in a single run. Triple the fire, triple the fun.',
        category: 'speed',
        rarity: 'epic',
        xpReward: 480,
        coinReward: 2200,
        diamondReward: 9,
        icon: 'icon_afterburner',
        condition: { type: 'nitro_chain', count: 3 },
        progressMax: 3,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'light_speed',
        name: 'Light Speed',
        description: 'Reach max speed on every map type available. The universe is yours.',
        category: 'speed',
        rarity: 'legendary',
        xpReward: 1000,
        coinReward: 10000,
        diamondReward: 25,
        icon: 'icon_light_speed',
        condition: { type: 'max_speed_all_maps', value: true },
        progressMax: 10,
        secret: false,
        chainId: null,
        chainStep: 0
      },

      // ==================== TRICK CATEGORY ====================
      {
        id: 'first_flip',
        name: 'First Flip',
        description: 'Complete a backflip. You spun all the way around and survived!',
        category: 'trick',
        rarity: 'common',
        xpReward: 60,
        coinReward: 250,
        diamondReward: 0,
        icon: 'icon_flip_bronze',
        condition: { type: 'backflips', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'flip_chain',
        chainStep: 1
      },
      {
        id: 'double_flip',
        name: 'Double Trouble',
        description: 'Complete a double backflip in a single jump. Madness in the air.',
        category: 'trick',
        rarity: 'uncommon',
        xpReward: 180,
        coinReward: 750,
        diamondReward: 2,
        icon: 'icon_flip_silver',
        condition: { type: 'double_backflip', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'flip_chain',
        chainStep: 2
      },
      {
        id: 'triple_flip',
        name: 'Triple Threat',
        description: 'Complete a triple backflip in a single jump. Absolute insanity.',
        category: 'trick',
        rarity: 'epic',
        xpReward: 500,
        coinReward: 3000,
        diamondReward: 12,
        icon: 'icon_flip_gold',
        condition: { type: 'triple_backflip', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'flip_chain',
        chainStep: 3
      },
      {
        id: 'first_wheelie',
        name: 'Wheelie Beginner',
        description: 'Maintain a wheelie for 2 seconds. Balance is key.',
        category: 'trick',
        rarity: 'common',
        xpReward: 70,
        coinReward: 300,
        diamondReward: 0,
        icon: 'icon_wheelie_bronze',
        condition: { type: 'wheelie_duration', value: 2 },
        progressMax: 2,
        secret: false,
        chainId: 'wheelie_chain',
        chainStep: 1
      },
      {
        id: 'wheelie_king',
        name: 'Wheelie King',
        description: 'Maintain a wheelie for 10 seconds. Pure mastery of balance.',
        category: 'trick',
        rarity: 'rare',
        xpReward: 350,
        coinReward: 1800,
        diamondReward: 6,
        icon: 'icon_wheelie_gold',
        condition: { type: 'wheelie_duration', value: 10 },
        progressMax: 10,
        secret: false,
        chainId: 'wheelie_chain',
        chainStep: 2
      },
      {
        id: 'endo_master',
        name: 'Endo Master',
        description: 'Hold an endo (front wheelie) for 3 seconds. Advanced skill unlocked.',
        category: 'trick',
        rarity: 'rare',
        xpReward: 320,
        coinReward: 1600,
        diamondReward: 5,
        icon: 'icon_endo',
        condition: { type: 'endo_duration', value: 3 },
        progressMax: 3,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'air_time_1s',
        name: 'Air Born',
        description: 'Get 1 second of continuous air time. The ground is overrated.',
        category: 'trick',
        rarity: 'common',
        xpReward: 80,
        coinReward: 300,
        diamondReward: 0,
        icon: 'icon_air_bronze',
        condition: { type: 'air_time', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'air_chain',
        chainStep: 1
      },
      {
        id: 'air_time_5s',
        name: 'Long Haul Flyer',
        description: 'Get 5 seconds of continuous air time on a massive jump.',
        category: 'trick',
        rarity: 'epic',
        xpReward: 450,
        coinReward: 2500,
        diamondReward: 10,
        icon: 'icon_air_gold',
        condition: { type: 'air_time', value: 5 },
        progressMax: 5,
        secret: false,
        chainId: 'air_chain',
        chainStep: 2
      },
      {
        id: 'trick_combo_3',
        name: 'Combo Starter',
        description: 'Chain 3 tricks without touching the ground. Flow state activated.',
        category: 'trick',
        rarity: 'uncommon',
        xpReward: 200,
        coinReward: 900,
        diamondReward: 3,
        icon: 'icon_combo_bronze',
        condition: { type: 'trick_combo', value: 3 },
        progressMax: 3,
        secret: false,
        chainId: 'combo_chain',
        chainStep: 1
      },
      {
        id: 'trick_combo_5',
        name: 'Combo Artist',
        description: 'Chain 5 tricks without touching the ground. You make it look easy.',
        category: 'trick',
        rarity: 'rare',
        xpReward: 400,
        coinReward: 2000,
        diamondReward: 7,
        icon: 'icon_combo_silver',
        condition: { type: 'trick_combo', value: 5 },
        progressMax: 5,
        secret: false,
        chainId: 'combo_chain',
        chainStep: 2
      },
      {
        id: 'trick_combo_10',
        name: 'Combo Legend',
        description: 'Chain 10 tricks without touching the ground. A legendary display of skill.',
        category: 'trick',
        rarity: 'legendary',
        xpReward: 1000,
        coinReward: 8000,
        diamondReward: 20,
        icon: 'icon_combo_legendary',
        condition: { type: 'trick_combo', value: 10 },
        progressMax: 10,
        secret: false,
        chainId: 'combo_chain',
        chainStep: 3
      },
      {
        id: 'perfect_landing',
        name: 'Perfect Landing',
        description: 'Land with less than 5 degrees of error after a flip. Surgical precision.',
        category: 'trick',
        rarity: 'rare',
        xpReward: 380,
        coinReward: 1700,
        diamondReward: 6,
        icon: 'icon_perfect_landing',
        condition: { type: 'landing_angle_error', maxAngle: 5, afterFlip: true },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'superman',
        name: 'Superman',
        description: 'Hold full forward lean in the air for 2 seconds. Flying without a cape.',
        category: 'trick',
        rarity: 'rare',
        xpReward: 340,
        coinReward: 1600,
        diamondReward: 5,
        icon: 'icon_superman',
        condition: { type: 'forward_lean_air', duration: 2 },
        progressMax: 2,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'inverted',
        name: 'Inverted',
        description: 'Stay upside down in a controlled manner for 1 second. Defy gravity.',
        category: 'trick',
        rarity: 'epic',
        xpReward: 460,
        coinReward: 2300,
        diamondReward: 9,
        icon: 'icon_inverted',
        condition: { type: 'upside_down_duration', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'stunt_driver',
        name: 'Stunt Driver',
        description: 'Perform all available trick types in a single run. The full repertoire.',
        category: 'trick',
        rarity: 'epic',
        xpReward: 550,
        coinReward: 3500,
        diamondReward: 12,
        icon: 'icon_stunt_driver',
        condition: { type: 'all_trick_types', value: true },
        progressMax: 6,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'trick_master',
        name: 'Trick Master',
        description: 'Perform 1000 total tricks across all your runs. A lifetime of stunts.',
        category: 'trick',
        rarity: 'rare',
        xpReward: 600,
        coinReward: 4000,
        diamondReward: 15,
        icon: 'icon_trick_master',
        condition: { type: 'total_tricks', value: 1000 },
        progressMax: 1000,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'daily_tricks',
        name: 'Daily Dose of Crazy',
        description: 'Perform 50 tricks in a single day. Never a dull moment.',
        category: 'trick',
        rarity: 'uncommon',
        xpReward: 220,
        coinReward: 1000,
        diamondReward: 3,
        icon: 'icon_daily_tricks',
        condition: { type: 'tricks_in_day', value: 50 },
        progressMax: 50,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'style_points',
        name: 'Style Points',
        description: 'Earn 10,000 trick score in one combo without touching the ground.',
        category: 'trick',
        rarity: 'epic',
        xpReward: 520,
        coinReward: 3000,
        diamondReward: 11,
        icon: 'icon_style_points',
        condition: { type: 'trick_score_combo', value: 10000 },
        progressMax: 10000,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'trick_10k',
        name: 'Trick Veteran',
        description: 'Earn 10,000 total trick score across all runs. Every trick counts.',
        category: 'trick',
        rarity: 'uncommon',
        xpReward: 280,
        coinReward: 1200,
        diamondReward: 4,
        icon: 'icon_trick_10k',
        condition: { type: 'total_trick_score', value: 10000 },
        progressMax: 10000,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'grand_performance',
        name: 'Grand Performance',
        description: 'Do 5 flips AND 3 wheelies all within a single run. Showtime!',
        category: 'trick',
        rarity: 'epic',
        xpReward: 600,
        coinReward: 4000,
        diamondReward: 14,
        icon: 'icon_grand_performance',
        condition: { type: 'multi', conditions: [{ type: 'backflips_in_run', value: 5 }, { type: 'wheelies_in_run', value: 3 }] },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },

      // ==================== DISTANCE CATEGORY ====================
      {
        id: 'first_100m',
        name: 'First Steps',
        description: 'Travel 100 meters. Every journey begins with the first turn of the wheel.',
        category: 'distance',
        rarity: 'common',
        xpReward: 20,
        coinReward: 50,
        diamondReward: 0,
        icon: 'icon_dist_bronze',
        condition: { type: 'single_run_distance', value: 100 },
        progressMax: 100,
        secret: false,
        chainId: 'distance_chain',
        chainStep: 1
      },
      {
        id: 'first_1km',
        name: 'Kilometer Club',
        description: 'Travel 1 km in a single run. You are just getting started.',
        category: 'distance',
        rarity: 'common',
        xpReward: 60,
        coinReward: 200,
        diamondReward: 0,
        icon: 'icon_dist_silver',
        condition: { type: 'single_run_distance', value: 1000 },
        progressMax: 1000,
        secret: false,
        chainId: 'distance_chain',
        chainStep: 2
      },
      {
        id: 'marathon',
        name: 'Marathon Runner',
        description: 'Travel a total of 42 km across all your runs. The classic distance.',
        category: 'distance',
        rarity: 'uncommon',
        xpReward: 220,
        coinReward: 1000,
        diamondReward: 3,
        icon: 'icon_marathon',
        condition: { type: 'total_distance', value: 42000 },
        progressMax: 42000,
        secret: false,
        chainId: 'distance_total_chain',
        chainStep: 1
      },
      {
        id: 'globetrotter',
        name: 'Globetrotter',
        description: 'Travel a total of 1,000 km across all your runs. You have seen it all.',
        category: 'distance',
        rarity: 'legendary',
        xpReward: 1000,
        coinReward: 12000,
        diamondReward: 30,
        icon: 'icon_globe',
        condition: { type: 'total_distance', value: 1000000 },
        progressMax: 1000000,
        secret: false,
        chainId: 'distance_total_chain',
        chainStep: 2
      },
      {
        id: 'world_tour',
        name: 'World Tour',
        description: 'Travel at least 100 km on every different map in the game.',
        category: 'distance',
        rarity: 'legendary',
        xpReward: 1200,
        coinReward: 15000,
        diamondReward: 35,
        icon: 'icon_world_tour',
        condition: { type: 'distance_per_map', value: 100000 },
        progressMax: 100,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'explorer',
        name: 'Explorer',
        description: 'Play on 10 different maps. Variety is the spice of life.',
        category: 'distance',
        rarity: 'uncommon',
        xpReward: 200,
        coinReward: 900,
        diamondReward: 3,
        icon: 'icon_explorer',
        condition: { type: 'unique_maps_played', value: 10 },
        progressMax: 10,
        secret: false,
        chainId: 'map_chain',
        chainStep: 1
      },
      {
        id: 'all_maps',
        name: 'Map Completionist',
        description: 'Play on every single map available in the game. The ultimate explorer.',
        category: 'distance',
        rarity: 'epic',
        xpReward: 700,
        coinReward: 6000,
        diamondReward: 18,
        icon: 'icon_all_maps',
        condition: { type: 'all_maps_played', value: true },
        progressMax: 20,
        secret: false,
        chainId: 'map_chain',
        chainStep: 2
      },
      {
        id: 'survivor',
        name: 'Survivor',
        description: 'Complete a full run on a hard difficulty map without crashing. Nerves of steel.',
        category: 'distance',
        rarity: 'rare',
        xpReward: 400,
        coinReward: 2000,
        diamondReward: 7,
        icon: 'icon_survivor',
        condition: { type: 'no_crash_hard_map', value: true },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'ironman',
        name: 'Ironman',
        description: 'Finish 10 consecutive runs without a single game over. Unbreakable.',
        category: 'distance',
        rarity: 'epic',
        xpReward: 600,
        coinReward: 4000,
        diamondReward: 14,
        icon: 'icon_ironman',
        condition: { type: 'consecutive_runs_no_game_over', value: 10 },
        progressMax: 10,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'stamina',
        name: 'Stamina King',
        description: 'Complete a single run over 20 km. A true endurance athlete.',
        category: 'distance',
        rarity: 'epic',
        xpReward: 650,
        coinReward: 5000,
        diamondReward: 16,
        icon: 'icon_stamina',
        condition: { type: 'single_run_distance', value: 20000 },
        progressMax: 20000,
        secret: false,
        chainId: 'distance_chain',
        chainStep: 3
      },
      {
        id: 'cross_country',
        name: 'Cross Country',
        description: 'Travel 100 km in a single gaming session. Dedication personified.',
        category: 'distance',
        rarity: 'rare',
        xpReward: 500,
        coinReward: 3500,
        diamondReward: 10,
        icon: 'icon_cross_country',
        condition: { type: 'session_distance', value: 100000 },
        progressMax: 100000,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'night_rider',
        name: 'Night Rider',
        description: 'Travel during night time conditions. The darkness holds no fear for you.',
        category: 'distance',
        rarity: 'uncommon',
        xpReward: 170,
        coinReward: 700,
        diamondReward: 2,
        icon: 'icon_night_rider',
        condition: { type: 'night_time_distance', value: 5000 },
        progressMax: 5000,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'off_roader',
        name: 'Off Roader',
        description: 'Travel 10 km total on dirt and gravel surfaces. Get muddy!',
        category: 'distance',
        rarity: 'uncommon',
        xpReward: 190,
        coinReward: 850,
        diamondReward: 2,
        icon: 'icon_off_roader',
        condition: { type: 'surface_distance', surface: 'dirt', value: 10000 },
        progressMax: 10000,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'urban_legend',
        name: 'Urban Legend',
        description: 'Travel 10 km total on city maps. You own these streets.',
        category: 'distance',
        rarity: 'uncommon',
        xpReward: 190,
        coinReward: 850,
        diamondReward: 2,
        icon: 'icon_urban_legend',
        condition: { type: 'map_type_distance', mapType: 'city', value: 10000 },
        progressMax: 10000,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'moon_walker',
        name: 'Moon Walker',
        description: 'Travel 5 km on the lunar map. One giant leap for driver-kind.',
        category: 'distance',
        rarity: 'rare',
        xpReward: 380,
        coinReward: 2000,
        diamondReward: 7,
        icon: 'icon_moon_walker',
        condition: { type: 'map_distance', map: 'lunar', value: 5000 },
        progressMax: 5000,
        secret: false,
        chainId: null,
        chainStep: 0
      },

      // ==================== COLLECTION CATEGORY ====================
      {
        id: 'coin_first',
        name: 'First Coin',
        description: 'Collect your very first coin. Every fortune starts with one.',
        category: 'collection',
        rarity: 'common',
        xpReward: 10,
        coinReward: 50,
        diamondReward: 0,
        icon: 'icon_coin_bronze',
        condition: { type: 'coins_collected', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'coin_chain',
        chainStep: 1
      },
      {
        id: 'coin_100',
        name: 'Centurion',
        description: 'Collect 100 coins in a single run. Sweep the track clean.',
        category: 'collection',
        rarity: 'common',
        xpReward: 80,
        coinReward: 300,
        diamondReward: 0,
        icon: 'icon_coin_silver',
        condition: { type: 'coins_single_run', value: 100 },
        progressMax: 100,
        secret: false,
        chainId: 'coin_chain',
        chainStep: 2
      },
      {
        id: 'coin_1000',
        name: 'Coin Collector',
        description: 'Collect 1000 total coins across all runs. Growing your fortune.',
        category: 'collection',
        rarity: 'uncommon',
        xpReward: 200,
        coinReward: 1000,
        diamondReward: 3,
        icon: 'icon_coin_gold',
        condition: { type: 'coins_total', value: 1000 },
        progressMax: 1000,
        secret: false,
        chainId: 'coin_chain',
        chainStep: 3
      },
      {
        id: 'coin_millionaire',
        name: 'Coin Millionaire',
        description: 'Collect 1,000,000 total coins. Absolute wealth achieved.',
        category: 'collection',
        rarity: 'legendary',
        xpReward: 1500,
        coinReward: 50000,
        diamondReward: 50,
        icon: 'icon_coin_legendary',
        condition: { type: 'coins_total', value: 1000000 },
        progressMax: 1000000,
        secret: false,
        chainId: 'coin_chain',
        chainStep: 4
      },
      {
        id: 'fuel_efficient',
        name: 'Fuel Miser',
        description: 'Complete a run using less than 20% of your fuel tank. Efficiency rules.',
        category: 'collection',
        rarity: 'uncommon',
        xpReward: 170,
        coinReward: 700,
        diamondReward: 2,
        icon: 'icon_fuel_efficient',
        condition: { type: 'fuel_used_percent', max: 20 },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'fuel_hoarder',
        name: 'Fuel Hoarder',
        description: 'Collect 50 fuel canisters in a single run. Tank never empty.',
        category: 'collection',
        rarity: 'rare',
        xpReward: 360,
        coinReward: 1800,
        diamondReward: 6,
        icon: 'icon_fuel_hoarder',
        condition: { type: 'fuel_pickups_single_run', value: 50 },
        progressMax: 50,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'diamond_first',
        name: 'Shiny Discovery',
        description: 'Collect your first diamond. A precious find on the road.',
        category: 'collection',
        rarity: 'common',
        xpReward: 50,
        coinReward: 100,
        diamondReward: 1,
        icon: 'icon_diamond_bronze',
        condition: { type: 'diamonds_collected', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'diamond_chain',
        chainStep: 1
      },
      {
        id: 'diamond_hunter',
        name: 'Diamond Hunter',
        description: 'Collect 100 diamonds total. The hunt is always worth it.',
        category: 'collection',
        rarity: 'rare',
        xpReward: 400,
        coinReward: 2000,
        diamondReward: 10,
        icon: 'icon_diamond_silver',
        condition: { type: 'diamonds_collected', value: 100 },
        progressMax: 100,
        secret: false,
        chainId: 'diamond_chain',
        chainStep: 2
      },
      {
        id: 'diamond_magnate',
        name: 'Diamond Magnate',
        description: 'Collect 10,000 diamonds total. Richer than royalty.',
        category: 'collection',
        rarity: 'legendary',
        xpReward: 2000,
        coinReward: 30000,
        diamondReward: 100,
        icon: 'icon_diamond_legendary',
        condition: { type: 'diamonds_collected', value: 10000 },
        progressMax: 10000,
        secret: false,
        chainId: 'diamond_chain',
        chainStep: 3
      },
      {
        id: 'greedy',
        name: 'Greedy Wheels',
        description: 'Collect every single coin on a map in one run. Leave nothing behind.',
        category: 'collection',
        rarity: 'rare',
        xpReward: 420,
        coinReward: 2200,
        diamondReward: 8,
        icon: 'icon_greedy',
        condition: { type: 'all_coins_on_map', value: true },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'loot_master',
        name: 'Loot Master',
        description: 'Collect all collectible types (coins, fuel, diamonds) in a single run.',
        category: 'collection',
        rarity: 'uncommon',
        xpReward: 240,
        coinReward: 1100,
        diamondReward: 4,
        icon: 'icon_loot_master',
        condition: { type: 'all_collectibles_types', value: true },
        progressMax: 3,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'no_fuel',
        name: 'One and Done',
        description: 'Complete a meaningful run with exactly 1 fuel pickup. Precision planning.',
        category: 'collection',
        rarity: 'rare',
        xpReward: 350,
        coinReward: 1700,
        diamondReward: 5,
        icon: 'icon_no_fuel',
        condition: { type: 'fuel_pickups_single_run', value: 1, exact: true },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'perfect_run',
        name: 'Perfect Run',
        description: 'Collect all coins, all fuel, and all diamonds on a single map. Perfection.',
        category: 'collection',
        rarity: 'epic',
        xpReward: 700,
        coinReward: 6000,
        diamondReward: 20,
        icon: 'icon_perfect_run',
        condition: { type: 'perfect_collection', value: true },
        progressMax: 3,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'hoarder',
        name: 'Maximum Hoarder',
        description: 'Max out your coin count in a single run by collecting everything.',
        category: 'collection',
        rarity: 'epic',
        xpReward: 600,
        coinReward: 8000,
        diamondReward: 15,
        icon: 'icon_hoarder',
        condition: { type: 'max_coins_single_run', value: true },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'treasure_hunter',
        name: 'Treasure Hunter',
        description: 'Find 10 secret collectibles hidden throughout the game.',
        category: 'collection',
        rarity: 'epic',
        xpReward: 800,
        coinReward: 7000,
        diamondReward: 25,
        icon: 'icon_treasure_hunter',
        condition: { type: 'secret_collectibles', value: 10 },
        progressMax: 10,
        secret: false,
        chainId: null,
        chainStep: 0
      },

      // ==================== VEHICLE CATEGORY ====================
      {
        id: 'first_vehicle',
        name: 'New Wheels',
        description: 'Unlock your first non-default vehicle. The collection begins.',
        category: 'vehicle',
        rarity: 'common',
        xpReward: 100,
        coinReward: 500,
        diamondReward: 1,
        icon: 'icon_vehicle_bronze',
        condition: { type: 'vehicles_owned', value: 2 },
        progressMax: 2,
        secret: false,
        chainId: 'garage_chain',
        chainStep: 1
      },
      {
        id: 'collector_5',
        name: 'Small Collection',
        description: 'Own 5 different vehicles. Your garage is growing nicely.',
        category: 'vehicle',
        rarity: 'common',
        xpReward: 200,
        coinReward: 1000,
        diamondReward: 3,
        icon: 'icon_vehicle_silver',
        condition: { type: 'vehicles_owned', value: 5 },
        progressMax: 5,
        secret: false,
        chainId: 'garage_chain',
        chainStep: 2
      },
      {
        id: 'collector_15',
        name: 'Impressive Garage',
        description: 'Own 15 different vehicles. You have serious taste in machines.',
        category: 'vehicle',
        rarity: 'rare',
        xpReward: 450,
        coinReward: 3000,
        diamondReward: 8,
        icon: 'icon_vehicle_gold',
        condition: { type: 'vehicles_owned', value: 15 },
        progressMax: 15,
        secret: false,
        chainId: 'garage_chain',
        chainStep: 3
      },
      {
        id: 'full_garage',
        name: 'Category Champion',
        description: 'Own all vehicles in a single category. Complete mastery of that class.',
        category: 'vehicle',
        rarity: 'epic',
        xpReward: 700,
        coinReward: 7000,
        diamondReward: 18,
        icon: 'icon_full_garage',
        condition: { type: 'full_category', value: true },
        progressMax: 1,
        secret: false,
        chainId: 'garage_chain',
        chainStep: 4
      },
      {
        id: 'all_vehicles',
        name: 'Ultimate Collector',
        description: 'Own every single vehicle in the entire game. An unmatched collection.',
        category: 'vehicle',
        rarity: 'legendary',
        xpReward: 2000,
        coinReward: 50000,
        diamondReward: 100,
        icon: 'icon_all_vehicles',
        condition: { type: 'all_vehicles_owned', value: true },
        progressMax: 100,
        secret: false,
        chainId: 'garage_chain',
        chainStep: 5
      },
      {
        id: 'upgrade_1',
        name: 'First Upgrade',
        description: 'Upgrade any vehicle stat for the very first time. Improvement starts here.',
        category: 'vehicle',
        rarity: 'common',
        xpReward: 50,
        coinReward: 150,
        diamondReward: 0,
        icon: 'icon_upgrade_bronze',
        condition: { type: 'upgrades_applied', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'upgrade_chain',
        chainStep: 1
      },
      {
        id: 'upgrade_max_one',
        name: 'Maxed Out',
        description: 'Max out one vehicle stat completely. Pushing the limits of engineering.',
        category: 'vehicle',
        rarity: 'uncommon',
        xpReward: 250,
        coinReward: 1200,
        diamondReward: 4,
        icon: 'icon_upgrade_silver',
        condition: { type: 'stat_maxed', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'upgrade_chain',
        chainStep: 2
      },
      {
        id: 'upgrade_master',
        name: 'Upgrade Master',
        description: 'Max out every single stat on one vehicle. A truly perfect machine.',
        category: 'vehicle',
        rarity: 'epic',
        xpReward: 800,
        coinReward: 8000,
        diamondReward: 22,
        icon: 'icon_upgrade_gold',
        condition: { type: 'all_stats_maxed_one_vehicle', value: true },
        progressMax: 5,
        secret: false,
        chainId: 'upgrade_chain',
        chainStep: 3
      },
      {
        id: 'prestige',
        name: 'Prestige Driver',
        description: 'Prestige a vehicle for the first time. Sacrifice power for glory.',
        category: 'vehicle',
        rarity: 'epic',
        xpReward: 600,
        coinReward: 5000,
        diamondReward: 15,
        icon: 'icon_prestige',
        condition: { type: 'prestige_count', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'legendary_vehicle',
        name: 'Legendary Taste',
        description: 'Unlock a legendary rarity vehicle. Only the finest for your garage.',
        category: 'vehicle',
        rarity: 'legendary',
        xpReward: 1000,
        coinReward: 10000,
        diamondReward: 30,
        icon: 'icon_legendary_vehicle',
        condition: { type: 'vehicle_rarity_unlocked', rarity: 'legendary' },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'fusion',
        name: 'Fusion Pioneer',
        description: 'Complete your first vehicle fusion. Two become one powerful machine.',
        category: 'vehicle',
        rarity: 'rare',
        xpReward: 500,
        coinReward: 3500,
        diamondReward: 10,
        icon: 'icon_fusion',
        condition: { type: 'fusions_completed', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'race_car_driver',
        name: 'Race Car Driver',
        description: 'Win 10 races using a supercar. Born for the track.',
        category: 'vehicle',
        rarity: 'rare',
        xpReward: 440,
        coinReward: 2500,
        diamondReward: 8,
        icon: 'icon_race_car',
        condition: { type: 'wins_with_vehicle_class', vehicleClass: 'supercar', value: 10 },
        progressMax: 10,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'off_road_king',
        name: 'Off Road King',
        description: 'Win 10 races using a truck. Brute force beats finesse.',
        category: 'vehicle',
        rarity: 'rare',
        xpReward: 440,
        coinReward: 2500,
        diamondReward: 8,
        icon: 'icon_off_road_king',
        condition: { type: 'wins_with_vehicle_class', vehicleClass: 'truck', value: 10 },
        progressMax: 10,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'two_wheels',
        name: 'Two Wheeler',
        description: 'Travel 5 km on a motorcycle without crashing. Balance is a superpower.',
        category: 'vehicle',
        rarity: 'rare',
        xpReward: 400,
        coinReward: 2000,
        diamondReward: 7,
        icon: 'icon_two_wheels',
        condition: { type: 'vehicle_distance_no_crash', vehicleClass: 'motorcycle', value: 5000 },
        progressMax: 5000,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'tank_commander',
        name: 'Tank Commander',
        description: 'Destroy 50 obstacles using the tank. Bulldoze everything in your path.',
        category: 'vehicle',
        rarity: 'rare',
        xpReward: 420,
        coinReward: 2200,
        diamondReward: 7,
        icon: 'icon_tank_commander',
        condition: { type: 'obstacles_destroyed_with_vehicle', vehicle: 'tank', value: 50 },
        progressMax: 50,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'electric_dreamer',
        name: 'Electric Dreamer',
        description: 'Travel 100 km total using electric vehicles. The future is now.',
        category: 'vehicle',
        rarity: 'uncommon',
        xpReward: 260,
        coinReward: 1300,
        diamondReward: 4,
        icon: 'icon_electric',
        condition: { type: 'distance_with_vehicle_type', vehicleType: 'electric', value: 100000 },
        progressMax: 100000,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'vintage_charm',
        name: 'Vintage Charm',
        description: 'Complete 20 runs using vintage vehicles. Old school never dies.',
        category: 'vehicle',
        rarity: 'uncommon',
        xpReward: 230,
        coinReward: 1050,
        diamondReward: 3,
        icon: 'icon_vintage',
        condition: { type: 'runs_with_vehicle_type', vehicleType: 'vintage', value: 20 },
        progressMax: 20,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'fantasy_rider',
        name: 'Fantasy Rider',
        description: 'Complete all story missions for every fantasy vehicle. Epic tales told.',
        category: 'vehicle',
        rarity: 'legendary',
        xpReward: 1200,
        coinReward: 15000,
        diamondReward: 40,
        icon: 'icon_fantasy_rider',
        condition: { type: 'fantasy_stories_completed', value: true },
        progressMax: 10,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'special_ability_100',
        name: 'Ability Addict',
        description: 'Use special vehicle abilities 100 times total. Abilities make the driver.',
        category: 'vehicle',
        rarity: 'uncommon',
        xpReward: 200,
        coinReward: 950,
        diamondReward: 3,
        icon: 'icon_special_ability',
        condition: { type: 'special_ability_uses', value: 100 },
        progressMax: 100,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'vehicle_master',
        name: 'Vehicle Master',
        description: 'Complete vehicle mastery on any single vehicle. True dedication.',
        category: 'vehicle',
        rarity: 'epic',
        xpReward: 900,
        coinReward: 9000,
        diamondReward: 25,
        icon: 'icon_vehicle_master',
        condition: { type: 'vehicle_mastery_complete', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },

      // ==================== SOCIAL CATEGORY ====================
      {
        id: 'first_login',
        name: 'Welcome Aboard',
        description: 'Log in for the very first time. Your adventure starts now!',
        category: 'social',
        rarity: 'common',
        xpReward: 25,
        coinReward: 200,
        diamondReward: 0,
        icon: 'icon_login',
        condition: { type: 'login_count', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'daily_7',
        name: 'Week Warrior',
        description: 'Play 7 days in a row. You are on a roll, keep it going!',
        category: 'social',
        rarity: 'uncommon',
        xpReward: 175,
        coinReward: 750,
        diamondReward: 2,
        icon: 'icon_streak_7',
        condition: { type: 'login_streak', value: 7 },
        progressMax: 7,
        secret: false,
        chainId: 'streak_chain',
        chainStep: 1
      },
      {
        id: 'daily_30',
        name: 'Monthly Devotee',
        description: 'Play 30 days in a row. A whole month of dedication!',
        category: 'social',
        rarity: 'rare',
        xpReward: 450,
        coinReward: 2500,
        diamondReward: 10,
        icon: 'icon_streak_30',
        condition: { type: 'login_streak', value: 30 },
        progressMax: 30,
        secret: false,
        chainId: 'streak_chain',
        chainStep: 2
      },
      {
        id: 'daily_100',
        name: 'Centurion Streak',
        description: 'Play 100 days in a row. An absolutely legendary commitment.',
        category: 'social',
        rarity: 'legendary',
        xpReward: 2000,
        coinReward: 20000,
        diamondReward: 75,
        icon: 'icon_streak_100',
        condition: { type: 'login_streak', value: 100 },
        progressMax: 100,
        secret: false,
        chainId: 'streak_chain',
        chainStep: 3
      },
      {
        id: 'tournament_enter',
        name: 'Tournament Rookie',
        description: 'Enter your first tournament. Welcome to competitive racing!',
        category: 'social',
        rarity: 'common',
        xpReward: 75,
        coinReward: 300,
        diamondReward: 1,
        icon: 'icon_tournament_bronze',
        condition: { type: 'tournaments_entered', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'tournament_chain',
        chainStep: 1
      },
      {
        id: 'tournament_win',
        name: 'Tournament Victor',
        description: 'Win your first tournament. Champion material confirmed.',
        category: 'social',
        rarity: 'rare',
        xpReward: 500,
        coinReward: 4000,
        diamondReward: 12,
        icon: 'icon_tournament_gold',
        condition: { type: 'tournaments_won', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: 'tournament_chain',
        chainStep: 2
      },
      {
        id: 'champion',
        name: 'Champion',
        description: 'Win 5 tournaments in total. A dominant force in competition.',
        category: 'social',
        rarity: 'epic',
        xpReward: 1000,
        coinReward: 12000,
        diamondReward: 30,
        icon: 'icon_champion',
        condition: { type: 'tournaments_won', value: 5 },
        progressMax: 5,
        secret: false,
        chainId: 'tournament_chain',
        chainStep: 3
      },
      {
        id: 'share_it',
        name: 'Show Off',
        description: 'Share a game result with your friends or on social media.',
        category: 'social',
        rarity: 'common',
        xpReward: 40,
        coinReward: 150,
        diamondReward: 0,
        icon: 'icon_share',
        condition: { type: 'shares', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'community',
        name: 'Team Player',
        description: 'Complete a community challenge by contributing to the shared goal.',
        category: 'social',
        rarity: 'uncommon',
        xpReward: 300,
        coinReward: 1500,
        diamondReward: 5,
        icon: 'icon_community',
        condition: { type: 'community_challenges_completed', value: 1 },
        progressMax: 1,
        secret: false,
        chainId: null,
        chainStep: 0
      },
      {
        id: 'veteran',
        name: 'Veteran Driver',
        description: 'Play for a total of 100 hours. A true veteran of the road.',
        category: 'social',
        rarity: 'legendary',
        xpReward: 1500,
        coinReward: 20000,
        diamondReward: 60,
        icon: 'icon_veteran',
        condition: { type: 'total_play_time', value: 360000 },
        progressMax: 360000,
        secret: false,
        chainId: null,
        chainStep: 0
      },

      // ==================== SECRET CATEGORY ====================
      {
        id: 'secret_flip_land',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'legendary',
        xpReward: 2000,
        coinReward: 25000,
        diamondReward: 100,
        icon: 'icon_secret_1',
        condition: { type: 'backflip_land_on_vehicle', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Back Flip Landing',
        unlockedDescription: 'Do a backflip and land perfectly on top of another vehicle. Impossible? Apparently not.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_77_coins',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'epic',
        xpReward: 777,
        coinReward: 7777,
        diamondReward: 7,
        icon: 'icon_secret_2',
        condition: { type: 'coins_single_run_exact', value: 77 },
        progressMax: 1,
        secret: true,
        unlockedName: 'Lucky Sevens',
        unlockedDescription: 'Collect exactly 77 coins in a single run. No more, no less. Fortune favors the precise.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_edge',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'rare',
        xpReward: 500,
        coinReward: 5000,
        diamondReward: 15,
        icon: 'icon_secret_3',
        condition: { type: 'reach_map_edge', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Edge of the World',
        unlockedDescription: 'You reached the very edge of the map. What lies beyond? Only you know.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_crash_early',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'uncommon',
        xpReward: 200,
        coinReward: 500,
        diamondReward: 5,
        icon: 'icon_secret_4',
        condition: { type: 'crash_within_distance', distance: 10 },
        progressMax: 1,
        secret: true,
        unlockedName: 'Epic Fail',
        unlockedDescription: 'You crashed within the first 10 meters. We have all been there. No judgment.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_reverse',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'epic',
        xpReward: 777,
        coinReward: 8000,
        diamondReward: 20,
        icon: 'icon_secret_5',
        condition: { type: 'complete_run_reverse', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Wrong Way Driver',
        unlockedDescription: 'Complete a run while going in reverse the entire time. Who needs forward?',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_all_secrets',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'legendary',
        xpReward: 5000,
        coinReward: 100000,
        diamondReward: 250,
        icon: 'icon_secret_master',
        condition: { type: 'all_secrets_unlocked', value: true },
        progressMax: 25,
        secret: true,
        unlockedName: 'Secret Seeker Supreme',
        unlockedDescription: 'You found every single secret achievement. You truly know this game inside out.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_mid_air_fuel',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'rare',
        xpReward: 400,
        coinReward: 4000,
        diamondReward: 12,
        icon: 'icon_secret_6',
        condition: { type: 'collect_fuel_while_airborne', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Aerial Refuel',
        unlockedDescription: 'Collect a fuel canister while completely airborne. Defying gravity and fuel laws.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_photobomb',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'epic',
        xpReward: 600,
        coinReward: 5500,
        diamondReward: 18,
        icon: 'icon_secret_7',
        condition: { type: 'pass_another_player_mid_flip', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Photobomb Champion',
        unlockedDescription: 'Pass another player while executing a flip. Timing is everything in life and racing.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_midnight_run',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'rare',
        xpReward: 350,
        coinReward: 3000,
        diamondReward: 10,
        icon: 'icon_secret_8',
        condition: { type: 'play_at_midnight', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Midnight Racer',
        unlockedDescription: 'Complete a run starting exactly at midnight local time. The night calls to you.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_no_upgrade',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'epic',
        xpReward: 800,
        coinReward: 6000,
        diamondReward: 20,
        icon: 'icon_secret_9',
        condition: { type: 'win_with_no_upgrades', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Stock Champion',
        unlockedDescription: 'Win a race with a completely stock, unupgraded vehicle. Pure raw talent over upgrades.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_fuel_run_out',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'uncommon',
        xpReward: 220,
        coinReward: 1200,
        diamondReward: 5,
        icon: 'icon_secret_10',
        condition: { type: 'run_out_of_fuel_exactly_finish_line', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Empty Tank Finish',
        unlockedDescription: 'Run out of fuel exactly at the finish line. Such impeccable fuel management.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_uphill_battle',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'epic',
        xpReward: 600,
        coinReward: 5000,
        diamondReward: 15,
        icon: 'icon_secret_11',
        condition: { type: 'travel_uphill_only', distance: 500 },
        progressMax: 1,
        secret: true,
        unlockedName: 'Uphill Battle',
        unlockedDescription: 'Travel 500m continuously uphill without any downhill section. Gravity is just a suggestion.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_speed_zero',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'uncommon',
        xpReward: 180,
        coinReward: 900,
        diamondReward: 4,
        icon: 'icon_secret_12',
        condition: { type: 'go_from_max_speed_to_zero_instantly', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Screeching Halt',
        unlockedDescription: 'Go from maximum speed to a full stop within 1 second. The brakes do work!',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_collect_during_flip',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'rare',
        xpReward: 450,
        coinReward: 3500,
        diamondReward: 11,
        icon: 'icon_secret_13',
        condition: { type: 'collect_coin_during_flip', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Spinning Collector',
        unlockedDescription: 'Collect a coin while in the middle of a backflip rotation. Multitasking at its finest.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_birthday',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'rare',
        xpReward: 500,
        coinReward: 5000,
        diamondReward: 15,
        icon: 'icon_secret_14',
        condition: { type: 'play_on_birthday', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Happy Birthday!',
        unlockedDescription: 'You played on your account birthday! Thanks for spending another year with us.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_triple_nitro_flip',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'legendary',
        xpReward: 1500,
        coinReward: 15000,
        diamondReward: 50,
        icon: 'icon_secret_15',
        condition: { type: 'triple_flip_with_nitro_active', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Nitro Flip Legend',
        unlockedDescription: 'Execute a triple backflip while nitro is actively burning. The pinnacle of showmanship.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_ghost_lap',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'epic',
        xpReward: 700,
        coinReward: 6000,
        diamondReward: 20,
        icon: 'icon_secret_16',
        condition: { type: 'beat_own_ghost', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Ghost Beater',
        unlockedDescription: 'Beat your own ghost recording by more than 30 seconds. You got significantly better.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_no_input',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'uncommon',
        xpReward: 250,
        coinReward: 1500,
        diamondReward: 5,
        icon: 'icon_secret_17',
        condition: { type: 'travel_distance_no_input', distance: 100 },
        progressMax: 1,
        secret: true,
        unlockedName: 'Hands Free',
        unlockedDescription: 'Travel 100m without any input. Let gravity and momentum do the work.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_tank_flip',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'epic',
        xpReward: 888,
        coinReward: 8888,
        diamondReward: 22,
        icon: 'icon_secret_18',
        condition: { type: 'flip_with_tank', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Flying Tank',
        unlockedDescription: 'Complete a backflip using the tank vehicle. Nobody said tanks cannot fly.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_speedrun_tutorial',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'rare',
        xpReward: 333,
        coinReward: 3333,
        diamondReward: 9,
        icon: 'icon_secret_19',
        condition: { type: 'complete_tutorial_under_time', seconds: 30 },
        progressMax: 1,
        secret: true,
        unlockedName: 'Tutorial Speedrunner',
        unlockedDescription: 'Complete the tutorial in under 30 seconds. You clearly did not need it.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_coin_rain',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'epic',
        xpReward: 999,
        coinReward: 9999,
        diamondReward: 25,
        icon: 'icon_secret_20',
        condition: { type: 'coins_collected_in_10_seconds', value: 50 },
        progressMax: 1,
        secret: true,
        unlockedName: 'Coin Rain',
        unlockedDescription: 'Collect 50 coins in 10 seconds. It was raining money and you had an umbrella.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_land_on_wheels',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'rare',
        xpReward: 450,
        coinReward: 4000,
        diamondReward: 12,
        icon: 'icon_secret_21',
        condition: { type: 'land_perfectly_after_5_flips', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Cat Landing',
        unlockedDescription: 'Land perfectly on all four wheels after doing 5 consecutive flips. Like a cat, always landing right.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_vintage_speed',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'legendary',
        xpReward: 1111,
        coinReward: 11111,
        diamondReward: 33,
        icon: 'icon_secret_22',
        condition: { type: 'max_speed_with_vintage', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Vintage Speed Demon',
        unlockedDescription: 'Reach 200 km/h in a vintage vehicle. Old cars can fly too.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_perfect_week',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'epic',
        xpReward: 700,
        coinReward: 7000,
        diamondReward: 21,
        icon: 'icon_secret_23',
        condition: { type: 'complete_all_missions_7_days', value: true },
        progressMax: 1,
        secret: true,
        unlockedName: 'Perfect Week',
        unlockedDescription: 'Complete every daily mission for 7 consecutive days. The definition of dedication.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_crash_500',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'uncommon',
        xpReward: 300,
        coinReward: 2000,
        diamondReward: 6,
        icon: 'icon_secret_24',
        condition: { type: 'total_crashes', value: 500 },
        progressMax: 500,
        secret: true,
        unlockedName: 'Crash Test Veteran',
        unlockedDescription: 'Crash 500 times in total. You have tested the physics engine thoroughly.',
        chainId: null,
        chainStep: 0
      },
      {
        id: 'secret_silent_run',
        name: '???',
        description: 'A hidden achievement. Keep experimenting!',
        category: 'secret',
        rarity: 'epic',
        xpReward: 650,
        coinReward: 5500,
        diamondReward: 17,
        icon: 'icon_secret_25',
        condition: { type: 'complete_run_no_nitro_no_tricks', value: true, minDistance: 5000 },
        progressMax: 1,
        secret: true,
        unlockedName: 'Silent Runner',
        unlockedDescription: 'Complete a 5km run without using nitro or performing any tricks. Just pure driving.',
        chainId: null,
        chainStep: 0
      }

    ],

    getById: function(id) {
      return this.achievements.find(function(a) { return a.id === id; }) || null;
    },

    getByCategory: function(category) {
      return this.achievements.filter(function(a) { return a.category === category; });
    },

    getByRarity: function(rarity) {
      return this.achievements.filter(function(a) { return a.rarity === rarity; });
    },

    getSecrets: function() {
      return this.achievements.filter(function(a) { return a.secret === true; });
    },

    getChain: function(chainId) {
      return this.achievements
        .filter(function(a) { return a.chainId === chainId; })
        .sort(function(a, b) { return a.chainStep - b.chainStep; });
    },

    getCategorySummary: function() {
      var cats = {};
      this.achievements.forEach(function(a) {
        if (!cats[a.category]) cats[a.category] = { count: 0, totalXp: 0, totalCoins: 0 };
        cats[a.category].count++;
        cats[a.category].totalXp += a.xpReward;
        cats[a.category].totalCoins += a.coinReward;
      });
      return cats;
    },

    getRarityWeights: function() {
      var weights = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
      var total = this.achievements.length;
      this.achievements.forEach(function(a) {
        if (weights[a.rarity] !== undefined) weights[a.rarity]++;
      });
      Object.keys(weights).forEach(function(k) {
        weights[k] = ((weights[k] / total) * 100).toFixed(1) + '%';
      });
      return weights;
    },

    totalXpAvailable: function() {
      return this.achievements.reduce(function(sum, a) { return sum + a.xpReward; }, 0);
    },

    totalCoinsAvailable: function() {
      return this.achievements.reduce(function(sum, a) { return sum + a.coinReward; }, 0);
    },

    totalDiamondsAvailable: function() {
      return this.achievements.reduce(function(sum, a) { return sum + a.diamondReward; }, 0);
    }
  };

})();

// ============================================================
// DAILY_MISSION_SYSTEM MODULE
// ============================================================
(function() {
  'use strict';

  // ---- Seeded RNG (Mulberry32) ----
  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function seedFromDate(dateStr) {
    var hash = 0;
    for (var i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // ---- 30 Mission Templates ----
  var MISSION_TEMPLATES = [
    // EASY (coinReward 200-500, xpReward 50)
    {
      id: 'tmpl_collect_coins_easy',
      title: 'Pocket Change',
      description: 'Collect {target} coins in a single run.',
      type: 'collect_coins',
      baseTarget: 50,
      difficulty: 'easy',
      xpReward: 50,
      coinReward: 200,
      diamondReward: 0,
      icon: 'mission_coin_easy',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_travel_easy',
      title: 'Short Cruise',
      description: 'Travel {target} meters in a single run.',
      type: 'travel_distance',
      baseTarget: 500,
      difficulty: 'easy',
      xpReward: 50,
      coinReward: 200,
      diamondReward: 0,
      icon: 'mission_dist_easy',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_tricks_easy',
      title: 'Show a Little',
      description: 'Perform {target} tricks in a single run.',
      type: 'perform_tricks',
      baseTarget: 3,
      difficulty: 'easy',
      xpReward: 50,
      coinReward: 250,
      diamondReward: 0,
      icon: 'mission_trick_easy',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_nitro_easy',
      title: 'Boost Basics',
      description: 'Use nitro {target} times in a single run.',
      type: 'use_nitro',
      baseTarget: 3,
      difficulty: 'easy',
      xpReward: 50,
      coinReward: 220,
      diamondReward: 0,
      icon: 'mission_nitro_easy',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_no_crash_easy',
      title: 'Careful Driver',
      description: 'Complete a run without crashing on any easy map.',
      type: 'no_crash',
      baseTarget: 1,
      difficulty: 'easy',
      xpReward: 50,
      coinReward: 300,
      diamondReward: 0,
      icon: 'mission_nocrash_easy',
      targetMultiplier: 1.0,
      condition: { mapDifficulty: 'easy' }
    },
    {
      id: 'tmpl_speed_easy',
      title: 'Pick Up the Pace',
      description: 'Reach {target} km/h in any run.',
      type: 'reach_speed',
      baseTarget: 80,
      difficulty: 'easy',
      xpReward: 50,
      coinReward: 240,
      diamondReward: 0,
      icon: 'mission_speed_easy',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_play_runs_easy',
      title: 'Just Show Up',
      description: 'Complete {target} runs today.',
      type: 'complete_runs',
      baseTarget: 3,
      difficulty: 'easy',
      xpReward: 50,
      coinReward: 200,
      diamondReward: 0,
      icon: 'mission_runs_easy',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_fuel_easy',
      title: 'Fuel Up',
      description: 'Collect {target} fuel canisters in total today.',
      type: 'collect_fuel',
      baseTarget: 10,
      difficulty: 'easy',
      xpReward: 50,
      coinReward: 210,
      diamondReward: 0,
      icon: 'mission_fuel_easy',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_wheelie_easy',
      title: 'Pop a Wheelie',
      description: 'Maintain a wheelie for {target} seconds total.',
      type: 'wheelie_duration',
      baseTarget: 5,
      difficulty: 'easy',
      xpReward: 50,
      coinReward: 230,
      diamondReward: 0,
      icon: 'mission_wheelie_easy',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_flip_easy',
      title: 'Flip Practice',
      description: 'Perform {target} backflips in total today.',
      type: 'backflips',
      baseTarget: 5,
      difficulty: 'easy',
      xpReward: 50,
      coinReward: 250,
      diamondReward: 0,
      icon: 'mission_flip_easy',
      targetMultiplier: 1.0
    },
    // MEDIUM (xpReward 150)
    {
      id: 'tmpl_collect_coins_med',
      title: 'Coin Sweep',
      description: 'Collect {target} coins across all runs today.',
      type: 'collect_coins_daily',
      baseTarget: 500,
      difficulty: 'medium',
      xpReward: 150,
      coinReward: 700,
      diamondReward: 2,
      icon: 'mission_coin_med',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_travel_med',
      title: 'Road Warrior',
      description: 'Travel {target} km total today.',
      type: 'travel_distance_daily',
      baseTarget: 10000,
      difficulty: 'medium',
      xpReward: 150,
      coinReward: 750,
      diamondReward: 2,
      icon: 'mission_dist_med',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_tricks_med',
      title: 'Trick Show',
      description: 'Perform {target} total tricks today.',
      type: 'perform_tricks_daily',
      baseTarget: 20,
      difficulty: 'medium',
      xpReward: 150,
      coinReward: 800,
      diamondReward: 2,
      icon: 'mission_trick_med',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_nitro_med',
      title: 'Nitro Enthusiast',
      description: 'Use nitro {target} times in total today.',
      type: 'use_nitro_daily',
      baseTarget: 15,
      difficulty: 'medium',
      xpReward: 150,
      coinReward: 720,
      diamondReward: 2,
      icon: 'mission_nitro_med',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_no_crash_med',
      title: 'Precision Driver',
      description: 'Complete {target} consecutive runs without crashing.',
      type: 'no_crash_consecutive',
      baseTarget: 3,
      difficulty: 'medium',
      xpReward: 150,
      coinReward: 850,
      diamondReward: 3,
      icon: 'mission_nocrash_med',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_vehicle_specific_med',
      title: 'Vehicle Challenge',
      description: 'Complete {target} runs using a specific vehicle class.',
      type: 'specific_vehicle',
      baseTarget: 5,
      difficulty: 'medium',
      xpReward: 150,
      coinReward: 780,
      diamondReward: 2,
      icon: 'mission_vehicle_med',
      targetMultiplier: 1.0,
      vehicleClass: 'truck'
    },
    {
      id: 'tmpl_map_specific_med',
      title: 'Map Specialist',
      description: 'Travel {target} meters on a specific map type.',
      type: 'specific_map',
      baseTarget: 5000,
      difficulty: 'medium',
      xpReward: 150,
      coinReward: 760,
      diamondReward: 2,
      icon: 'mission_map_med',
      targetMultiplier: 1.0,
      mapType: 'forest'
    },
    {
      id: 'tmpl_score_med',
      title: 'Score Chaser',
      description: 'Earn a total trick score of {target} today.',
      type: 'trick_score_daily',
      baseTarget: 5000,
      difficulty: 'medium',
      xpReward: 150,
      coinReward: 800,
      diamondReward: 2,
      icon: 'mission_score_med',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_air_time_med',
      title: 'Sky High',
      description: 'Accumulate {target} seconds of total air time today.',
      type: 'air_time_daily',
      baseTarget: 30,
      difficulty: 'medium',
      xpReward: 150,
      coinReward: 770,
      diamondReward: 2,
      icon: 'mission_air_med',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_speed_med',
      title: 'Need for Speed',
      description: 'Maintain {target} km/h for {duration} seconds in a run.',
      type: 'sustained_speed',
      baseTarget: 100,
      duration: 5,
      difficulty: 'medium',
      xpReward: 150,
      coinReward: 790,
      diamondReward: 2,
      icon: 'mission_speed_med',
      targetMultiplier: 1.0
    },
    // HARD (xpReward 500)
    {
      id: 'tmpl_distance_hard',
      title: 'Marathon Day',
      description: 'Travel {target} km in a single run today.',
      type: 'single_run_distance_hard',
      baseTarget: 15000,
      difficulty: 'hard',
      xpReward: 500,
      coinReward: 3000,
      diamondReward: 8,
      icon: 'mission_dist_hard',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_tricks_hard',
      title: 'Trick Madness',
      description: 'Earn {target} trick score in a single combo.',
      type: 'trick_score_combo',
      baseTarget: 8000,
      difficulty: 'hard',
      xpReward: 500,
      coinReward: 3200,
      diamondReward: 8,
      icon: 'mission_trick_hard',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_no_crash_hard',
      title: 'Flawless Run',
      description: 'Complete a run on a hard map with no crashes and over {target} meters.',
      type: 'no_crash_hard_distance',
      baseTarget: 5000,
      difficulty: 'hard',
      xpReward: 500,
      coinReward: 3500,
      diamondReward: 10,
      icon: 'mission_nocrash_hard',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_vehicle_master_hard',
      title: 'Master Class',
      description: 'Win {target} races in a row with the same vehicle.',
      type: 'consecutive_wins_same_vehicle',
      baseTarget: 5,
      difficulty: 'hard',
      xpReward: 500,
      coinReward: 3800,
      diamondReward: 10,
      icon: 'mission_vehicle_hard',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_speed_hard',
      title: 'Speed God',
      description: 'Reach {target} km/h and hold it for {duration} seconds.',
      type: 'sustained_speed_hard',
      baseTarget: 150,
      duration: 8,
      difficulty: 'hard',
      xpReward: 500,
      coinReward: 4000,
      diamondReward: 12,
      icon: 'mission_speed_hard',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_collect_all_hard',
      title: 'Total Sweep',
      description: 'Collect all coins, fuel and diamonds on any map in a single run.',
      type: 'perfect_collection',
      baseTarget: 1,
      difficulty: 'hard',
      xpReward: 500,
      coinReward: 5000,
      diamondReward: 15,
      icon: 'mission_collect_hard',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_combo_hard',
      title: 'Combo God',
      description: 'Chain {target} tricks in a single run without touching the ground.',
      type: 'trick_combo_hard',
      baseTarget: 7,
      difficulty: 'hard',
      xpReward: 500,
      coinReward: 3600,
      diamondReward: 10,
      icon: 'mission_combo_hard',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_tournament_hard',
      title: 'Tournament Dominator',
      description: 'Win {target} tournament rounds today.',
      type: 'tournament_wins',
      baseTarget: 3,
      difficulty: 'hard',
      xpReward: 500,
      coinReward: 4500,
      diamondReward: 12,
      icon: 'mission_tournament_hard',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_upgrade_hard',
      title: 'Upgrade Day',
      description: 'Apply {target} upgrades to any vehicles today.',
      type: 'upgrades_today',
      baseTarget: 5,
      difficulty: 'hard',
      xpReward: 500,
      coinReward: 3000,
      diamondReward: 8,
      icon: 'mission_upgrade_hard',
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_diamond_hard',
      title: 'Diamond Rush',
      description: 'Collect {target} diamonds in a single run.',
      type: 'diamonds_single_run',
      baseTarget: 10,
      difficulty: 'hard',
      xpReward: 500,
      coinReward: 3500,
      diamondReward: 20,
      icon: 'mission_diamond_hard',
      targetMultiplier: 1.0
    }
  ];

  // ---- Premium Mission Templates (season pass) ----
  var PREMIUM_MISSION_TEMPLATES = [
    {
      id: 'tmpl_premium_1',
      title: 'VIP Distance',
      description: 'Travel {target} km in premium vehicles today.',
      type: 'premium_vehicle_distance',
      baseTarget: 20000,
      difficulty: 'hard',
      xpReward: 750,
      coinReward: 6000,
      diamondReward: 20,
      icon: 'mission_premium_1',
      premium: true,
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_premium_2',
      title: 'VIP Trick Score',
      description: 'Earn {target} total trick score using premium vehicles.',
      type: 'premium_trick_score',
      baseTarget: 15000,
      difficulty: 'hard',
      xpReward: 750,
      coinReward: 6000,
      diamondReward: 20,
      icon: 'mission_premium_2',
      premium: true,
      targetMultiplier: 1.0
    },
    {
      id: 'tmpl_premium_3',
      title: 'VIP Coin Hunter',
      description: 'Collect {target} coins in premium vehicles today.',
      type: 'premium_coins',
      baseTarget: 1000,
      difficulty: 'hard',
      xpReward: 750,
      coinReward: 7000,
      diamondReward: 25,
      icon: 'mission_premium_3',
      premium: true,
      targetMultiplier: 1.0
    }
  ];

  // ---- Daily Mission System ----
  window.DAILY_MISSION_SYSTEM = {
    version: '1.5.0',
    storageKey: 'ahmet_daily_missions',
    historyKey: 'ahmet_mission_history',
    streakKey: 'ahmet_mission_streak',
    lastCompletedKey: 'ahmet_last_mission_date',

    difficultyConfig: {
      easy: { count: 3, xpReward: 50 },
      medium: { count: 2, xpReward: 150 },
      hard: { count: 1, xpReward: 500 }
    },

    streakBonusXp: [0, 10, 25, 50, 75, 100, 150, 200, 200, 200, 300],

    getTodayString: function() {
      return new Date().toISOString().slice(0, 10);
    },

    getWeekString: function() {
      var now = new Date();
      var jan1 = new Date(now.getFullYear(), 0, 1);
      var week = Math.ceil((((now - jan1) / 86400000) + jan1.getDay() + 1) / 7);
      return now.getFullYear() + '-W' + String(week).padStart(2, '0');
    },

    generateDailyMissions: function(dateStr, hasPremium) {
      dateStr = dateStr || this.getTodayString();
      var seed = seedFromDate(dateStr);
      var rng = mulberry32(seed);

      var easyTemplates = MISSION_TEMPLATES.filter(function(t) { return t.difficulty === 'easy'; });
      var medTemplates  = MISSION_TEMPLATES.filter(function(t) { return t.difficulty === 'medium'; });
      var hardTemplates = MISSION_TEMPLATES.filter(function(t) { return t.difficulty === 'hard'; });

      function pickRandom(arr, count, rngFn) {
        var copy = arr.slice();
        var result = [];
        while (result.length < count && copy.length > 0) {
          var idx = Math.floor(rngFn() * copy.length);
          result.push(copy.splice(idx, 1)[0]);
        }
        return result;
      }

      var dayVariance = (rng() * 0.4) + 0.8; // 0.8 - 1.2

      function instantiateTemplate(tmpl) {
        var target = Math.round(tmpl.baseTarget * dayVariance * (tmpl.targetMultiplier || 1));
        var expires = new Date(dateStr);
        expires.setDate(expires.getDate() + 1);
        return {
          id: tmpl.id + '_' + dateStr,
          templateId: tmpl.id,
          title: tmpl.title,
          description: tmpl.description.replace('{target}', target).replace('{duration}', tmpl.duration || ''),
          type: tmpl.type,
          target: target,
          duration: tmpl.duration || null,
          difficulty: tmpl.difficulty,
          xpReward: tmpl.xpReward,
          coinReward: tmpl.coinReward,
          diamondReward: tmpl.diamondReward,
          icon: tmpl.icon,
          vehicleClass: tmpl.vehicleClass || null,
          mapType: tmpl.mapType || null,
          condition: tmpl.condition || null,
          premium: tmpl.premium || false,
          progress: 0,
          completed: false,
          claimed: false,
          expires: expires.toISOString(),
          date: dateStr
        };
      }

      var missions = [];
      pickRandom(easyTemplates, 3, rng).forEach(function(t) { missions.push(instantiateTemplate(t)); });
      pickRandom(medTemplates, 2, rng).forEach(function(t) { missions.push(instantiateTemplate(t)); });
      pickRandom(hardTemplates, 1, rng).forEach(function(t) { missions.push(instantiateTemplate(t)); });

      if (hasPremium) {
        PREMIUM_MISSION_TEMPLATES.forEach(function(t) {
          missions.push(instantiateTemplate(t));
        });
      }

      return missions;
    },

    loadState: function() {
      try {
        var raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : null;
      } catch(e) { return null; }
    },

    saveState: function(state) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
      } catch(e) {}
    },

    getOrCreateTodayMissions: function(hasPremium) {
      var today = this.getTodayString();
      var state = this.loadState();
      if (state && state.date === today) {
        return state;
      }
      // New day — rotate missions
      if (state) {
        this.archiveDay(state);
      }
      var missions = this.generateDailyMissions(today, hasPremium);
      var newState = { date: today, missions: missions, allCompleted: false };
      this.saveState(newState);
      this.showNewMissionNotification();
      return newState;
    },

    updateProgress: function(missionId, progress) {
      var state = this.loadState();
      if (!state) return false;
      var mission = state.missions.find(function(m) { return m.id === missionId; });
      if (!mission || mission.completed) return false;
      mission.progress = Math.min(progress, mission.target);
      if (mission.progress >= mission.target) {
        mission.completed = true;
        this.checkAllCompleted(state);
      }
      this.saveState(state);
      return mission.completed;
    },

    claimReward: function(missionId) {
      var state = this.loadState();
      if (!state) return null;
      var mission = state.missions.find(function(m) { return m.id === missionId; });
      if (!mission || !mission.completed || mission.claimed) return null;
      mission.claimed = true;
      var streak = this.getStreak();
      var bonusXp = this.streakBonusXp[Math.min(streak, this.streakBonusXp.length - 1)] || 0;
      var reward = {
        xp: mission.xpReward + bonusXp,
        coins: mission.coinReward,
        diamonds: mission.diamondReward,
        bonusXp: bonusXp,
        streak: streak
      };
      this.saveState(state);
      return reward;
    },

    checkAllCompleted: function(state) {
      var allDone = state.missions.every(function(m) { return m.completed; });
      if (allDone && !state.allCompleted) {
        state.allCompleted = true;
        this.recordStreak(state.date);
      }
    },

    getStreak: function() {
      try {
        var raw = localStorage.getItem(this.streakKey);
        return raw ? parseInt(raw, 10) : 0;
      } catch(e) { return 0; }
    },

    recordStreak: function(dateStr) {
      var lastDate = localStorage.getItem(this.lastCompletedKey);
      var streak = this.getStreak();
      if (lastDate) {
        var last = new Date(lastDate);
        var cur = new Date(dateStr);
        var diff = (cur - last) / 86400000;
        streak = (diff <= 1.5) ? streak + 1 : 1;
      } else {
        streak = 1;
      }
      try {
        localStorage.setItem(this.streakKey, String(streak));
        localStorage.setItem(this.lastCompletedKey, dateStr);
      } catch(e) {}
      return streak;
    },

    archiveDay: function(state) {
      try {
        var raw = localStorage.getItem(this.historyKey);
        var history = raw ? JSON.parse(raw) : [];
        history.unshift({
          date: state.date,
          missions: state.missions,
          allCompleted: state.allCompleted
        });
        if (history.length > 7) history = history.slice(0, 7);
        localStorage.setItem(this.historyKey, JSON.stringify(history));
      } catch(e) {}
    },

    getHistory: function() {
      try {
        var raw = localStorage.getItem(this.historyKey);
        return raw ? JSON.parse(raw) : [];
      } catch(e) { return []; }
    },

    showNewMissionNotification: function() {
      if (typeof window !== 'undefined' && window.AHMET_Notify) {
        window.AHMET_Notify('New Daily Missions Available!', 'Complete today\'s missions for XP and rewards.');
      }
    },

    generateShareText: function(state) {
      var completed = state.missions.filter(function(m) { return m.completed; });
      var total = state.missions.length;
      var lines = ['AHMET Daily Missions - ' + state.date];
      lines.push('Completed: ' + completed.length + '/' + total);
      completed.forEach(function(m) {
        lines.push('  ✓ ' + m.title + ' (' + m.difficulty + ')');
      });
      lines.push('Play AHMET and beat my missions!');
      return lines.join('\n');
    },

    getCompletionPercentage: function(state) {
      if (!state || !state.missions || state.missions.length === 0) return 0;
      var done = state.missions.filter(function(m) { return m.completed; }).length;
      return Math.round((done / state.missions.length) * 100);
    },

    getMissionsExpiringSoon: function(state, minutesThreshold) {
      minutesThreshold = minutesThreshold || 60;
      var now = Date.now();
      return (state ? state.missions : []).filter(function(m) {
        if (m.completed) return false;
        var exp = new Date(m.expires).getTime();
        return (exp - now) < (minutesThreshold * 60000);
      });
    },

    calculateDailyXP: function(state) {
      if (!state) return 0;
      return state.missions.reduce(function(sum, m) {
        return m.completed ? sum + m.xpReward : sum;
      }, 0);
    },

    calculateDailyCoins: function(state) {
      if (!state) return 0;
      return state.missions.reduce(function(sum, m) {
        return m.completed ? sum + m.coinReward : sum;
      }, 0);
    },

    getDifficultyBreakdown: function(state) {
      if (!state) return {};
      var result = { easy: { total: 0, done: 0 }, medium: { total: 0, done: 0 }, hard: { total: 0, done: 0 } };
      state.missions.forEach(function(m) {
        if (result[m.difficulty]) {
          result[m.difficulty].total++;
          if (m.completed) result[m.difficulty].done++;
        }
      });
      return result;
    }
  };

})();

// ============================================================
// WEEKLY_CHALLENGES MODULE
// ============================================================
(function() {
  'use strict';

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function getWeekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function getWeekSeed(date) {
    var week = getWeekNumber(date);
    var year = date.getFullYear();
    var str = year + 'W' + String(week).padStart(2, '0');
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  var WEEKLY_CHALLENGE_POOL = [
    {
      id: 'wc_distance_total',
      title: 'Grand Tour',
      description: 'Travel a total of {target} km this week across all your runs.',
      type: 'distance_total',
      baseTarget: 100000,
      scaleFactor: 0.05,
      icon: 'wc_distance',
      category: 'endurance'
    },
    {
      id: 'wc_coins_total',
      title: 'Coin Frenzy',
      description: 'Collect a total of {target} coins this week.',
      type: 'coins_total',
      baseTarget: 5000,
      scaleFactor: 0.03,
      icon: 'wc_coins',
      category: 'collection'
    },
    {
      id: 'wc_tricks_total',
      title: 'Trick Parade',
      description: 'Perform a total of {target} tricks this week.',
      type: 'tricks_total',
      baseTarget: 200,
      scaleFactor: 0.04,
      icon: 'wc_tricks',
      category: 'tricks'
    },
    {
      id: 'wc_vehicle_truck',
      title: 'Truck Week',
      description: 'Win {target} races this week using any truck.',
      type: 'vehicle_specific',
      vehicleClass: 'truck',
      baseTarget: 10,
      scaleFactor: 0.02,
      icon: 'wc_truck',
      category: 'vehicle'
    },
    {
      id: 'wc_vehicle_supercar',
      title: 'Supercar Showdown',
      description: 'Complete {target} runs this week in a supercar.',
      type: 'vehicle_specific',
      vehicleClass: 'supercar',
      baseTarget: 15,
      scaleFactor: 0.02,
      icon: 'wc_supercar',
      category: 'vehicle'
    },
    {
      id: 'wc_map_forest',
      title: 'Forest Ranger',
      description: 'Travel {target} meters on forest maps this week.',
      type: 'map_specific',
      mapType: 'forest',
      baseTarget: 50000,
      scaleFactor: 0.04,
      icon: 'wc_forest',
      category: 'map'
    },
    {
      id: 'wc_map_desert',
      title: 'Desert Storm',
      description: 'Travel {target} meters on desert maps this week.',
      type: 'map_specific',
      mapType: 'desert',
      baseTarget: 50000,
      scaleFactor: 0.04,
      icon: 'wc_desert',
      category: 'map'
    },
    {
      id: 'wc_tournament_wins',
      title: 'Tournament King',
      description: 'Win {target} tournaments this week.',
      type: 'tournament_wins',
      baseTarget: 5,
      scaleFactor: 0.02,
      icon: 'wc_tournament',
      category: 'competitive'
    },
    {
      id: 'wc_speed_challenge',
      title: 'Speed Week',
      description: 'Reach {target} km/h in total combined speed readings this week.',
      type: 'speed_total',
      baseTarget: 500,
      scaleFactor: 0.03,
      icon: 'wc_speed',
      category: 'speed'
    },
    {
      id: 'wc_no_crash',
      title: 'Perfect Pilot',
      description: 'Complete {target} runs without crashing this week.',
      type: 'no_crash_runs',
      baseTarget: 20,
      scaleFactor: 0.03,
      icon: 'wc_nocrash',
      category: 'precision'
    },
    {
      id: 'wc_combo',
      title: 'Combo Week',
      description: 'Achieve a trick combo of {target} or more in a single run this week.',
      type: 'max_combo',
      baseTarget: 6,
      scaleFactor: 0.01,
      icon: 'wc_combo',
      category: 'tricks'
    },
    {
      id: 'wc_flips',
      title: 'Flip Week',
      description: 'Perform a total of {target} backflips this week.',
      type: 'flips_total',
      baseTarget: 100,
      scaleFactor: 0.03,
      icon: 'wc_flips',
      category: 'tricks'
    },
    {
      id: 'wc_diamonds',
      title: 'Diamond Week',
      description: 'Collect {target} diamonds this week.',
      type: 'diamonds_total',
      baseTarget: 50,
      scaleFactor: 0.02,
      icon: 'wc_diamonds',
      category: 'collection'
    },
    {
      id: 'wc_upgrades',
      title: 'Upgrade Frenzy',
      description: 'Apply {target} upgrades to vehicles this week.',
      type: 'upgrades_total',
      baseTarget: 15,
      scaleFactor: 0.02,
      icon: 'wc_upgrades',
      category: 'progression'
    },
    {
      id: 'wc_nitro',
      title: 'Nitro Week',
      description: 'Use nitro {target} times in total this week.',
      type: 'nitro_total',
      baseTarget: 100,
      scaleFactor: 0.03,
      icon: 'wc_nitro',
      category: 'speed'
    }
  ];

  var VETERAN_CHALLENGE = {
    id: 'wc_veteran',
    title: 'Veteran\'s Trial',
    description: 'A special challenge unlocked after 20 weeks of play. Complete all weekly challenges in the same week AND win a tournament AND travel 200 km.',
    type: 'multi_veteran',
    objectives: [
      { type: 'all_weekly_done', label: 'Complete all regular weekly challenges' },
      { type: 'tournament_win', label: 'Win at least one tournament' },
      { type: 'distance_total', target: 200000, label: 'Travel 200 km this week' }
    ],
    unlockCondition: { type: 'weeks_played', value: 20 },
    xpReward: 5000,
    coinReward: 30000,
    diamondReward: 100,
    icon: 'wc_veteran',
    category: 'veteran'
  };

  var COMMUNITY_CHALLENGE = {
    id: 'wc_community',
    title: 'Community Drive',
    description: 'All players together must travel a combined {target} km this week. Every meter counts!',
    type: 'community_distance',
    communityTarget: 50000000,
    icon: 'wc_community',
    category: 'community',
    prizePool: [
      { rank: 1, diamonds: 500, coins: 100000, icon: 'prize_gold' },
      { rank: 2, diamonds: 300, coins: 60000, icon: 'prize_silver' },
      { rank: 3, diamonds: 200, coins: 40000, icon: 'prize_bronze' },
      { rankRange: [4, 10], diamonds: 100, coins: 20000, icon: 'prize_top10' },
      { rankRange: [11, 50], diamonds: 50, coins: 10000, icon: 'prize_top50' },
      { rankRange: [51, 100], diamonds: 25, coins: 5000, icon: 'prize_top100' }
    ]
  };

  window.WEEKLY_CHALLENGES = {
    version: '1.3.0',
    storageKey: 'ahmet_weekly_challenges',
    streakKey: 'ahmet_weekly_streak',
    historyKey: 'ahmet_weekly_history',

    VETERAN_CHALLENGE: VETERAN_CHALLENGE,
    COMMUNITY_CHALLENGE: COMMUNITY_CHALLENGE,

    getCurrentWeekString: function() {
      var now = new Date();
      var week = getWeekNumber(now);
      return now.getFullYear() + '-W' + String(week).padStart(2, '0');
    },

    getNextMondayDate: function() {
      var now = new Date();
      var day = now.getDay();
      var diff = (day === 0) ? 1 : (8 - day);
      var next = new Date(now);
      next.setDate(now.getDate() + diff);
      next.setHours(0, 0, 0, 0);
      return next;
    },

    generateWeeklyChallenges: function(weekStr, weeksPlayed) {
      weeksPlayed = weeksPlayed || 0;
      var now = new Date();
      var seed = getWeekSeed(now);
      var rng = mulberry32(seed);

      // Scale difficulty with week number
      var weekNum = getWeekNumber(now);
      var scaleFactor = 1.0 + (weekNum * 0.02);

      function pickRandom(arr, count) {
        var copy = arr.slice();
        var result = [];
        while (result.length < count && copy.length > 0) {
          var idx = Math.floor(rng() * copy.length);
          result.push(copy.splice(idx, 1)[0]);
        }
        return result;
      }

      var selected = pickRandom(WEEKLY_CHALLENGE_POOL, 5);
      var expires = this.getNextMondayDate().toISOString();

      var challenges = selected.map(function(tmpl) {
        var target = Math.round(tmpl.baseTarget * scaleFactor * (1 + (tmpl.scaleFactor * weekNum)));
        return {
          id: tmpl.id + '_' + weekStr,
          templateId: tmpl.id,
          title: tmpl.title,
          description: tmpl.description.replace('{target}', target.toLocaleString()),
          type: tmpl.type,
          vehicleClass: tmpl.vehicleClass || null,
          mapType: tmpl.mapType || null,
          target: target,
          progress: 0,
          completed: false,
          claimed: false,
          category: tmpl.category,
          icon: tmpl.icon,
          xpReward: Math.round(1000 * scaleFactor),
          coinReward: Math.round(5000 * scaleFactor),
          diamondReward: Math.round(15 * scaleFactor),
          week: weekStr,
          expires: expires
        };
      });

      // Add veteran challenge if unlocked
      if (weeksPlayed >= 20) {
        challenges.push({
          id: VETERAN_CHALLENGE.id + '_' + weekStr,
          templateId: VETERAN_CHALLENGE.id,
          title: VETERAN_CHALLENGE.title,
          description: VETERAN_CHALLENGE.description,
          type: VETERAN_CHALLENGE.type,
          objectives: VETERAN_CHALLENGE.objectives.map(function(obj) {
            return Object.assign({}, obj, { progress: 0, completed: false });
          }),
          progress: 0,
          completed: false,
          claimed: false,
          category: VETERAN_CHALLENGE.category,
          icon: VETERAN_CHALLENGE.icon,
          xpReward: VETERAN_CHALLENGE.xpReward,
          coinReward: VETERAN_CHALLENGE.coinReward,
          diamondReward: VETERAN_CHALLENGE.diamondReward,
          week: weekStr,
          expires: expires,
          isVeteran: true
        });
      }

      // Add community challenge
      challenges.push({
        id: COMMUNITY_CHALLENGE.id + '_' + weekStr,
        templateId: COMMUNITY_CHALLENGE.id,
        title: COMMUNITY_CHALLENGE.title,
        description: COMMUNITY_CHALLENGE.description.replace('{target}', (COMMUNITY_CHALLENGE.communityTarget / 1000).toLocaleString()),
        type: COMMUNITY_CHALLENGE.type,
        communityTarget: COMMUNITY_CHALLENGE.communityTarget,
        communityProgress: 0,
        personalContribution: 0,
        completed: false,
        claimed: false,
        category: COMMUNITY_CHALLENGE.category,
        icon: COMMUNITY_CHALLENGE.icon,
        prizePool: COMMUNITY_CHALLENGE.prizePool,
        week: weekStr,
        expires: expires,
        isCommunity: true
      });

      return challenges;
    },

    loadState: function() {
      try {
        var raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : null;
      } catch(e) { return null; }
    },

    saveState: function(state) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
      } catch(e) {}
    },

    getOrCreateWeeklyChallenges: function(weeksPlayed) {
      var weekStr = this.getCurrentWeekString();
      var state = this.loadState();
      if (state && state.week === weekStr) return state;
      if (state) this.archiveWeek(state);
      var challenges = this.generateWeeklyChallenges(weekStr, weeksPlayed);
      var newState = { week: weekStr, challenges: challenges, allCompleted: false };
      this.saveState(newState);
      return newState;
    },

    updateProgress: function(challengeId, progress) {
      var state = this.loadState();
      if (!state) return false;
      var challenge = state.challenges.find(function(c) { return c.id === challengeId; });
      if (!challenge || challenge.completed) return false;
      challenge.progress = Math.min(progress, challenge.target || Infinity);
      if (challenge.target && challenge.progress >= challenge.target) {
        challenge.completed = true;
        this.checkAllCompleted(state);
      }
      this.saveState(state);
      return challenge.completed;
    },

    updateObjectiveProgress: function(challengeId, objectiveType, progress) {
      var state = this.loadState();
      if (!state) return false;
      var challenge = state.challenges.find(function(c) { return c.id === challengeId && c.isVeteran; });
      if (!challenge) return false;
      var obj = (challenge.objectives || []).find(function(o) { return o.type === objectiveType; });
      if (obj) {
        obj.progress = progress;
        if (obj.target && progress >= obj.target) obj.completed = true;
        else if (!obj.target) obj.completed = true;
      }
      var allObjDone = challenge.objectives.every(function(o) { return o.completed; });
      if (allObjDone && !challenge.completed) {
        challenge.completed = true;
        this.checkAllCompleted(state);
      }
      this.saveState(state);
      return challenge.completed;
    },

    updateCommunityProgress: function(challengeId, communityProgress, personalContribution) {
      var state = this.loadState();
      if (!state) return false;
      var challenge = state.challenges.find(function(c) { return c.id === challengeId && c.isCommunity; });
      if (!challenge) return false;
      challenge.communityProgress = communityProgress;
      challenge.personalContribution = personalContribution;
      if (communityProgress >= challenge.communityTarget && !challenge.completed) {
        challenge.completed = true;
      }
      this.saveState(state);
      return challenge.completed;
    },

    checkAllCompleted: function(state) {
      var regularDone = state.challenges
        .filter(function(c) { return !c.isCommunity; })
        .every(function(c) { return c.completed; });
      if (regularDone && !state.allCompleted) {
        state.allCompleted = true;
        this.recordStreak(state.week);
      }
    },

    recordStreak: function(weekStr) {
      try {
        var raw = localStorage.getItem(this.streakKey);
        var streakData = raw ? JSON.parse(raw) : { count: 0, lastWeek: null };
        if (streakData.lastWeek) {
          // Check consecutive weeks
          streakData.count = (this.isConsecutiveWeek(streakData.lastWeek, weekStr))
            ? streakData.count + 1
            : 1;
        } else {
          streakData.count = 1;
        }
        streakData.lastWeek = weekStr;
        localStorage.setItem(this.streakKey, JSON.stringify(streakData));
        return streakData.count;
      } catch(e) { return 0; }
    },

    isConsecutiveWeek: function(lastWeekStr, currentWeekStr) {
      // Simple check: if years match and weeks are sequential
      var lParts = lastWeekStr.split('-W');
      var cParts = currentWeekStr.split('-W');
      if (lParts.length < 2 || cParts.length < 2) return false;
      var lYear = parseInt(lParts[0], 10);
      var lWeek = parseInt(lParts[1], 10);
      var cYear = parseInt(cParts[0], 10);
      var cWeek = parseInt(cParts[1], 10);
      if (cYear === lYear) return cWeek === lWeek + 1;
      if (cYear === lYear + 1) return lWeek === 52 && cWeek === 1;
      return false;
    },

    getStreak: function() {
      try {
        var raw = localStorage.getItem(this.streakKey);
        var data = raw ? JSON.parse(raw) : { count: 0 };
        return data.count || 0;
      } catch(e) { return 0; }
    },

    getStreakBonus: function() {
      var streak = this.getStreak();
      // Bonus: 100 coins per streak level, capped at 10 weeks = 1000 bonus coins
      return Math.min(streak * 100, 1000);
    },

    archiveWeek: function(state) {
      try {
        var raw = localStorage.getItem(this.historyKey);
        var history = raw ? JSON.parse(raw) : [];
        history.unshift({
          week: state.week,
          challenges: state.challenges,
          allCompleted: state.allCompleted
        });
        if (history.length > 12) history = history.slice(0, 12);
        localStorage.setItem(this.historyKey, JSON.stringify(history));
      } catch(e) {}
    },

    getHistory: function() {
      try {
        var raw = localStorage.getItem(this.historyKey);
        return raw ? JSON.parse(raw) : [];
      } catch(e) { return []; }
    },

    getTimeUntilReset: function() {
      var nextMonday = this.getNextMondayDate();
      var ms = nextMonday.getTime() - Date.now();
      var days = Math.floor(ms / 86400000);
      var hours = Math.floor((ms % 86400000) / 3600000);
      var mins = Math.floor((ms % 3600000) / 60000);
      return { days: days, hours: hours, minutes: mins, totalMs: ms };
    },

    getCompletionPercentage: function(state) {
      if (!state || !state.challenges || state.challenges.length === 0) return 0;
      var done = state.challenges.filter(function(c) { return c.completed; }).length;
      return Math.round((done / state.challenges.length) * 100);
    },

    getPrizeForRank: function(rank) {
      var prizePool = COMMUNITY_CHALLENGE.prizePool;
      for (var i = 0; i < prizePool.length; i++) {
        var prize = prizePool[i];
        if (prize.rank === rank) return prize;
        if (prize.rankRange && rank >= prize.rankRange[0] && rank <= prize.rankRange[1]) return prize;
      }
      return null;
    },

    getLeaderboardSnapshot: function(state) {
      // Simulated leaderboard data structure
      var commChallenge = (state ? state.challenges : []).find(function(c) { return c.isCommunity; });
      return {
        week: state ? state.week : this.getCurrentWeekString(),
        communityTarget: COMMUNITY_CHALLENGE.communityTarget,
        communityProgress: commChallenge ? commChallenge.communityProgress : 0,
        personalContribution: commChallenge ? commChallenge.personalContribution : 0,
        completionPercent: commChallenge
          ? Math.min(100, Math.round((commChallenge.communityProgress / COMMUNITY_CHALLENGE.communityTarget) * 100))
          : 0
      };
    },

    claimReward: function(challengeId) {
      var state = this.loadState();
      if (!state) return null;
      var challenge = state.challenges.find(function(c) { return c.id === challengeId; });
      if (!challenge || !challenge.completed || challenge.claimed) return null;
      challenge.claimed = true;
      var streakBonus = this.getStreakBonus();
      var reward = {
        xp: (challenge.xpReward || 0),
        coins: (challenge.coinReward || 0) + streakBonus,
        diamonds: challenge.diamondReward || 0,
        streakBonus: streakBonus,
        streak: this.getStreak()
      };
      this.saveState(state);
      return reward;
    },

    generateShareText: function(state) {
      if (!state) return '';
      var done = (state.challenges || []).filter(function(c) { return c.completed; }).length;
      var total = (state.challenges || []).length;
      var streak = this.getStreak();
      return [
        'AHMET Weekly Challenges - ' + state.week,
        'Completed: ' + done + '/' + total,
        'Streak: ' + streak + ' week' + (streak !== 1 ? 's' : ''),
        'Play AHMET and join the competition!'
      ].join('\n');
    }
  };

})();

// ============================================================
// TROPHY_ROOM MODULE
// ============================================================
(function() {
  'use strict';

  var TROPHY_DEFINITIONS = [
    // ==================== BRONZE TROPHIES ====================
    {
      id: 'trophy_first_run',
      name: 'Rookie Driver',
      description: 'Awarded to every driver who completes their very first run. The road starts here.',
      longDescription: 'You hit the gas and never looked back. This trophy commemorates the moment you started your Ahmet journey. Bronze, but priceless to those who earned it first.',
      category: 'bronze',
      points: 10,
      rarity: 1.0,
      rarityLabel: '100% of players',
      icon: 'trophy_bronze_first_run',
      linkedAchievement: 'first_100m',
      unlockCondition: { type: 'runs_completed', value: 1 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_first_flip',
      name: 'The Acrobat',
      description: 'Performed their very first backflip. Gravity? Just a suggestion.',
      longDescription: 'You pulled back on the controls at just the right moment, tilted, spun, and came back around. The crowd went wild. This bronze trophy celebrates the beginning of your aerial adventures.',
      category: 'bronze',
      points: 15,
      rarity: 0.85,
      rarityLabel: '85% of players',
      icon: 'trophy_bronze_flip',
      linkedAchievement: 'first_flip',
      unlockCondition: { type: 'backflips', value: 1 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_first_km',
      name: 'Kilometer Rookie',
      description: 'Traveled 1 km in a single run. A small step for a driver, a giant leap for fun.',
      longDescription: 'One full kilometer behind you and the engine still roaring. This trophy marks the point where you stopped being a beginner and started being a driver. Bronze, but meaningful.',
      category: 'bronze',
      points: 20,
      rarity: 0.80,
      rarityLabel: '80% of players',
      icon: 'trophy_bronze_1km',
      linkedAchievement: 'first_1km',
      unlockCondition: { type: 'single_run_distance', value: 1000 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_first_vehicle',
      name: 'Garage Starter',
      description: 'Unlocked their first non-default vehicle. The collection has begun.',
      longDescription: 'You spent your hard-earned coins on something new. That decision changed everything. This trophy is for the curious drivers who knew one vehicle was never going to be enough.',
      category: 'bronze',
      points: 25,
      rarity: 0.70,
      rarityLabel: '70% of players',
      icon: 'trophy_bronze_vehicle',
      linkedAchievement: 'first_vehicle',
      unlockCondition: { type: 'vehicles_owned', value: 2 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_first_upgrade',
      name: 'The Tinkerer',
      description: 'Applied the first upgrade to a vehicle. The garage is now your laboratory.',
      longDescription: 'You opened the upgrade menu, looked at that first stat, and said: more. This bronze trophy is for all the engineers who know that stock is just a starting point.',
      category: 'bronze',
      points: 20,
      rarity: 0.75,
      rarityLabel: '75% of players',
      icon: 'trophy_bronze_upgrade',
      linkedAchievement: 'upgrade_1',
      unlockCondition: { type: 'upgrades_applied', value: 1 },
      showcaseEligible: false,
      seasonExclusive: false
    },
    {
      id: 'trophy_first_tournament',
      name: 'Arena Entrant',
      description: 'Stepped into the competitive arena for the first time. Brave move.',
      longDescription: 'The leaderboard was full of names that meant nothing yet. You signed up anyway. This bronze trophy is for every player who decided that playing against the world sounded like a great idea.',
      category: 'bronze',
      points: 30,
      rarity: 0.55,
      rarityLabel: '55% of players',
      icon: 'trophy_bronze_tournament',
      linkedAchievement: 'tournament_enter',
      unlockCondition: { type: 'tournaments_entered', value: 1 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_week_warrior',
      name: 'Weekly Devotee',
      description: 'Played 7 days in a row. Dedication is its own reward.',
      longDescription: 'You showed up every single day for a week. Morning runs, evening sessions, lunch-break drifts. This bronze trophy is for those who made Ahmet part of their daily routine.',
      category: 'bronze',
      points: 35,
      rarity: 0.45,
      rarityLabel: '45% of players',
      icon: 'trophy_bronze_streak',
      linkedAchievement: 'daily_7',
      unlockCondition: { type: 'login_streak', value: 7 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_coin_starter',
      name: 'Small Fortune',
      description: 'Collected 1,000 total coins. Every fortune starts somewhere.',
      longDescription: 'A thousand coins. In this game that may not seem like much, but every coin you collected was earned by skill, speed, and daring. This bronze trophy celebrates your first financial milestone.',
      category: 'bronze',
      points: 20,
      rarity: 0.70,
      rarityLabel: '70% of players',
      icon: 'trophy_bronze_coins',
      linkedAchievement: 'coin_1000',
      unlockCondition: { type: 'coins_total', value: 1000 },
      showcaseEligible: false,
      seasonExclusive: false
    },
    {
      id: 'trophy_trick_learner',
      name: 'Trick Apprentice',
      description: 'Performed 50 total tricks. Learning the art of the stunt.',
      longDescription: 'Fifty tricks means fifty moments of airborne glory, fifty controlled spins, fifty perfect landings (or not-so-perfect ones). This trophy is for the students who became masters.',
      category: 'bronze',
      points: 25,
      rarity: 0.65,
      rarityLabel: '65% of players',
      icon: 'trophy_bronze_tricks',
      linkedAchievement: null,
      unlockCondition: { type: 'total_tricks', value: 50 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_speed_starter',
      name: 'Fast Lane Newcomer',
      description: 'Reached 100 km/h for the first time. Speed is a drug.',
      longDescription: 'Triple digits on the speedometer. The wind was deafening, the terrain was a blur, and you wanted more. This bronze trophy is your first taste of what going fast truly feels like.',
      category: 'bronze',
      points: 20,
      rarity: 0.72,
      rarityLabel: '72% of players',
      icon: 'trophy_bronze_speed',
      linkedAchievement: 'speed_racer',
      unlockCondition: { type: 'max_speed', value: 100 },
      showcaseEligible: false,
      seasonExclusive: false
    },

    // ==================== SILVER TROPHIES ====================
    {
      id: 'trophy_marathon_silver',
      name: 'Marathon Driver',
      description: 'Traveled 42 km in total across all runs. A true endurance achievement.',
      longDescription: 'The classic marathon distance, covered not on foot but on four wheels and a roaring engine. Hill after hill, jump after jump, you kept going. This silver trophy recognizes true endurance.',
      category: 'silver',
      points: 75,
      rarity: 0.40,
      rarityLabel: '40% of players',
      icon: 'trophy_silver_marathon',
      linkedAchievement: 'marathon',
      unlockCondition: { type: 'total_distance', value: 42000 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_garage_5',
      name: 'Small Fleet',
      description: 'Owns 5 different vehicles. A diverse collection is taking shape.',
      longDescription: 'Five different machines in your garage. Each one with its own personality, strengths, and quirks. This silver trophy is for collectors who see vehicles not just as tools but as characters.',
      category: 'silver',
      points: 80,
      rarity: 0.42,
      rarityLabel: '42% of players',
      icon: 'trophy_silver_garage',
      linkedAchievement: 'collector_5',
      unlockCondition: { type: 'vehicles_owned', value: 5 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_monthly_play',
      name: 'Monthly Devotee',
      description: 'Played 30 days in a row. A month of consistent commitment.',
      longDescription: 'Thirty days without missing a single session. Through weekends, weekdays, late nights and early mornings, you showed up. This silver trophy is for the truly dedicated.',
      category: 'silver',
      points: 120,
      rarity: 0.22,
      rarityLabel: '22% of players',
      icon: 'trophy_silver_streak30',
      linkedAchievement: 'daily_30',
      unlockCondition: { type: 'login_streak', value: 30 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_trick_200',
      name: 'Trick Veteran',
      description: 'Performed 200 total tricks. The stunts never stop.',
      longDescription: 'Two hundred tricks performed. That is two hundred moments of controlled chaos, two hundred stories of daring maneuvers. This silver trophy sits in the halls of those who truly mastered the art.',
      category: 'silver',
      points: 90,
      rarity: 0.35,
      rarityLabel: '35% of players',
      icon: 'trophy_silver_tricks',
      linkedAchievement: null,
      unlockCondition: { type: 'total_tricks', value: 200 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_tournament_win',
      name: 'Arena Victor',
      description: 'Won their first tournament. You came, you raced, you conquered.',
      longDescription: 'Crossing the finish line first in a tournament is a different kind of feeling. You were not just better than the terrain — you were better than every other player. This silver trophy is proof.',
      category: 'silver',
      points: 150,
      rarity: 0.18,
      rarityLabel: '18% of players',
      icon: 'trophy_silver_tournament',
      linkedAchievement: 'tournament_win',
      unlockCondition: { type: 'tournaments_won', value: 1 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_speed_150',
      name: 'Speed Demon',
      description: 'Reached 150 km/h. The world is barely a blur at this speed.',
      longDescription: 'One hundred and fifty kilometers per hour. The terrain becomes a smear of color, the obstacles appear and vanish in milliseconds, and your reflexes are tested to their absolute limit. Silver, earned in fire.',
      category: 'silver',
      points: 100,
      rarity: 0.30,
      rarityLabel: '30% of players',
      icon: 'trophy_silver_speed',
      linkedAchievement: 'speed_demon',
      unlockCondition: { type: 'max_speed', value: 150 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_coin_10k',
      name: 'Growing Wealth',
      description: 'Collected 10,000 total coins. A substantial fortune is forming.',
      longDescription: 'Ten thousand coins collected. You have chased every glimmering circle on every terrain type. This silver trophy is for the dedicated collectors who see every coin as a personal challenge.',
      category: 'silver',
      points: 85,
      rarity: 0.38,
      rarityLabel: '38% of players',
      icon: 'trophy_silver_coins',
      linkedAchievement: null,
      unlockCondition: { type: 'coins_total', value: 10000 },
      showcaseEligible: false,
      seasonExclusive: false
    },
    {
      id: 'trophy_explorer_10',
      name: 'Map Explorer',
      description: 'Played on 10 different maps. Variety is the heart of adventure.',
      longDescription: 'You have seen forests, deserts, cities, lunar surfaces, and more. Ten distinct worlds conquered by four wheels and determination. This silver trophy rewards those who refuse to stay on the same road.',
      category: 'silver',
      points: 110,
      rarity: 0.33,
      rarityLabel: '33% of players',
      icon: 'trophy_silver_explorer',
      linkedAchievement: 'explorer',
      unlockCondition: { type: 'unique_maps_played', value: 10 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_triple_flip',
      name: 'Flip Master',
      description: 'Completed a triple backflip. Three full rotations in a single jump.',
      longDescription: 'One flip is impressive. Two is showing off. Three is a statement. This silver trophy belongs to the handful of drivers who have the skill, the nerve, and the ramps to pull off a full triple rotation.',
      category: 'silver',
      points: 130,
      rarity: 0.15,
      rarityLabel: '15% of players',
      icon: 'trophy_silver_triple_flip',
      linkedAchievement: 'triple_flip',
      unlockCondition: { type: 'triple_backflip', value: 1 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_survivor_silver',
      name: 'Crash-Free Champion',
      description: 'Completed a hard map run without a single crash. Nerves of steel.',
      longDescription: 'Hard maps are brutal. Obstacles come fast, terrain shifts suddenly, and one tiny mistake means starting over. You navigated all of it without a scratch. This silver trophy is richly deserved.',
      category: 'silver',
      points: 140,
      rarity: 0.12,
      rarityLabel: '12% of players',
      icon: 'trophy_silver_survivor',
      linkedAchievement: 'survivor',
      unlockCondition: { type: 'no_crash_hard_map', value: true },
      showcaseEligible: true,
      seasonExclusive: false
    },

    // ==================== GOLD TROPHIES ====================
    {
      id: 'trophy_globetrotter',
      name: 'Globetrotter',
      description: 'Traveled a total of 1,000 km across all runs. A legendary distance.',
      longDescription: 'One thousand kilometers. Across every terrain, in every vehicle, through every weather condition the game could throw at you. You kept driving. This gold trophy stands as testament to extraordinary persistence.',
      category: 'gold',
      points: 300,
      rarity: 0.08,
      rarityLabel: '8% of players',
      icon: 'trophy_gold_globetrotter',
      linkedAchievement: 'globetrotter',
      unlockCondition: { type: 'total_distance', value: 1000000 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_champion',
      name: 'Tournament Champion',
      description: 'Won 5 tournaments. A dominant and consistent competitive force.',
      longDescription: 'Five tournament wins. Not once, not twice, but five times you stood atop the leaderboard after beating every other driver. This gold trophy declares you a champion in every sense of the word.',
      category: 'gold',
      points: 350,
      rarity: 0.06,
      rarityLabel: '6% of players',
      icon: 'trophy_gold_champion',
      linkedAchievement: 'champion',
      unlockCondition: { type: 'tournaments_won', value: 5 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_upgrade_master',
      name: 'Perfect Machine',
      description: 'Maxed out every stat on a single vehicle. Engineering perfection achieved.',
      longDescription: 'Every stat pushed to its absolute maximum on a single vehicle. Speed, power, fuel efficiency, grip — all optimized, all maxed. This gold trophy is for the obsessive engineers who refuse anything less than perfect.',
      category: 'gold',
      points: 320,
      rarity: 0.07,
      rarityLabel: '7% of players',
      icon: 'trophy_gold_upgrade',
      linkedAchievement: 'upgrade_master',
      unlockCondition: { type: 'all_stats_maxed_one_vehicle', value: true },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_trick_master',
      name: 'Trick Legend',
      description: 'Performed 1,000 total tricks. A lifetime of gravity-defying artistry.',
      longDescription: 'A thousand tricks. Each one a moment of deliberate, skillful chaos. Each one a story. This gold trophy is for the stunt artists who live for those airborne seconds and the satisfaction of a perfect landing.',
      category: 'gold',
      points: 280,
      rarity: 0.09,
      rarityLabel: '9% of players',
      icon: 'trophy_gold_tricks',
      linkedAchievement: 'trick_master',
      unlockCondition: { type: 'total_tricks', value: 1000 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_coin_100k',
      name: 'Coin Baron',
      description: 'Collected 100,000 total coins. A vast fortune accumulated on the road.',
      longDescription: 'A hundred thousand coins. You did not just collect — you hunted, you chased, you planned routes around every glint of gold. This gold trophy is for the most dedicated coin collectors in the game.',
      category: 'gold',
      points: 260,
      rarity: 0.10,
      rarityLabel: '10% of players',
      icon: 'trophy_gold_coins',
      linkedAchievement: null,
      unlockCondition: { type: 'coins_total', value: 100000 },
      showcaseEligible: false,
      seasonExclusive: false
    },
    {
      id: 'trophy_century_streak',
      name: 'Centurion',
      description: 'Played 100 days in a row. One hundred days of unbroken dedication.',
      longDescription: 'One hundred consecutive days. Through holidays, work, travel, and every obstacle life threw at you, you logged in and drove. This gold trophy is one of the rarest marks of commitment in Ahmet.',
      category: 'gold',
      points: 400,
      rarity: 0.03,
      rarityLabel: '3% of players',
      icon: 'trophy_gold_streak100',
      linkedAchievement: 'daily_100',
      unlockCondition: { type: 'login_streak', value: 100 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_speed_200',
      name: 'Speed Legend',
      description: 'Reached 200 km/h. Maximum velocity, maximum respect.',
      longDescription: 'Two hundred kilometers per hour. At this speed, the game is playing you. Your reflexes operate faster than conscious thought. This gold trophy is reserved for drivers who have transcended skill and entered instinct.',
      category: 'gold',
      points: 300,
      rarity: 0.07,
      rarityLabel: '7% of players',
      icon: 'trophy_gold_speed',
      linkedAchievement: 'speed_legend',
      unlockCondition: { type: 'max_speed', value: 200 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_garage_15',
      name: 'Fleet Commander',
      description: 'Owns 15 different vehicles. A commander of machines.',
      longDescription: 'Fifteen unique vehicles, each a different philosophy of speed and power. This gold trophy goes to collectors who understand that diversity in the garage means readiness for any challenge.',
      category: 'gold',
      points: 270,
      rarity: 0.09,
      rarityLabel: '9% of players',
      icon: 'trophy_gold_garage',
      linkedAchievement: 'collector_15',
      unlockCondition: { type: 'vehicles_owned', value: 15 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_world_tour',
      name: 'World Tour Champion',
      description: 'Traveled 100 km on every single map. The ultimate explorer.',
      longDescription: 'Every map in the game, 100 km covered on each one. You have left tire tracks across the entire AHMET universe. This gold trophy is for drivers who take the phrase world tour quite literally.',
      category: 'gold',
      points: 380,
      rarity: 0.04,
      rarityLabel: '4% of players',
      icon: 'trophy_gold_world_tour',
      linkedAchievement: 'world_tour',
      unlockCondition: { type: 'distance_per_map', value: 100000 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_ironman',
      name: 'Ironman Driver',
      description: 'Completed 10 consecutive runs without a single game over.',
      longDescription: 'Ten runs in a row without touching the game over screen. No lucky saves, no near misses that ended badly — ten clean, complete, successful runs in sequence. This gold trophy is for drivers with iron nerves.',
      category: 'gold',
      points: 290,
      rarity: 0.08,
      rarityLabel: '8% of players',
      icon: 'trophy_gold_ironman',
      linkedAchievement: 'ironman',
      unlockCondition: { type: 'consecutive_runs_no_game_over', value: 10 },
      showcaseEligible: true,
      seasonExclusive: false
    },

    // ==================== PLATINUM TROPHIES ====================
    {
      id: 'trophy_coin_millionaire',
      name: 'Coin Millionaire',
      description: 'Collected 1,000,000 total coins. An extraordinary achievement of persistence.',
      longDescription: 'One million coins. Let that sink in. You have collected, hunted, and swept every surface clean of coins across thousands of runs and hundreds of hours. This platinum trophy is nearly unique.',
      category: 'platinum',
      points: 600,
      rarity: 0.015,
      rarityLabel: '1.5% of players',
      icon: 'trophy_platinum_coins',
      linkedAchievement: 'coin_millionaire',
      unlockCondition: { type: 'coins_total', value: 1000000 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_all_maps',
      name: 'Map Completionist',
      description: 'Played on every single map in the game. No terrain left unexplored.',
      longDescription: 'Every map unlocked, every terrain conquered. From the first grassy hills to the most exotic and hostile environments the game offers, you have driven on all of them. Platinum for the truly thorough.',
      category: 'platinum',
      points: 550,
      rarity: 0.025,
      rarityLabel: '2.5% of players',
      icon: 'trophy_platinum_all_maps',
      linkedAchievement: 'all_maps',
      unlockCondition: { type: 'all_maps_played', value: true },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_full_garage',
      name: 'Category Completionist',
      description: 'Owns every vehicle in at least one category. A complete collection.',
      longDescription: 'Every single vehicle in an entire category. No gaps, no missing pieces — a flawless, complete set. This platinum trophy recognizes drivers who take collecting to its logical, beautiful conclusion.',
      category: 'platinum',
      points: 580,
      rarity: 0.02,
      rarityLabel: '2% of players',
      icon: 'trophy_platinum_garage',
      linkedAchievement: 'full_garage',
      unlockCondition: { type: 'full_category', value: true },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_vehicle_master',
      name: 'Vehicle Virtuoso',
      description: 'Completed full vehicle mastery on any vehicle. True dedication to a machine.',
      longDescription: 'Mastery is not just about upgrades. It is about understanding a vehicle so deeply that you and the machine become one unit. This platinum trophy is awarded to those who have achieved that rare unity.',
      category: 'platinum',
      points: 620,
      rarity: 0.018,
      rarityLabel: '1.8% of players',
      icon: 'trophy_platinum_mastery',
      linkedAchievement: 'vehicle_master',
      unlockCondition: { type: 'vehicle_mastery_complete', value: 1 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_veteran_player',
      name: 'Road Veteran',
      description: 'Played for 100 total hours. An extraordinary investment of time and passion.',
      longDescription: 'One hundred hours of your life spent racing, jumping, and exploring. That is four days of continuous play. You did not just like this game — you made it part of who you are. Platinum, fully earned.',
      category: 'platinum',
      points: 700,
      rarity: 0.012,
      rarityLabel: '1.2% of players',
      icon: 'trophy_platinum_veteran',
      linkedAchievement: 'veteran',
      unlockCondition: { type: 'total_play_time', value: 360000 },
      showcaseEligible: true,
      seasonExclusive: false
    },

    // ==================== DIAMOND TROPHIES ====================
    {
      id: 'trophy_diamond_magnate',
      name: 'Diamond Baron',
      description: 'Collected 10,000 total diamonds. Priceless and powerful.',
      longDescription: 'Ten thousand diamonds. Each one found, each one earned through skill and exploration. This diamond trophy is one of the rarest items a player can display. Only the most committed diamond hunters achieve it.',
      category: 'diamond',
      points: 1000,
      rarity: 0.005,
      rarityLabel: '0.5% of players',
      icon: 'trophy_diamond_magnate',
      linkedAchievement: 'diamond_magnate',
      unlockCondition: { type: 'diamonds_collected', value: 10000 },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_all_vehicles',
      name: 'Ultimate Collector',
      description: 'Owns every single vehicle in the game. An unmatched achievement.',
      longDescription: 'Every vehicle. All of them. Not almost all, not most — every single one. The research, the grinding, the spending, the strategy — it all culminated here. This diamond trophy is the pinnacle of collecting.',
      category: 'diamond',
      points: 1200,
      rarity: 0.003,
      rarityLabel: '0.3% of players',
      icon: 'trophy_diamond_all_vehicles',
      linkedAchievement: 'all_vehicles',
      unlockCondition: { type: 'all_vehicles_owned', value: true },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_secret_master',
      name: 'Secret Seeker',
      description: 'Discovered all 25 secret achievements. You know this game better than most developers.',
      longDescription: 'Twenty-five hidden achievements, each one a puzzle wrapped in a game. You found them all through experimentation, deduction, and sheer determination. This diamond trophy is for those who see the game behind the game.',
      category: 'diamond',
      points: 1500,
      rarity: 0.002,
      rarityLabel: '0.2% of players',
      icon: 'trophy_diamond_secrets',
      linkedAchievement: 'secret_all_secrets',
      unlockCondition: { type: 'all_secrets_unlocked', value: true },
      showcaseEligible: true,
      seasonExclusive: false
    },

    // ==================== LEGENDARY TROPHIES ====================
    {
      id: 'trophy_legendary_collector',
      name: 'Legendary Collector',
      description: 'Unlocked every achievement in the game. An incomprehensible feat.',
      longDescription: 'Every. Single. Achievement. Speed, tricks, distance, collection, vehicles, social, secrets — all of them unlocked, all of them conquered. You are not just a player. You are a legend. This trophy is yours and yours alone.',
      category: 'legendary',
      points: 5000,
      rarity: 0.0005,
      rarityLabel: '0.05% of players',
      icon: 'trophy_legendary_all',
      linkedAchievement: null,
      unlockCondition: { type: 'all_achievements_unlocked', value: true },
      showcaseEligible: true,
      seasonExclusive: false
    },
    {
      id: 'trophy_legendary_speed',
      name: 'Speed God',
      description: 'Reached max speed on every map type in the game. Absolute velocity mastery.',
      longDescription: 'Maximum speed. On every map. In every biome, every terrain type, every weather condition the game offers, you have pushed a vehicle to its absolute limit. There is no higher achievement of pure speed in Ahmet.',
      category: 'legendary',
      points: 3000,
      rarity: 0.001,
      rarityLabel: '0.1% of players',
      icon: 'trophy_legendary_speed',
      linkedAchievement: 'light_speed',
      unlockCondition: { type: 'max_speed_all_maps', value: true },
      showcaseEligible: true,
      seasonExclusive: false
    },

    // ==================== SEASON TROPHIES ====================
    {
      id: 'trophy_season_1',
      name: 'Season 1 Veteran',
      description: 'Participated in Season 1 of Ahmet competitive play.',
      longDescription: 'You were there at the beginning. Season 1 was chaotic, exciting, and full of firsts. This exclusive trophy can never be earned again — it belongs only to those who lived through the original season.',
      category: 'bronze',
      points: 100,
      rarity: 0.30,
      rarityLabel: '30% of Season 1 players',
      icon: 'trophy_season_1',
      linkedAchievement: null,
      unlockCondition: { type: 'season_participation', season: 1 },
      showcaseEligible: true,
      seasonExclusive: true,
      season: 1
    },
    {
      id: 'trophy_season_2',
      name: 'Season 2 Champion',
      description: 'Finished in the top 100 of Season 2. A competitive legend.',
      longDescription: 'Top 100 in all of Season 2. You competed every week, improved every session, and ended up among the very best. This silver-tier season trophy carries the weight of months of dedication.',
      category: 'silver',
      points: 200,
      rarity: 0.01,
      rarityLabel: 'Top 100 Season 2 players',
      icon: 'trophy_season_2',
      linkedAchievement: null,
      unlockCondition: { type: 'season_rank', season: 2, maxRank: 100 },
      showcaseEligible: true,
      seasonExclusive: true,
      season: 2
    },
    {
      id: 'trophy_tournament_set',
      name: 'Tournament Trophy Set',
      description: 'Won tournaments in 5 different vehicle categories.',
      longDescription: 'Not just winning once in your favorite vehicle — winning across five entirely different vehicle categories. This trophy proves you are not a one-trick racer. You are the complete package.',
      category: 'gold',
      points: 450,
      rarity: 0.025,
      rarityLabel: '2.5% of players',
      icon: 'trophy_tournament_set',
      linkedAchievement: null,
      unlockCondition: { type: 'tournament_wins_in_categories', value: 5 },
      showcaseEligible: true,
      seasonExclusive: false
    }
  ];

  window.TROPHY_ROOM = {
    version: '2.0.0',
    storageKey: 'ahmet_trophy_room',
    showcaseKey: 'ahmet_trophy_showcase',
    maxShowcase: 5,

    trophies: TROPHY_DEFINITIONS,

    CATEGORY_ORDER: ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary'],

    CATEGORY_POINTS: {
      bronze: 1,
      silver: 3,
      gold: 8,
      platinum: 20,
      diamond: 50,
      legendary: 200
    },

    getTrophyById: function(id) {
      return this.trophies.find(function(t) { return t.id === id; }) || null;
    },

    getTrophiesByCategory: function(category) {
      return this.trophies.filter(function(t) { return t.category === category; });
    },

    getSeasonExclusive: function() {
      return this.trophies.filter(function(t) { return t.seasonExclusive; });
    },

    getShowcaseEligible: function() {
      return this.trophies.filter(function(t) { return t.showcaseEligible; });
    },

    loadState: function() {
      try {
        var raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : { unlockedIds: [], unlockDates: {} };
      } catch(e) { return { unlockedIds: [], unlockDates: {} }; }
    },

    saveState: function(state) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
      } catch(e) {}
    },

    unlockTrophy: function(trophyId) {
      var state = this.loadState();
      if (state.unlockedIds.indexOf(trophyId) !== -1) return false;
      state.unlockedIds.push(trophyId);
      state.unlockDates[trophyId] = new Date().toISOString();
      this.saveState(state);
      this.triggerCelebration(trophyId);
      return true;
    },

    isTrophyUnlocked: function(trophyId) {
      var state = this.loadState();
      return state.unlockedIds.indexOf(trophyId) !== -1;
    },

    getUnlockedTrophies: function() {
      var state = this.loadState();
      var self = this;
      return state.unlockedIds.map(function(id) {
        return self.getTrophyById(id);
      }).filter(Boolean);
    },

    getLockedTrophies: function() {
      var state = this.loadState();
      return this.trophies.filter(function(t) {
        return state.unlockedIds.indexOf(t.id) === -1;
      });
    },

    getTotalPoints: function() {
      var state = this.loadState();
      var self = this;
      return state.unlockedIds.reduce(function(sum, id) {
        var t = self.getTrophyById(id);
        return sum + (t ? t.points : 0);
      }, 0);
    },

    getMaxPoints: function() {
      return this.trophies.reduce(function(sum, t) { return sum + t.points; }, 0);
    },

    getCompletionByCategory: function() {
      var state = this.loadState();
      var self = this;
      var result = {};
      this.CATEGORY_ORDER.forEach(function(cat) {
        var catTrophies = self.trophies.filter(function(t) { return t.category === cat; });
        var done = catTrophies.filter(function(t) { return state.unlockedIds.indexOf(t.id) !== -1; }).length;
        result[cat] = {
          total: catTrophies.length,
          unlocked: done,
          percent: catTrophies.length > 0 ? Math.round((done / catTrophies.length) * 100) : 0
        };
      });
      return result;
    },

    getOverallCompletion: function() {
      var state = this.loadState();
      var total = this.trophies.length;
      var done = state.unlockedIds.length;
      return {
        total: total,
        unlocked: done,
        percent: total > 0 ? Math.round((done / total) * 100) : 0
      };
    },

    loadShowcase: function() {
      try {
        var raw = localStorage.getItem(this.showcaseKey);
        return raw ? JSON.parse(raw) : [];
      } catch(e) { return []; }
    },

    saveShowcase: function(ids) {
      try {
        localStorage.setItem(this.showcaseKey, JSON.stringify(ids));
      } catch(e) {}
    },

    setShowcase: function(trophyIds) {
      if (!Array.isArray(trophyIds) || trophyIds.length > this.maxShowcase) return false;
      var state = this.loadState();
      var valid = trophyIds.every(function(id) {
        return state.unlockedIds.indexOf(id) !== -1;
      });
      if (!valid) return false;
      this.saveShowcase(trophyIds);
      return true;
    },

    getShowcase: function() {
      var ids = this.loadShowcase();
      var self = this;
      return ids.map(function(id) {
        return self.getTrophyById(id);
      }).filter(Boolean);
    },

    getRarityDisplay: function(trophyId) {
      var trophy = this.getTrophyById(trophyId);
      if (!trophy) return null;
      return {
        percentage: (trophy.rarity * 100).toFixed(2) + '%',
        label: trophy.rarityLabel || ((trophy.rarity * 100).toFixed(1) + '% of players')
      };
    },

    getGlobalRank: function() {
      var points = this.getTotalPoints();
      var maxPoints = this.getMaxPoints();
      var pct = maxPoints > 0 ? (points / maxPoints) : 0;
      if (pct >= 0.95) return { rank: 'Legend', tier: 'legendary' };
      if (pct >= 0.80) return { rank: 'Diamond', tier: 'diamond' };
      if (pct >= 0.60) return { rank: 'Platinum', tier: 'platinum' };
      if (pct >= 0.40) return { rank: 'Gold', tier: 'gold' };
      if (pct >= 0.20) return { rank: 'Silver', tier: 'silver' };
      return { rank: 'Bronze', tier: 'bronze' };
    },

    compareWithFriend: function(myState, friendState) {
      var self = this;
      var myIds = myState.unlockedIds || [];
      var friendIds = friendState.unlockedIds || [];
      var onlyMine = myIds.filter(function(id) { return friendIds.indexOf(id) === -1; });
      var onlyFriend = friendIds.filter(function(id) { return myIds.indexOf(id) === -1; });
      var shared = myIds.filter(function(id) { return friendIds.indexOf(id) !== -1; });
      return {
        myPoints: myIds.reduce(function(s, id) { var t = self.getTrophyById(id); return s + (t ? t.points : 0); }, 0),
        friendPoints: friendIds.reduce(function(s, id) { var t = self.getTrophyById(id); return s + (t ? t.points : 0); }, 0),
        myUnique: onlyMine.map(function(id) { return self.getTrophyById(id); }).filter(Boolean),
        friendUnique: onlyFriend.map(function(id) { return self.getTrophyById(id); }).filter(Boolean),
        shared: shared.map(function(id) { return self.getTrophyById(id); }).filter(Boolean)
      };
    },

    triggerCelebration: function(trophyId) {
      var trophy = this.getTrophyById(trophyId);
      if (!trophy) return;
      var animData = {
        trophyId: trophyId,
        category: trophy.category,
        points: trophy.points,
        particles: this.getCelebrationParticles(trophy.category),
        duration: trophy.category === 'legendary' ? 5000 : trophy.category === 'diamond' ? 4000 : trophy.category === 'platinum' ? 3000 : 2000,
        sound: 'sfx_trophy_' + trophy.category
      };
      if (typeof window !== 'undefined' && window.AHMET_TrophyCelebration) {
        window.AHMET_TrophyCelebration(animData);
      }
      return animData;
    },

    getCelebrationParticles: function(category) {
      var configs = {
        bronze:    { count: 20, colors: ['#cd7f32', '#b87333', '#a0522d'], size: 6 },
        silver:    { count: 30, colors: ['#c0c0c0', '#a8a9ad', '#d3d4d5'], size: 7 },
        gold:      { count: 50, colors: ['#ffd700', '#ffcc00', '#ffaa00'], size: 8 },
        platinum:  { count: 75, colors: ['#e5e4e2', '#a0b2c6', '#ccccff'], size: 9 },
        diamond:   { count: 100, colors: ['#b9f2ff', '#00cfff', '#a8e6ff', '#ffffff'], size: 10 },
        legendary: { count: 200, colors: ['#ff0080', '#ff8c00', '#ffd700', '#00ff88', '#0088ff', '#8800ff'], size: 12 }
      };
      return configs[category] || configs.bronze;
    },

    getTrophiesSortedByCategory: function() {
      var self = this;
      var result = [];
      this.CATEGORY_ORDER.forEach(function(cat) {
        var catTrophies = self.trophies.filter(function(t) { return t.category === cat; });
        catTrophies.sort(function(a, b) { return b.points - a.points; });
        result = result.concat(catTrophies);
      });
      return result;
    },

    getRecentlyUnlocked: function(count) {
      count = count || 5;
      var state = this.loadState();
      var self = this;
      var withDates = state.unlockedIds.map(function(id) {
        return { id: id, date: state.unlockDates[id] || '1970-01-01' };
      });
      withDates.sort(function(a, b) { return b.date.localeCompare(a.date); });
      return withDates.slice(0, count).map(function(item) {
        var t = self.getTrophyById(item.id);
        return t ? Object.assign({}, t, { unlockedAt: item.date }) : null;
      }).filter(Boolean);
    },

    generateProfileSummary: function() {
      var overall = this.getOverallCompletion();
      var rank = this.getGlobalRank();
      var showcase = this.getShowcase();
      var recent = this.getRecentlyUnlocked(3);
      var byCategory = this.getCompletionByCategory();
      return {
        rank: rank,
        totalPoints: this.getTotalPoints(),
        maxPoints: this.getMaxPoints(),
        completionPercent: overall.percent,
        totalUnlocked: overall.unlocked,
        totalTrophies: overall.total,
        showcase: showcase,
        recentUnlocks: recent,
        categoryBreakdown: byCategory
      };
    }
  };

})();

// ============================================================
// CHALLENGE_LEAGUE — Competitive tiered league system
// ============================================================
const CHALLENGE_LEAGUE = (() => {
  // ── League definitions ────────────────────────────────────
  const TIERS = [
    { id: 'bronze',   name: 'Bronze',   minPoints: 0,    maxPoints: 999,  color: '#cd7f32', icon: '🥉', promotePct: 0.20, relegatePct: 0.20 },
    { id: 'silver',   name: 'Silver',   minPoints: 1000, maxPoints: 2499, color: '#c0c0c0', icon: '🥈', promotePct: 0.20, relegatePct: 0.20 },
    { id: 'gold',     name: 'Gold',     minPoints: 2500, maxPoints: 4999, color: '#ffd700', icon: '🥇', promotePct: 0.20, relegatePct: 0.20 },
    { id: 'platinum', name: 'Platinum', minPoints: 5000, maxPoints: 9999, color: '#e5e4e2', icon: '💎', promotePct: 0.20, relegatePct: 0.20 },
    { id: 'diamond',  name: 'Diamond',  minPoints: 10000,maxPoints: Infinity, color: '#b9f2ff', icon: '💠', promotePct: 0,    relegatePct: 0.20 },
  ];

  // ── Season config ─────────────────────────────────────────
  const SEASON_DURATION_DAYS = 14;
  const SEASON_REWARDS = {
    bronze:   { coins: 500,   gems: 2,  cosmetic: 'bronze_frame'   },
    silver:   { coins: 1200,  gems: 5,  cosmetic: 'silver_frame'   },
    gold:     { coins: 2500,  gems: 10, cosmetic: 'gold_frame'     },
    platinum: { coins: 5000,  gems: 20, cosmetic: 'platinum_frame' },
    diamond:  { coins: 10000, gems: 50, cosmetic: 'diamond_crown'  },
  };

  // ── Player state ──────────────────────────────────────────
  const playerState = {
    tier: 'bronze',
    points: 0,
    seasonStartDate: null,
    winStreak: 0,
    lossStreak: 0,
    headToHeadOpponent: null,
    headToHeadWins: 0,
    headToHeadLosses: 0,
    seasonHistory: [],
    antiSmurfWarnings: 0,
    comebackBonus: 0,
  };

  // ── League challenges ─────────────────────────────────────
  const LEAGUE_CHALLENGES = {
    bronze: [
      { id: 'bc_01', name: 'First Flight',    desc: 'Complete 3 runs',         target: 3,  pts: 50,  type: 'runs'    },
      { id: 'bc_02', name: 'Coin Starter',    desc: 'Collect 500 coins',       target: 500, pts: 75, type: 'coins'   },
      { id: 'bc_03', name: 'Flipper',         desc: 'Do 10 flips',             target: 10,  pts: 60, type: 'flips'   },
      { id: 'bc_04', name: 'Road Trip',       desc: 'Drive 5km total',         target: 5,   pts: 80, type: 'distance'},
      { id: 'bc_05', name: 'Fuel Efficient',  desc: 'Finish 2 runs without fuel pickup', target: 2, pts: 100, type: 'nofuel' },
    ],
    silver: [
      { id: 'sc_01', name: 'Speed Demon',     desc: 'Reach 120 km/h',          target: 120, pts: 120, type: 'speed'   },
      { id: 'sc_02', name: 'Coin Collector',  desc: 'Collect 2000 coins',      target: 2000, pts: 150, type: 'coins'  },
      { id: 'sc_03', name: 'Flip Master',     desc: 'Do 50 flips',             target: 50,  pts: 140, type: 'flips'   },
      { id: 'sc_04', name: 'Long Hauler',     desc: 'Drive 25km total',        target: 25,  pts: 160, type: 'distance'},
      { id: 'sc_05', name: 'Upgrade Seeker',  desc: 'Upgrade any stat 5 times',target: 5,  pts: 180, type: 'upgrades'},
    ],
    gold: [
      { id: 'gc_01', name: 'Speedster',       desc: 'Reach 160 km/h',          target: 160, pts: 220, type: 'speed'   },
      { id: 'gc_02', name: 'Coin Hoarder',    desc: 'Collect 10000 coins',     target: 10000, pts: 250, type: 'coins' },
      { id: 'gc_03', name: 'Flip Expert',     desc: 'Do 200 flips',            target: 200, pts: 230, type: 'flips'   },
      { id: 'gc_04', name: 'Explorer',        desc: 'Drive 100km total',       target: 100, pts: 260, type: 'distance'},
      { id: 'gc_05', name: 'Full Upgrade',    desc: 'Max out one vehicle stat', target: 1,  pts: 300, type: 'maxstat' },
    ],
    platinum: [
      { id: 'pc_01', name: 'Hyperspeed',      desc: 'Reach 200 km/h',          target: 200, pts: 400, type: 'speed'   },
      { id: 'pc_02', name: 'Coin Mogul',      desc: 'Collect 50000 coins',     target: 50000, pts: 450, type: 'coins' },
      { id: 'pc_03', name: 'Flip Legend',     desc: 'Do 1000 flips',           target: 1000, pts: 420, type: 'flips'  },
      { id: 'pc_04', name: 'Marathon Runner', desc: 'Drive 500km total',       target: 500, pts: 480, type: 'distance'},
      { id: 'pc_05', name: 'Multi Mastery',   desc: 'Max out 3 vehicle stats', target: 3,  pts: 550, type: 'maxstat'  },
    ],
    diamond: [
      { id: 'dc_01', name: 'Velocity God',    desc: 'Reach 240 km/h',          target: 240, pts: 800, type: 'speed'   },
      { id: 'dc_02', name: 'Coin Emperor',    desc: 'Collect 200000 coins',    target: 200000, pts: 900, type: 'coins'},
      { id: 'dc_03', name: 'Flip God',        desc: 'Do 5000 flips',           target: 5000, pts: 850, type: 'flips'  },
      { id: 'dc_04', name: 'Ultra Marathon',  desc: 'Drive 2000km total',      target: 2000, pts: 1000, type: 'distance'},
      { id: 'dc_05', name: 'True Master',     desc: 'Max out entire vehicle',  target: 1,  pts: 1200, type: 'fullmax' },
    ],
  };

  // ── Leaderboard ───────────────────────────────────────────
  const leaderboards = {};
  for (const tier of TIERS) {
    leaderboards[tier.id] = [];
  }

  function addLeaderboardEntry(tierId, entry) {
    const board = leaderboards[tierId];
    if (!board) return;
    const existing = board.findIndex(e => e.playerId === entry.playerId);
    if (existing >= 0) board[existing] = entry;
    else board.push(entry);
    board.sort((a, b) => b.points - a.points);
    if (board.length > 10) board.splice(10);
  }

  function getLeaderboard(tierId) {
    return (leaderboards[tierId] || []).slice();
  }

  // ── Points & promotion ────────────────────────────────────
  function awardPoints(amount, source) {
    const bonus = playerState.comebackBonus > 0 ? 1.5 : 1;
    const actual = Math.round(amount * bonus);
    playerState.points += actual;
    if (playerState.comebackBonus > 0) playerState.comebackBonus--;
    _checkPromotion();
    return actual;
  }

  function _checkPromotion() {
    const currentIdx = TIERS.findIndex(t => t.id === playerState.tier);
    const current = TIERS[currentIdx];
    if (!current) return;
    if (currentIdx < TIERS.length - 1 && playerState.points >= current.maxPoints + 1) {
      playerState.tier = TIERS[currentIdx + 1].id;
      return 'promoted';
    }
    if (currentIdx > 0 && playerState.points < current.minPoints) {
      playerState.tier = TIERS[currentIdx - 1].id;
      return 'relegated';
    }
    return null;
  }

  // ── Head-to-head ──────────────────────────────────────────
  function startHeadToHead(opponentId, opponentName) {
    playerState.headToHeadOpponent = { id: opponentId, name: opponentName };
    playerState.headToHeadWins = 0;
    playerState.headToHeadLosses = 0;
  }

  function recordH2HResult(won) {
    if (won) {
      playerState.headToHeadWins++;
      playerState.winStreak++;
      playerState.lossStreak = 0;
    } else {
      playerState.headToHeadLosses++;
      playerState.lossStreak++;
      playerState.winStreak = 0;
      if (playerState.lossStreak >= 3) {
        playerState.comebackBonus = Math.min(5, playerState.comebackBonus + 2);
      }
    }
  }

  // ── Anti-smurf detection ──────────────────────────────────
  function checkAntiSmurf(playerSkillMetrics, tierExpectedMetrics) {
    let overperformCount = 0;
    for (const [key, expected] of Object.entries(tierExpectedMetrics)) {
      const actual = playerSkillMetrics[key];
      if (actual !== undefined && actual > expected * 2) overperformCount++;
    }
    if (overperformCount >= 2) {
      playerState.antiSmurfWarnings++;
      return { flagged: true, warnings: playerState.antiSmurfWarnings };
    }
    return { flagged: false, warnings: playerState.antiSmurfWarnings };
  }

  // ── Season management ─────────────────────────────────────
  function startSeason(dateMs) {
    playerState.seasonStartDate = dateMs || Date.now();
    playerState.points = 0;
    playerState.winStreak = 0;
    playerState.lossStreak = 0;
  }

  function endSeason() {
    const record = {
      tier: playerState.tier,
      points: playerState.points,
      rewards: SEASON_REWARDS[playerState.tier],
      date: Date.now(),
    };
    playerState.seasonHistory.push(record);
    if (playerState.seasonHistory.length > 20) playerState.seasonHistory.shift();
    return record;
  }

  function getSeasonTimeRemaining(nowMs) {
    if (!playerState.seasonStartDate) return null;
    const elapsed = (nowMs || Date.now()) - playerState.seasonStartDate;
    const total = SEASON_DURATION_DAYS * 86400000;
    return Math.max(0, total - elapsed);
  }

  function getCurrentTierInfo() {
    return TIERS.find(t => t.id === playerState.tier) || TIERS[0];
  }

  function getChallengesForCurrentTier() {
    return (LEAGUE_CHALLENGES[playerState.tier] || []).slice();
  }

  return {
    TIERS, SEASON_REWARDS, LEAGUE_CHALLENGES,
    playerState, leaderboards,
    awardPoints, startSeason, endSeason,
    getSeasonTimeRemaining, getCurrentTierInfo,
    getChallengesForCurrentTier,
    startHeadToHead, recordH2HResult,
    addLeaderboardEntry, getLeaderboard,
    checkAntiSmurf,
  };
})();

// ============================================================
// ACHIEVEMENT_CHAINS — Sequential multi-step achievement chains
// ============================================================
const ACHIEVEMENT_CHAINS = (() => {
  // ── Chain definition helper ───────────────────────────────
  function chain(id, name, icon, steps, rewards) {
    return {
      id, name, icon,
      steps: steps.map((s, i) => ({ ...s, index: i, completed: false })),
      currentStep: 0,
      completed: false,
      rewards: rewards || [],
      startedAt: null,
      completedAt: null,
    };
  }

  // ── Step definition helper ────────────────────────────────
  function step(name, desc, type, target, reward) {
    return { name, desc, type, target, progress: 0, reward: reward || null };
  }

  // ── 20 Achievement chains ─────────────────────────────────
  const CHAINS = {
    speedster: chain('speedster', 'Speedster Path', '🏎️', [
      step('Warm Up',       'Reach 50 km/h',    'max_speed',  50,   { coins: 100 }),
      step('Getting Fast',  'Reach 100 km/h',   'max_speed',  100,  { coins: 250 }),
      step('Very Fast',     'Reach 150 km/h',   'max_speed',  150,  { coins: 500, gems: 1 }),
      step('Speed Demon',   'Reach 200 km/h',   'max_speed',  200,  { coins: 1000, gems: 3 }),
    ], [{ type: 'cosmetic', id: 'speed_trail_legendary' }, { coins: 5000 }]),

    flipmaster: chain('flipmaster', 'Flipmaster', '🔄', [
      step('First Flip',    'Do 1 flip',         'total_flips', 1,    { coins: 50 }),
      step('Flip Addict',   'Do 50 flips',       'total_flips', 50,   { coins: 200 }),
      step('Flip Pro',      'Do 500 flips',      'total_flips', 500,  { coins: 750, gems: 2 }),
      step('Flip God',      'Do 5000 flips',     'total_flips', 5000, { coins: 3000, gems: 10 }),
    ], [{ type: 'cosmetic', id: 'flip_effect_legendary' }, { coins: 8000 }]),

    explorer: chain('explorer', 'Explorer', '🗺️', [
      step('First Steps',   'Play 3 different maps',  'maps_played', 3,  { coins: 150 }),
      step('Map Hopper',    'Play 6 different maps',  'maps_played', 6,  { coins: 300 }),
      step('Adventurer',    'Play 10 different maps', 'maps_played', 10, { coins: 600, gems: 2 }),
      step('World Traveler','Play 15 different maps', 'maps_played', 15, { coins: 1500, gems: 5 }),
    ], [{ type: 'cosmetic', id: 'world_map_banner' }, { gems: 15 }]),

    collector: chain('collector', 'Coin Collector', '💰', [
      step('Pocket Change', 'Collect 100 coins total',    'total_coins', 100,    { coins: 50 }),
      step('Saving Up',     'Collect 1000 coins total',   'total_coins', 1000,   { coins: 200 }),
      step('Rich',          'Collect 10000 coins total',  'total_coins', 10000,  { coins: 1000, gems: 3 }),
      step('Millionaire',   'Collect 100000 coins total', 'total_coins', 100000, { coins: 5000, gems: 15 }),
    ], [{ type: 'cosmetic', id: 'golden_vehicle_skin' }, { gems: 25 }]),

    survivor: chain('survivor', 'Survivor', '🛡️', [
      step('Careful Driver', 'Drive 5km without crash',    'no_crash_km', 5,   { coins: 200 }),
      step('Safe Rider',     'Drive 20km without crash',   'no_crash_km', 20,  { coins: 500 }),
      step('Veteran',        'Drive 50km without crash',   'no_crash_km', 50,  { coins: 1200, gems: 4 }),
      step('Untouchable',    'Drive 100km without crash',  'no_crash_km', 100, { coins: 3000, gems: 12 }),
    ], [{ type: 'cosmetic', id: 'shield_aura_effect' }, { coins: 10000 }]),

    upgrademaster: chain('upgrademaster', 'Upgrade Master', '⚙️', [
      step('First Upgrade',  'Upgrade 1 stat',      'total_upgrades', 1,  { coins: 100 }),
      step('Tinkerer',       'Upgrade 10 stats',    'total_upgrades', 10, { coins: 300 }),
      step('Engineer',       'Upgrade 50 stats',    'total_upgrades', 50, { coins: 800, gems: 3 }),
      step('Master Engineer','Max all vehicle stats','all_maxed',      1,  { coins: 5000, gems: 20 }),
    ], [{ type: 'cosmetic', id: 'engineer_helmet_skin' }, { gems: 30 }]),

    social: chain('social', 'Social Butterfly', '📅', [
      step('Day 1',    'Play 1 day in a row',   'day_streak', 1,   { coins: 50 }),
      step('Week',     'Play 7 days in a row',  'day_streak', 7,   { coins: 300, gems: 1 }),
      step('Month',    'Play 30 days in a row', 'day_streak', 30,  { coins: 1500, gems: 5 }),
      step('Century',  'Play 100 days in a row','day_streak', 100, { coins: 8000, gems: 25 }),
    ], [{ type: 'cosmetic', id: 'loyalty_crown' }, { gems: 50 }]),

    veteran: chain('veteran', 'Veteran', '🎖️', [
      step('Rookie',  'Complete 10 runs',    'total_runs', 10,   { coins: 100 }),
      step('Regular', 'Complete 100 runs',   'total_runs', 100,  { coins: 400 }),
      step('Veteran', 'Complete 1000 runs',  'total_runs', 1000, { coins: 2000, gems: 8 }),
      step('Legend',  'Complete 10000 runs', 'total_runs', 10000,{ coins: 10000, gems: 40 }),
    ], [{ type: 'cosmetic', id: 'legend_wings' }, { gems: 60 }]),

    champion: chain('champion', 'Champion', '🏆', [
      step('Podium',       'Win 1 tournament',   'tourney_wins', 1,  { coins: 300 }),
      step('Competitor',   'Win 5 tournaments',  'tourney_wins', 5,  { coins: 800 }),
      step('Contender',    'Win 20 tournaments', 'tourney_wins', 20, { coins: 2500, gems: 8 }),
      step('Grand Champ',  'Win 50 tournaments', 'tourney_wins', 50, { coins: 8000, gems: 30 }),
    ], [{ type: 'cosmetic', id: 'champion_trophy_display' }, { gems: 40 }]),

    trickgod: chain('trickgod', 'Trick God', '✨', [
      step('Show Off',     'Do 10 tricks',     'total_tricks', 10,    { coins: 75 }),
      step('Trickster',    'Do 100 tricks',    'total_tricks', 100,   { coins: 250 }),
      step('Trick Master', 'Do 1000 tricks',   'total_tricks', 1000,  { coins: 1200, gems: 4 }),
      step('Trick God',    'Do 10000 tricks',  'total_tricks', 10000, { coins: 6000, gems: 20 }),
    ], [{ type: 'cosmetic', id: 'trick_sparkle_aura' }, { coins: 15000 }]),

    distanceking: chain('distanceking', 'Distance King', '🛣️', [
      step('Block Walker', 'Drive 1km total',    'total_distance_km', 1,    { coins: 50 }),
      step('Commuter',     'Drive 50km total',   'total_distance_km', 50,   { coins: 300 }),
      step('Road Warrior', 'Drive 500km total',  'total_distance_km', 500,  { coins: 2000, gems: 6 }),
      step('Globe Trotter','Drive 5000km total', 'total_distance_km', 5000, { coins: 12000, gems: 35 }),
    ], [{ type: 'cosmetic', id: 'asphalt_trail_legendary' }, { gems: 45 }]),

    airsuperstar: chain('airsuperstar', 'Air Superstar', '🪂', [
      step('Liftoff',      'Get airborne for 1s',   'max_airtime_s', 1,  { coins: 100 }),
      step('Air Time',     'Get airborne for 3s',   'max_airtime_s', 3,  { coins: 300 }),
      step('Flying',       'Get airborne for 7s',   'max_airtime_s', 7,  { coins: 800, gems: 3 }),
      step('Sky King',     'Get airborne for 15s',  'max_airtime_s', 15, { coins: 2500, gems: 10 }),
    ], [{ type: 'cosmetic', id: 'cloud_trail' }, { gems: 18 }]),

    fuelmaster: chain('fuelmaster', 'Fuel Master', '⛽', [
      step('Refueled',     'Collect 10 fuel cans',   'fuel_collected', 10,  { coins: 80 }),
      step('Tank Filler',  'Collect 100 fuel cans',  'fuel_collected', 100, { coins: 250 }),
      step('Fuel Hoarder', 'Collect 500 fuel cans',  'fuel_collected', 500, { coins: 800, gems: 2 }),
      step('Fuel Baron',   'Collect 2000 fuel cans', 'fuel_collected', 2000,{ coins: 3500, gems: 10 }),
    ], [{ type: 'cosmetic', id: 'fuel_cell_badge' }, { coins: 5000 }]),

    nightowl: chain('nightowl', 'Night Owl', '🦉', [
      step('After Dark',   'Play 5 night sessions',   'night_sessions', 5,  { coins: 150 }),
      step('Night Shift',  'Play 20 night sessions',  'night_sessions', 20, { coins: 400 }),
      step('Insomniac',    'Play 50 night sessions',  'night_sessions', 50, { coins: 1000, gems: 3 }),
      step('Night Legend', 'Play 150 night sessions', 'night_sessions', 150,{ coins: 4000, gems: 12 }),
    ], [{ type: 'cosmetic', id: 'night_glow_skin' }, { gems: 20 }]),

    crashtest: chain('crashtest', 'Crash Test', '💥', [
      step('First Crash',  'Crash 1 time',     'total_crashes', 1,    { coins: 25 }),
      step('Crasher',      'Crash 50 times',   'total_crashes', 50,   { coins: 150 }),
      step('Daredevil',    'Crash 500 times',  'total_crashes', 500,  { coins: 600, gems: 2 }),
      step('Crash King',   'Crash 5000 times', 'total_crashes', 5000, { coins: 3000, gems: 8 }),
    ], [{ type: 'cosmetic', id: 'crash_explosion_trail' }, { coins: 5000 }]),

    goldseeker: chain('goldseeker', 'Gold Seeker', '🔍', [
      step('Lucky Find',   'Find 1 hidden bonus',    'hidden_bonus', 1,  { coins: 100 }),
      step('Treasure Hunt','Find 10 hidden bonuses', 'hidden_bonus', 10, { coins: 500 }),
      step('Seeker',       'Find 50 hidden bonuses', 'hidden_bonus', 50, { coins: 2000, gems: 5 }),
      step('Treasure King','Find 200 hidden bonuses','hidden_bonus', 200,{ coins: 8000, gems: 20 }),
    ], [{ type: 'cosmetic', id: 'treasure_map_banner' }, { gems: 30 }]),

    skydipper: chain('skydipper', 'Big Air', '🌅', [
      step('Jump!',        'Jump 20 times',    'total_jumps', 20,   { coins: 80 }),
      step('Kangaroo',     'Jump 200 times',   'total_jumps', 200,  { coins: 300 }),
      step('Jump Master',  'Jump 2000 times',  'total_jumps', 2000, { coins: 1200, gems: 4 }),
      step('Jump Legend',  'Jump 20000 times', 'total_jumps', 20000,{ coins: 6000, gems: 18 }),
    ], [{ type: 'cosmetic', id: 'jump_boost_visual' }, { coins: 8000 }]),

    supergrind: chain('supergrind', 'Super Grinder', '⏱️', [
      step('1 Hour',       'Play 1h total',    'play_time_h', 1,    { coins: 100 }),
      step('10 Hours',     'Play 10h total',   'play_time_h', 10,   { coins: 500 }),
      step('100 Hours',    'Play 100h total',  'play_time_h', 100,  { coins: 3000, gems: 10 }),
      step('1000 Hours',   'Play 1000h total', 'play_time_h', 1000, { coins: 20000, gems: 50 }),
    ], [{ type: 'cosmetic', id: 'grinder_exhaust_flame' }, { gems: 75 }]),

    vehiclehunter: chain('vehiclehunter', 'Vehicle Hunter', '🚗', [
      step('First Ride',   'Unlock 1 vehicle',   'vehicles_unlocked', 1,  { coins: 100 }),
      step('Garage Start', 'Unlock 5 vehicles',  'vehicles_unlocked', 5,  { coins: 400 }),
      step('Collector',    'Unlock 15 vehicles', 'vehicles_unlocked', 15, { coins: 1500, gems: 5 }),
      step('Full Garage',  'Unlock all vehicles','vehicles_unlocked', 999,{ coins: 10000, gems: 30 }),
    ], [{ type: 'cosmetic', id: 'rainbow_vehicle_aura' }, { gems: 40 }]),

    perfectionist: chain('perfectionist', 'Perfectionist', '⭐', [
      step('Close Call',   'Finish run with <5% fuel', 'close_fuel_finish', 1,  { coins: 150 }),
      step('Daring',       'Do it 10 times',           'close_fuel_finish', 10, { coins: 400 }),
      step('Risky',        'Do it 50 times',           'close_fuel_finish', 50, { coins: 1200, gems: 4 }),
      step('Perfectionist','Do it 200 times',          'close_fuel_finish', 200,{ coins: 5000, gems: 15 }),
    ], [{ type: 'cosmetic', id: 'star_aura_legendary' }, { coins: 8000 }]),
  };

  // ── Progress tracking ─────────────────────────────────────
  function updateChainProgress(chainId, type, value) {
    const c = CHAINS[chainId];
    if (!c || c.completed) return null;
    const currentStep = c.steps[c.currentStep];
    if (!currentStep || currentStep.type !== type) return null;

    if (!c.startedAt) c.startedAt = Date.now();
    currentStep.progress = Math.min(currentStep.target, value);

    if (currentStep.progress >= currentStep.target) {
      currentStep.completed = true;
      const reward = currentStep.reward;
      c.currentStep++;
      if (c.currentStep >= c.steps.length) {
        c.completed = true;
        c.completedAt = Date.now();
        return { event: 'chain_complete', chain: c, finalRewards: c.rewards };
      }
      return { event: 'step_complete', chain: c, stepReward: reward, nextStep: c.steps[c.currentStep] };
    }
    return { event: 'progress', chain: c, step: currentStep };
  }

  function updateAllChainsForStat(type, value) {
    const events = [];
    for (const chainId of Object.keys(CHAINS)) {
      const result = updateChainProgress(chainId, type, value);
      if (result) events.push(result);
    }
    return events;
  }

  function getChain(id) { return CHAINS[id] || null; }
  function getAllChains() { return Object.values(CHAINS); }
  function getActiveChains() { return getAllChains().filter(c => !c.completed && c.currentStep > 0); }
  function getCompletedChains() { return getAllChains().filter(c => c.completed); }

  function getNextStepPreview(chainId) {
    const c = CHAINS[chainId];
    if (!c || c.completed) return null;
    const next = c.steps[c.currentStep];
    if (!next) return null;
    return { ...next, chain: c.name, chainIcon: c.icon };
  }

  function getChainCosmeticSet(chainId) {
    const c = CHAINS[chainId];
    if (!c) return [];
    return c.rewards.filter(r => r.type === 'cosmetic');
  }

  function serializeProgress() {
    const data = {};
    for (const [id, c] of Object.entries(CHAINS)) {
      data[id] = {
        currentStep: c.currentStep, completed: c.completed,
        startedAt: c.startedAt, completedAt: c.completedAt,
        steps: c.steps.map(s => ({ completed: s.completed, progress: s.progress })),
      };
    }
    return data;
  }

  function loadProgress(data) {
    if (!data) return;
    for (const [id, saved] of Object.entries(data)) {
      const c = CHAINS[id];
      if (!c) continue;
      c.currentStep = saved.currentStep || 0;
      c.completed = saved.completed || false;
      c.startedAt = saved.startedAt || null;
      c.completedAt = saved.completedAt || null;
      if (saved.steps) {
        saved.steps.forEach((s, i) => {
          if (c.steps[i]) {
            c.steps[i].completed = s.completed || false;
            c.steps[i].progress  = s.progress  || 0;
          }
        });
      }
    }
  }

  return {
    CHAINS,
    getChain, getAllChains, getActiveChains, getCompletedChains,
    updateChainProgress, updateAllChainsForStat,
    getNextStepPreview, getChainCosmeticSet,
    serializeProgress, loadProgress,
  };
})();

// ============================================================
// MILESTONE_REWARDS — Global lifetime milestones with rewards
// ============================================================
const MILESTONE_REWARDS = (() => {
  // ── Milestone category factories ──────────────────────────
  function makeMilestones(category, statKey, unit, thresholds, rewardFn) {
    return thresholds.map((t, i) => ({
      id: `${category}_${i}`,
      category, statKey, unit,
      threshold: t,
      reward: rewardFn(t, i),
      claimed: false,
      claimedAt: null,
    }));
  }

  // ── Distance milestones (every 100km globally) ────────────
  const _distThresh = [];
  for (let i = 1; i <= 50; i++) _distThresh.push(i * 100);

  const DISTANCE_MILESTONES = makeMilestones('distance', 'total_km', 'km', _distThresh,
    (t, i) => ({
      coins: 100 + i * 50,
      gems: i % 5 === 4 ? 2 + Math.floor(i / 5) : 0,
      label: `${t}km Total`,
    })
  );

  // ── Coin milestones ───────────────────────────────────────
  const COIN_MILESTONES = makeMilestones('coins', 'lifetime_coins', 'coins',
    [1000, 5000, 10000, 50000, 100000, 500000, 1000000],
    (t, i) => ({
      coins: Math.round(t * 0.05),
      gems: [1, 3, 5, 10, 20, 40, 100][i],
      label: `${t.toLocaleString()} Coins Collected`,
    })
  );

  // ── Run count milestones ──────────────────────────────────
  const RUN_MILESTONES = makeMilestones('runs', 'total_runs', 'runs',
    [10, 50, 100, 500, 1000, 5000, 10000],
    (t, i) => ({
      coins: [200, 500, 1000, 3000, 6000, 15000, 30000][i],
      gems: [0, 1, 3, 8, 15, 30, 60][i],
      label: `${t} Runs Completed`,
    })
  );

  // ── Flip count milestones ─────────────────────────────────
  const FLIP_MILESTONES = makeMilestones('flips', 'total_flips', 'flips',
    [10, 50, 100, 500, 1000, 5000, 10000],
    (t, i) => ({
      coins: [100, 300, 600, 2000, 4000, 10000, 20000][i],
      gems: [0, 1, 2, 5, 10, 25, 50][i],
      label: `${t} Flips Done`,
    })
  );

  // ── Vehicle-specific milestones ───────────────────────────
  const VEHICLE_IDS = ['jeep','buggy','truck','motocross','formula','monster','rally','offroad'];
  const VEHICLE_MILESTONES = {};
  for (const vid of VEHICLE_IDS) {
    VEHICLE_MILESTONES[vid] = makeMilestones(
      `vehicle_${vid}`, `${vid}_km`, 'km', [100, 500, 1000],
      (t, i) => ({
        coins: [500, 2000, 5000][i],
        gems: [1, 5, 15][i],
        cosmetic: i === 2 ? `${vid}_master_skin` : null,
        label: `${t}km in ${vid}`,
      })
    );
  }

  // ── Map-specific milestones ───────────────────────────────
  const MAP_IDS = ['mountain','desert','forest','cave','snow','city','beach','moon'];
  const MAP_MILESTONES = {};
  for (const mid of MAP_IDS) {
    MAP_MILESTONES[mid] = makeMilestones(
      `map_${mid}`, `${mid}_km`, 'km', [50, 200, 500],
      (t, i) => ({
        coins: [300, 1200, 3000][i],
        gems: [1, 3, 8][i],
        label: `${t}km on ${mid}`,
      })
    );
  }

  // ── Time played milestones ────────────────────────────────
  const TIME_MILESTONES = makeMilestones('time', 'play_time_h', 'h',
    [1, 10, 100, 1000],
    (t, i) => ({
      coins: [200, 1000, 8000, 50000][i],
      gems: [1, 5, 25, 100][i],
      label: `${t}h Played`,
    })
  );

  // ── Session (day) milestones ──────────────────────────────
  const SESSION_MILESTONES = makeMilestones('sessions', 'days_played', 'days',
    [7, 30, 100, 365],
    (t, i) => ({
      coins: [500, 2000, 8000, 30000][i],
      gems: [2, 8, 25, 100][i],
      cosmetic: i === 3 ? 'year_badge' : null,
      label: `${t} Days Played`,
    })
  );

  // ── Notification queue ────────────────────────────────────
  const notifQueue = [];

  function _pushNotif(milestone) {
    notifQueue.push({
      milestone,
      time: Date.now(),
      shown: false,
    });
  }

  function getNextNotification() {
    const n = notifQueue.find(n => !n.shown);
    if (n) n.shown = true;
    return n || null;
  }

  // ── Check and claim milestones ────────────────────────────
  function checkMilestones(statKey, currentValue) {
    const claimed = [];
    const allLists = [
      DISTANCE_MILESTONES, COIN_MILESTONES, RUN_MILESTONES,
      FLIP_MILESTONES, TIME_MILESTONES, SESSION_MILESTONES,
      ...Object.values(VEHICLE_MILESTONES),
      ...Object.values(MAP_MILESTONES),
    ];
    for (const list of allLists) {
      for (const m of list) {
        if (!m.claimed && m.statKey === statKey && currentValue >= m.threshold) {
          m.claimed = true;
          m.claimedAt = Date.now();
          claimed.push(m);
          _pushNotif(m);
        }
      }
    }
    return claimed;
  }

  // ── Monthly recap ─────────────────────────────────────────
  function getMonthlyRecap(year, month) {
    const start = new Date(year, month, 1).getTime();
    const end   = new Date(year, month + 1, 1).getTime();
    const allLists = [
      DISTANCE_MILESTONES, COIN_MILESTONES, RUN_MILESTONES,
      FLIP_MILESTONES, TIME_MILESTONES, SESSION_MILESTONES,
      ...Object.values(VEHICLE_MILESTONES),
      ...Object.values(MAP_MILESTONES),
    ];
    const hit = [];
    for (const list of allLists) {
      for (const m of list) {
        if (m.claimed && m.claimedAt >= start && m.claimedAt < end) hit.push(m);
      }
    }
    return { year, month, milestones: hit, count: hit.length };
  }

  // ── Claiming interface ────────────────────────────────────
  function getUnclaimedMilestones() {
    // In this system, milestones auto-claim on check. This surfaces rewards for UI.
    const allLists = [
      DISTANCE_MILESTONES, COIN_MILESTONES, RUN_MILESTONES,
      FLIP_MILESTONES, TIME_MILESTONES, SESSION_MILESTONES,
    ];
    return allLists.flat().filter(m => m.claimed && !m._rewardGranted).map(m => {
      m._rewardGranted = true;
      return m;
    });
  }

  function getAllMilestones() {
    return {
      distance: DISTANCE_MILESTONES,
      coins:    COIN_MILESTONES,
      runs:     RUN_MILESTONES,
      flips:    FLIP_MILESTONES,
      time:     TIME_MILESTONES,
      sessions: SESSION_MILESTONES,
      vehicles: VEHICLE_MILESTONES,
      maps:     MAP_MILESTONES,
    };
  }

  return {
    DISTANCE_MILESTONES, COIN_MILESTONES, RUN_MILESTONES,
    FLIP_MILESTONES, TIME_MILESTONES, SESSION_MILESTONES,
    VEHICLE_MILESTONES, MAP_MILESTONES,
    checkMilestones, getNextNotification,
    getMonthlyRecap, getUnclaimedMilestones, getAllMilestones,
  };
})();

// ============================================================
// ACHIEVEMENT_SOCIAL — Social comparison & collaborative goals
// ============================================================
const ACHIEVEMENT_SOCIAL = (() => {
  // ── Friend registry ───────────────────────────────────────
  const friends = new Map();
  const pendingComparisons = [];

  function addFriend(playerId, playerName, achievementsSnapshot) {
    friends.set(playerId, {
      id: playerId, name: playerName,
      achievements: achievementsSnapshot || [],
      lastSeen: Date.now(),
    });
  }

  function removeFriend(playerId) { friends.delete(playerId); }
  function getFriend(playerId) { return friends.get(playerId) || null; }
  function getAllFriends() { return Array.from(friends.values()); }

  // ── Beat-a-friend trigger ─────────────────────────────────
  const beatFriendLog = [];

  function checkBeatFriend(localStat, statKey) {
    const beaten = [];
    for (const friend of friends.values()) {
      const friendStat = (friend.achievements.find(a => a.key === statKey) || {}).value || 0;
      if (localStat > friendStat) {
        const already = beatFriendLog.find(e => e.friendId === friend.id && e.statKey === statKey);
        if (!already) {
          const entry = { friendId: friend.id, friendName: friend.name, statKey, localStat, friendStat, time: Date.now() };
          beatFriendLog.push(entry);
          beaten.push(entry);
        }
      }
    }
    return beaten;
  }

  // ── Collaborative achievements ────────────────────────────
  const COLLABORATIVE = [
    { id: 'co_01', name: 'Double Trouble',      desc: 'Both you and a friend complete 100 flips',  statKey: 'total_flips',    target: 100,  reward: { coins: 500, gems: 2 } },
    { id: 'co_02', name: 'Road Brothers',       desc: 'Both you and a friend drive 100km total',   statKey: 'total_km',       target: 100,  reward: { coins: 800, gems: 3 } },
    { id: 'co_03', name: 'Coin Squad',           desc: 'Both collect 5000 coins in same session',   statKey: 'session_coins',  target: 5000, reward: { coins: 1500, gems: 5 } },
    { id: 'co_04', name: 'Speed Brothers',      desc: 'Both reach 150km/h in same session',        statKey: 'session_speed',  target: 150,  reward: { coins: 1000, gems: 4 } },
    { id: 'co_05', name: 'Flip Partners',       desc: 'Both do 20 flips in same session',          statKey: 'session_flips',  target: 20,   reward: { coins: 600,  gems: 2 } },
    { id: 'co_06', name: 'Survivor Squad',      desc: 'Both finish without crashing in same session', statKey: 'session_no_crash', target: 1, reward: { coins: 1200, gems: 5 } },
  ];

  const collabProgress = {};
  for (const c of COLLABORATIVE) {
    collabProgress[c.id] = { playerValue: 0, partnerValues: {} };
  }

  function updateCollaborative(achievId, playerId, value) {
    const prog = collabProgress[achievId];
    if (!prog) return null;
    if (playerId === 'self') {
      prog.playerValue = value;
    } else {
      prog.partnerValues[playerId] = value;
    }
    // Check completion: self + at least one friend both at target
    const def = COLLABORATIVE.find(c => c.id === achievId);
    if (!def) return null;
    const selfDone = prog.playerValue >= def.target;
    const partnerDone = Object.values(prog.partnerValues).some(v => v >= def.target);
    if (selfDone && partnerDone) {
      return { event: 'collaborative_complete', achievement: def, reward: def.reward };
    }
    return { event: 'progress', achievement: def, playerValue: prog.playerValue };
  }

  // ── Achievement sharing (feed) ────────────────────────────
  const achievementFeed = [];

  function shareAchievement(achievementId, achievementName, playerName) {
    const post = { achievementId, achievementName, playerName, time: Date.now(), likes: 0, comments: [] };
    achievementFeed.unshift(post);
    if (achievementFeed.length > 50) achievementFeed.splice(50);
    return post;
  }

  function likePost(postIdx) {
    if (achievementFeed[postIdx]) achievementFeed[postIdx].likes++;
  }

  function commentOnPost(postIdx, playerId, text) {
    if (!achievementFeed[postIdx]) return;
    achievementFeed[postIdx].comments.push({ playerId, text, time: Date.now() });
  }

  function getFeed(limit) { return achievementFeed.slice(0, limit || 20); }

  // ── Achievement racing ────────────────────────────────────
  const activeRaces = new Map();

  function startAchievementRace(achievementId, friendIds) {
    activeRaces.set(achievementId, {
      achievementId,
      participants: ['self', ...friendIds],
      progress: Object.fromEntries(['self', ...friendIds].map(id => [id, 0])),
      startTime: Date.now(),
      winner: null,
    });
  }

  function updateRaceProgress(achievementId, participantId, value, target) {
    const race = activeRaces.get(achievementId);
    if (!race || race.winner) return null;
    race.progress[participantId] = value;
    if (value >= target) {
      race.winner = participantId;
      return { event: 'race_won', achievementId, winner: participantId, race };
    }
    return { event: 'race_update', achievementId, progress: race.progress };
  }

  function getRace(achievementId) { return activeRaces.get(achievementId) || null; }

  // ── Achievement gifting (encouragement) ──────────────────
  const encouragementLog = [];

  function sendEncouragement(fromId, toId, achievementId, message) {
    const entry = { fromId, toId, achievementId, message: message || '💪 Keep it up!', time: Date.now() };
    encouragementLog.push(entry);
    return entry;
  }

  function getEncouragementFor(playerId) {
    return encouragementLog.filter(e => e.toId === playerId);
  }

  // ── Leaderboard-linked achievements ──────────────────────
  const LEADERBOARD_ACHIEVEMENTS = [
    { id: 'lb_top100',  name: 'Top 100',  desc: 'Reach top 100 globally',  rank: 100, reward: { gems: 5 } },
    { id: 'lb_top10',   name: 'Top 10',   desc: 'Reach top 10 globally',   rank: 10,  reward: { gems: 20 } },
    { id: 'lb_top1',    name: 'Number 1', desc: 'Reach #1 globally',       rank: 1,   reward: { gems: 100, cosmetic: 'crown_legendary' } },
  ];

  const lbAchievProgress = {};
  for (const lb of LEADERBOARD_ACHIEVEMENTS) lbAchievProgress[lb.id] = { achieved: false };

  function checkLeaderboardRank(currentRank) {
    const unlocked = [];
    for (const lb of LEADERBOARD_ACHIEVEMENTS) {
      if (!lbAchievProgress[lb.id].achieved && currentRank <= lb.rank) {
        lbAchievProgress[lb.id].achieved = true;
        unlocked.push({ achievement: lb, reward: lb.reward });
      }
    }
    return unlocked;
  }

  // ── Community achievements ────────────────────────────────
  const COMMUNITY_ACHIEVEMENTS = [
    { id: 'com_01', name: 'Community Racer',  desc: 'Participate in a community event',       progress: 0, target: 1, reward: { coins: 500 } },
    { id: 'com_02', name: 'Event Regular',    desc: 'Participate in 10 community events',     progress: 0, target: 10, reward: { gems: 5 } },
    { id: 'com_03', name: 'Community Star',   desc: 'Win a community challenge',              progress: 0, target: 1, reward: { gems: 15, cosmetic: 'community_star_badge' } },
    { id: 'com_04', name: 'Social Butterfly', desc: 'Have 5 friends in the game',             progress: 0, target: 5, reward: { coins: 300 } },
    { id: 'com_05', name: 'Influencer',       desc: 'Have a friend join after your referral', progress: 0, target: 1, reward: { gems: 10 } },
  ];

  function updateCommunityProgress(achievId, value) {
    const ca = COMMUNITY_ACHIEVEMENTS.find(c => c.id === achievId);
    if (!ca) return null;
    ca.progress = Math.min(ca.target, value);
    if (ca.progress >= ca.target && !ca.completed) {
      ca.completed = true;
      return { event: 'community_complete', achievement: ca, reward: ca.reward };
    }
    return { event: 'progress', achievement: ca };
  }

  // ── Viral achievements ────────────────────────────────────
  const VIRAL_ACHIEVEMENTS = [
    { id: 'vir_01', name: 'Early Adopter',  desc: 'A friend joins who you referred',              earned: false, reward: { gems: 5 } },
    { id: 'vir_02', name: 'Trend Setter',   desc: 'A friend earns an achievement after seeing yours', earned: false, reward: { coins: 500 } },
    { id: 'vir_03', name: 'Inspiration',    desc: '3 friends earn achievements you inspired',     earned: false, reward: { gems: 10 } },
  ];

  function triggerViralAchievement(achievId) {
    const va = VIRAL_ACHIEVEMENTS.find(v => v.id === achievId);
    if (!va || va.earned) return null;
    va.earned = true;
    va.earnedAt = Date.now();
    return { event: 'viral_earned', achievement: va, reward: va.reward };
  }

  // ── Achievement comparison summary ────────────────────────
  function compareWithFriend(friendId) {
    const friend = friends.get(friendId);
    if (!friend) return null;
    return {
      friendId, friendName: friend.name,
      friendAchievements: friend.achievements,
      beatFriendEntries: beatFriendLog.filter(e => e.friendId === friendId),
      activeRaces: Array.from(activeRaces.values()).filter(r => r.participants.includes(friendId)),
    };
  }

  return {
    COLLABORATIVE, LEADERBOARD_ACHIEVEMENTS, COMMUNITY_ACHIEVEMENTS, VIRAL_ACHIEVEMENTS,
    friends,
    addFriend, removeFriend, getFriend, getAllFriends,
    checkBeatFriend, beatFriendLog,
    updateCollaborative, collabProgress,
    shareAchievement, likePost, commentOnPost, getFeed, achievementFeed,
    startAchievementRace, updateRaceProgress, getRace,
    sendEncouragement, getEncouragementFor,
    checkLeaderboardRank, lbAchievProgress,
    updateCommunityProgress,
    triggerViralAchievement,
    compareWithFriend,
  };
})();


// ================================================================
// ACHIEVEMENT_STATS_ENGINE — Deep statistics for achievements
// ================================================================
const ACHIEVEMENT_STATS_ENGINE = (() => {
  const _db = {};
  const CATEGORIES = ['speed','trick','distance','collection','vehicle','social','secret','chain','league','milestone'];

  function _ensure(pid) { if (!_db[pid]) _db[pid] = { earned:[], progress:{}, streaks:{}, timestamps:{} }; }

  function earnAchievement(pid, aid, ts) {
    _ensure(pid);
    if (_db[pid].earned.includes(aid)) return false;
    _db[pid].earned.push(aid);
    _db[pid].timestamps[aid] = ts || Date.now();
    return true;
  }

  function updateProgress(pid, aid, val) {
    _ensure(pid);
    _db[pid].progress[aid] = val;
  }

  function getProgress(pid, aid) { _ensure(pid); return _db[pid].progress[aid] || 0; }
  function getEarned(pid) { _ensure(pid); return _db[pid].earned.slice(); }
  function hasEarned(pid, aid) { _ensure(pid); return _db[pid].earned.includes(aid); }

  function getCompletionRate(pid) {
    _ensure(pid);
    const total = 120;
    return Math.min(1, _db[pid].earned.length / total);
  }

  function getRarestEarned(pid, catalog) {
    _ensure(pid);
    const rarityOrder = ['legendary','epic','rare','common'];
    for (const r of rarityOrder) {
      const found = _db[pid].earned.find(aid => {
        const a = catalog.find(x => x.id === aid);
        return a && a.rarity === r;
      });
      if (found) return found;
    }
    return null;
  }

  function getRecentUnlocks(pid, count) {
    _ensure(pid);
    const ts = _db[pid].timestamps;
    return _db[pid].earned
      .map(aid => ({ aid, t: ts[aid] || 0 }))
      .sort((a, b) => b.t - a.t)
      .slice(0, count || 5)
      .map(x => x.aid);
  }

  function getCategoryCompletion(pid, catalog) {
    _ensure(pid);
    const result = {};
    for (const cat of CATEGORIES) {
      const all = catalog.filter(a => a.category === cat);
      const done = all.filter(a => _db[pid].earned.includes(a.id));
      result[cat] = { total: all.length, done: done.length, pct: all.length ? done.length / all.length : 0 };
    }
    return result;
  }

  function getTotalXpEarned(pid, catalog) {
    _ensure(pid);
    return _db[pid].earned.reduce((sum, aid) => {
      const a = catalog.find(x => x.id === aid);
      return sum + (a ? (a.xpReward || 0) : 0);
    }, 0);
  }

  function getTotalCoinsEarned(pid, catalog) {
    _ensure(pid);
    return _db[pid].earned.reduce((sum, aid) => {
      const a = catalog.find(x => x.id === aid);
      return sum + (a ? (a.coinReward || 0) : 0);
    }, 0);
  }

  function exportStats(pid) {
    _ensure(pid);
    return JSON.stringify(_db[pid]);
  }

  function importStats(pid, json) {
    try {
      _db[pid] = JSON.parse(json);
    } catch(e) { _db[pid] = { earned:[], progress:{}, streaks:{}, timestamps:{} }; }
  }

  // Streak tracking for daily missions
  function recordDailyCompletion(pid, dateStr) {
    _ensure(pid);
    const streaks = _db[pid].streaks;
    if (!streaks.lastDate) { streaks.lastDate = dateStr; streaks.current = 1; streaks.best = 1; return; }
    const last = new Date(streaks.lastDate);
    const now  = new Date(dateStr);
    const diff = Math.round((now - last) / 86400000);
    if (diff === 1) {
      streaks.current = (streaks.current || 0) + 1;
      if (streaks.current > (streaks.best || 0)) streaks.best = streaks.current;
    } else if (diff > 1) {
      streaks.current = 1;
    }
    streaks.lastDate = dateStr;
  }

  function getStreak(pid) {
    _ensure(pid);
    return _db[pid].streaks.current || 0;
  }

  function getBestStreak(pid) {
    _ensure(pid);
    return _db[pid].streaks.best || 0;
  }

  // Compare two players
  function compare(pid1, pid2) {
    _ensure(pid1); _ensure(pid2);
    const earned1 = new Set(_db[pid1].earned);
    const earned2 = new Set(_db[pid2].earned);
    const onlyP1 = [...earned1].filter(a => !earned2.has(a));
    const onlyP2 = [...earned2].filter(a => !earned1.has(a));
    const both   = [...earned1].filter(a => earned2.has(a));
    return { onlyP1, onlyP2, both,
             p1Total: earned1.size, p2Total: earned2.size };
  }

  // Prediction: which achievements is player closest to?
  function getNearlyComplete(pid, catalog, topN) {
    _ensure(pid);
    const progress = _db[pid].progress;
    const pending = catalog.filter(a => !_db[pid].earned.includes(a.id) && a.progressMax);
    return pending
      .map(a => ({ a, pct: Math.min(1, (progress[a.id] || 0) / a.progressMax) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, topN || 5)
      .map(x => ({ id: x.a.id, name: x.a.name, pct: x.pct }));
  }

  return {
    earnAchievement, updateProgress, getProgress, getEarned, hasEarned,
    getCompletionRate, getRarestEarned, getRecentUnlocks, getCategoryCompletion,
    getTotalXpEarned, getTotalCoinsEarned, exportStats, importStats,
    recordDailyCompletion, getStreak, getBestStreak, compare, getNearlyComplete
  };
})();

// ================================================================
// ACHIEVEMENT_NOTIFICATION_QUEUE — Animated unlock notifications
// ================================================================
const ACHIEVEMENT_NOTIFICATION_QUEUE = (() => {
  const _queue = [];
  let _current = null;
  let _timer = 0;
  const DISPLAY_MS = 3500;

  const RARITY_COLORS = {
    common:    { bg: '#2a2a2a', border: '#888', glow: 'rgba(136,136,136,0.4)' },
    rare:      { bg: '#0d1f3c', border: '#4488ff', glow: 'rgba(68,136,255,0.5)' },
    epic:      { bg: '#1a0a2e', border: '#aa44ff', glow: 'rgba(170,68,255,0.5)' },
    legendary: { bg: '#2e1500', border: '#ffaa00', glow: 'rgba(255,170,0,0.6)' },
    secret:    { bg: '#0a1a0a', border: '#00ff88', glow: 'rgba(0,255,136,0.5)' }
  };

  function push(achievementObj) {
    _queue.push({ ...achievementObj, addedAt: Date.now() });
  }

  function tick(dt) {
    if (_current) {
      _timer -= dt;
      if (_timer <= 0) _current = null;
    }
    if (!_current && _queue.length) {
      _current = _queue.shift();
      _timer = DISPLAY_MS;
    }
  }

  function getCurrent() { return _current; }

  function getRarityStyle(rarity) {
    return RARITY_COLORS[rarity] || RARITY_COLORS.common;
  }

  function getDisplayProgress() {
    if (!_current) return null;
    const elapsed = DISPLAY_MS - _timer;
    const fadeIn  = Math.min(1, elapsed / 400);
    const fadeOut = _timer < 500 ? _timer / 500 : 1;
    const opacity = Math.min(fadeIn, fadeOut);
    const slideY  = (1 - fadeIn) * -40;
    return { opacity, slideY, style: getRarityStyle(_current.rarity || 'common') };
  }

  function clear() { _queue.length = 0; _current = null; _timer = 0; }
  function queueLength() { return _queue.length; }

  return { push, tick, getCurrent, getDisplayProgress, clear, queueLength };
})();

// ================================================================
// ACHIEVEMENT_SHARE_SYSTEM — Generate shareable achievement cards
// ================================================================
const ACHIEVEMENT_SHARE_SYSTEM = (() => {
  const _templates = [
    { id:'minimal',    bg:'#111',  text:'#fff', accent:'#FFD700' },
    { id:'gradient',   bg:'linear-gradient(135deg,#1a1a2e,#16213e)', text:'#e0e0ff', accent:'#7b68ee' },
    { id:'fire',       bg:'linear-gradient(135deg,#3a0000,#7a2000)', text:'#ffe0cc', accent:'#ff6600' },
    { id:'ice',        bg:'linear-gradient(135deg,#001a3a,#003a7a)', text:'#ccf0ff', accent:'#00ccff' },
    { id:'legendary',  bg:'linear-gradient(135deg,#2e1a00,#5a3a00)', text:'#ffe8a0', accent:'#ffaa00' }
  ];

  function generateShareText(achievement, playerName, extraStats) {
    const lines = [
      `🏆 Achievement Unlocked!`,
      `"${achievement.name}"`,
      achievement.description,
      `— ${playerName}`,
      extraStats ? `📊 ${extraStats}` : '',
      `#AHMETClone #Achievement`
    ];
    return lines.filter(Boolean).join('\n');
  }

  function generateShareCode(achievement, playerId) {
    const data = { aid: achievement.id, pid: playerId, t: Date.now() };
    try { return btoa(JSON.stringify(data)); } catch(e) { return ''; }
  }

  function parseShareCode(code) {
    try { return JSON.parse(atob(code)); } catch(e) { return null; }
  }

  function getTemplate(id) {
    return _templates.find(t => t.id === id) || _templates[0];
  }

  function listTemplates() { return _templates.map(t => t.id); }

  return { generateShareText, generateShareCode, parseShareCode, getTemplate, listTemplates };
})();

// ================================================================
// ACHIEVEMENT_RARITY_TABLE — Rarity weights & rewards
// ================================================================
const ACHIEVEMENT_RARITY_TABLE = (() => {
  const TABLE = {
    common:    { weight:60, xpMult:1.0,  coinMult:1.0,  badge:'⚪', label:'Common'   },
    rare:      { weight:25, xpMult:2.0,  coinMult:2.5,  badge:'🔵', label:'Rare'     },
    epic:      { weight:10, xpMult:5.0,  coinMult:6.0,  badge:'🟣', label:'Epic'     },
    legendary: { weight:4,  xpMult:15.0, coinMult:20.0, badge:'🟡', label:'Legendary'},
    secret:    { weight:1,  xpMult:25.0, coinMult:50.0, badge:'🟢', label:'Secret'   }
  };

  function getWeight(rarity) { return (TABLE[rarity] || TABLE.common).weight; }
  function getXpMult(rarity) { return (TABLE[rarity] || TABLE.common).xpMult; }
  function getCoinMult(rarity) { return (TABLE[rarity] || TABLE.common).coinMult; }
  function getBadge(rarity) { return (TABLE[rarity] || TABLE.common).badge; }
  function getLabel(rarity) { return (TABLE[rarity] || TABLE.common).label; }

  function calcReward(baseXp, baseCoins, rarity) {
    return {
      xp:    Math.round(baseXp    * getXpMult(rarity)),
      coins: Math.round(baseCoins * getCoinMult(rarity))
    };
  }

  function getAll() { return { ...TABLE }; }

  return { getWeight, getXpMult, getCoinMult, getBadge, getLabel, calcReward, getAll };
})();

// ================================================================
// ACHIEVEMENT_LOCALIZATION — Multi-language achievement text
// ================================================================
const ACHIEVEMENT_LOCALIZATION = (() => {
  const LANGS = {
    en: {
      unlocked: 'Achievement Unlocked!',
      progress: 'Progress',
      completed: 'Completed',
      secret:   'Secret Achievement',
      chain:    'Chain Achievement',
      daily:    'Daily Mission Complete',
      weekly:   'Weekly Challenge Complete',
      streak:   'Streak Bonus'
    },
    tr: {
      unlocked: 'Achievement Unlocked!',
      progress: 'Progress',
      completed: 'Completed',
      secret:   'Secret Achievement',
      chain:    'Chain Achievement',
      daily:    'Daily Mission Completed',
      weekly:   'Weekly Challenge Completed',
      streak:   'Streak Bonus'
    },
    de: {
      unlocked: 'Erfolg freigeschaltet!',
      progress: 'Fortschritt',
      completed: 'Abgeschlossen',
      secret:   'Geheimer Erfolg',
      chain:    'Ketten-Erfolg',
      daily:    'Tagesauftrag erfüllt',
      weekly:   'Wöchentliche Challenge erfüllt',
      streak:   'Serienbonus'
    },
    fr: {
      unlocked: 'Achievement Unlocked!',
      progress: 'Progress',
      completed: 'Completed',
      secret:   'Secret Achievement',
      chain:    'Chain Achievement',
      daily:    'Daily Mission Complete',
      weekly:   'Weekly Challenge Complete',
      streak:   'Streak Bonus'
    },
    es: {
      unlocked: '¡Logro desbloqueado!',
      progress: 'Progreso',
      completed: 'Completado',
      secret:   'Logro secreto',
      chain:    'Logro en cadena',
      daily:    'Misión diaria completada',
      weekly:   'Desafío semanal completado',
      streak:   'Bonificación de racha'
    }
  };

  let _lang = 'en';
  function setLang(l) { _lang = LANGS[l] ? l : 'en'; }
  function getLang() { return _lang; }
  function t(key) { return (LANGS[_lang] || LANGS.en)[key] || key; }
  function availableLangs() { return Object.keys(LANGS); }

  return { setLang, getLang, t, availableLangs };
})();


// ================================================================
// ACHIEVEMENT_TRACKER_V2 — Real-time stat tracking for achievements
// ================================================================
const ACHIEVEMENT_TRACKER_V2 = (() => {
  const LS_KEY = 'ahmet_ach_tracker_v2';

  const TRACKED_STATS = {
    total_distance_m:         { type:'cumulative', label:'Total Distance (m)',         default:0 },
    total_flips:              { type:'cumulative', label:'Total Flips',                default:0 },
    total_coins_earned:       { type:'cumulative', label:'Total Coins Earned',         default:0 },
    total_races:              { type:'cumulative', label:'Total Races',                default:0 },
    total_races_won:          { type:'cumulative', label:'Total Races Won',            default:0 },
    total_crashes:            { type:'cumulative', label:'Total Crashes',              default:0 },
    total_fuel_used:          { type:'cumulative', label:'Total Fuel Used',            default:0 },
    total_play_time_s:        { type:'cumulative', label:'Total Play Time (s)',        default:0 },
    longest_jump_m:           { type:'max',        label:'Longest Jump (m)',           default:0 },
    highest_speed_kmh:        { type:'max',        label:'Highest Speed (km/h)',       default:0 },
    highest_combo:            { type:'max',        label:'Highest Combo',              default:0 },
    longest_wheelie_s:        { type:'max',        label:'Longest Wheelie (s)',        default:0 },
    longest_airtime_s:        { type:'max',        label:'Longest Airtime (s)',        default:0 },
    best_single_race_dist_m:  { type:'max',        label:'Best Single Race (m)',       default:0 },
    current_win_streak:       { type:'streak',     label:'Current Win Streak',        default:0 },
    max_win_streak:           { type:'max',        label:'Max Win Streak',            default:0 },
    current_daily_streak:     { type:'streak',     label:'Current Daily Streak',      default:0 },
    max_daily_streak:         { type:'max',        label:'Max Daily Streak',          default:0 },
    vehicles_unlocked:        { type:'set',        label:'Vehicles Unlocked',         default:[] },
    maps_completed:           { type:'set',        label:'Maps Completed',            default:[] },
    missions_completed:       { type:'cumulative', label:'Missions Completed',         default:0 },
    perfect_races:            { type:'cumulative', label:'Perfect Races',              default:0 },
    total_gems_earned:        { type:'cumulative', label:'Total Gems Earned',          default:0 },
    total_upgrades_bought:    { type:'cumulative', label:'Total Upgrades Bought',      default:0 },
    backflips_total:          { type:'cumulative', label:'Total Backflips',            default:0 },
    frontflips_total:         { type:'cumulative', label:'Total Frontflips',           default:0 },
    gold_medals:              { type:'cumulative', label:'Gold Medals',                default:0 },
    tournaments_won:          { type:'cumulative', label:'Tournaments Won',            default:0 },
    boss_races_won:           { type:'cumulative', label:'Boss Races Won',             default:0 },
    night_races_completed:    { type:'cumulative', label:'Night Races Completed',      default:0 },
    weather_races_completed:  { type:'cumulative', label:'Weather Races Completed',    default:0 },
  };

  let _data = {};

  function load() {
    try { _data = JSON.parse(localStorage.getItem(LS_KEY)||'{}'); } catch(e){ _data = {}; }
    // Init missing
    for (const [k,v] of Object.entries(TRACKED_STATS)) {
      if (!(_data[k] !== undefined)) {
        _data[k] = Array.isArray(v.default) ? [...v.default] : v.default;
      }
    }
  }

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_data)); } catch(e){}
  }

  function add(stat, amount) {
    if (!(stat in _data)) return;
    const def = TRACKED_STATS[stat];
    if (!def) return;
    if (def.type === 'cumulative') {
      _data[stat] = (_data[stat]||0) + (amount||1);
    } else if (def.type === 'max') {
      _data[stat] = Math.max(_data[stat]||0, amount||0);
    } else if (def.type === 'streak') {
      _data[stat] = (_data[stat]||0) + 1;
      // Update max streak
      const maxKey = stat.replace('current_','max_');
      if (_data[maxKey] !== undefined) _data[maxKey] = Math.max(_data[maxKey]||0, _data[stat]);
    } else if (def.type === 'set') {
      if (!_data[stat].includes(amount)) _data[stat].push(amount);
    }
    save();
  }

  function resetStreak(stat) {
    if (TRACKED_STATS[stat]?.type === 'streak') { _data[stat] = 0; save(); }
  }

  function get(stat) { return _data[stat]; }
  function getAll()  { return { ..._data }; }
  function reset()   { _data={}; load(); save(); }

  // Convenience wrappers
  function addDistance(m)      { add('total_distance_m', m); add('best_single_race_dist_m', m); }
  function addFlip(type)       { add('total_flips'); if(type==='back')add('backflips_total'); if(type==='front')add('frontflips_total'); }
  function addCoins(n)         { add('total_coins_earned', n); }
  function addGems(n)          { add('total_gems_earned', n); }
  function recordRace(won, perfect, isNight, hasWeather) {
    add('total_races');
    if (won) { add('total_races_won'); add('current_win_streak'); }
    else     { resetStreak('current_win_streak'); }
    if (perfect) add('perfect_races');
    if (isNight) add('night_races_completed');
    if (hasWeather) add('weather_races_completed');
  }
  function recordSpeed(kmh)    { add('highest_speed_kmh', kmh); }
  function recordJump(m)       { add('longest_jump_m', m); }
  function recordAirtime(s)    { add('longest_airtime_s', s); }
  function recordWheellie(s)   { add('longest_wheelie_s', s); }
  function recordCombo(n)      { add('highest_combo', n); }
  function unlockVehicle(id)   { add('vehicles_unlocked', id); }
  function completeMap(id)     { add('maps_completed', id); }
  function addPlayTime(s)      { add('total_play_time_s', s); }

  // Check which achievements are newly met
  function checkNewlyUnlocked(catalog) {
    const all   = getAll();
    const newly = [];
    for (const ach of (catalog||[])) {
      if (!ach.condition) continue;
      try { if (ach.condition(all)) newly.push(ach); } catch(e){}
    }
    return newly;
  }

  load();
  return { add, resetStreak, get, getAll, reset, load, save, TRACKED_STATS,
           addDistance, addFlip, addCoins, addGems, recordRace, recordSpeed, recordJump,
           recordAirtime, recordWheellie, recordCombo, unlockVehicle, completeMap, addPlayTime,
           checkNewlyUnlocked };
})();

// ================================================================
// ACHIEVEMENT_PROGRESS_MAP — UI progress for each achievement
// ================================================================
const ACHIEVEMENT_PROGRESS_MAP = (() => {
  function getProgress(achievement, trackerData) {
    if (!achievement.progressStat) return null;
    const current = trackerData[achievement.progressStat] || 0;
    const target  = achievement.progressTarget;
    if (!target) return null;
    const isSet = Array.isArray(current);
    const val   = isSet ? current.length : current;
    return {
      current:  val,
      target,
      pct:      Math.min(1, val/target),
      done:     val >= target,
      label:    `${Math.min(val,target).toLocaleString()} / ${target.toLocaleString()}`
    };
  }

  function getProgressForAll(catalog, trackerData) {
    const result = {};
    for (const ach of catalog) {
      result[ach.id] = getProgress(ach, trackerData);
    }
    return result;
  }

  function getMostComplete(catalog, trackerData, n) {
    const withProgress = catalog
      .map(a=>({ ...a, progress:getProgress(a,trackerData) }))
      .filter(a=>a.progress && !a.progress.done && a.progress.pct>0)
      .sort((a,b)=>b.progress.pct-a.progress.pct);
    return withProgress.slice(0, n||5);
  }

  return { getProgress, getProgressForAll, getMostComplete };
})();

// ================================================================
// ACHIEVEMENT_EVENT_BUS — Pub/sub for achievement events
// ================================================================
const ACHIEVEMENT_EVENT_BUS = (() => {
  const _listeners = {};

  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
    return ()=>off(event,fn);
  }

  function off(event, fn) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(f=>f!==fn);
  }

  function emit(event, data) {
    if (!_listeners[event]) return;
    for (const fn of _listeners[event]) { try{fn(data);}catch(e){} }
  }

  // Standard events
  const EVENTS = {
    UNLOCKED:       'achievement:unlocked',
    PROGRESS:       'achievement:progress',
    CHAIN_COMPLETE: 'achievement:chain_complete',
    MILESTONE:      'achievement:milestone',
    DAILY_COMPLETE: 'achievement:daily_complete',
    WEEKLY_COMPLETE:'achievement:weekly_complete',
    LEAGUE_RANK:    'achievement:league_rank',
  };

  function onUnlocked(fn)      { return on(EVENTS.UNLOCKED, fn); }
  function onProgress(fn)      { return on(EVENTS.PROGRESS, fn); }
  function onMilestone(fn)     { return on(EVENTS.MILESTONE, fn); }
  function onChainComplete(fn) { return on(EVENTS.CHAIN_COMPLETE, fn); }

  function emitUnlocked(ach)   { emit(EVENTS.UNLOCKED, ach); }
  function emitProgress(ach,p) { emit(EVENTS.PROGRESS,  {achievement:ach, progress:p}); }
  function emitMilestone(m)    { emit(EVENTS.MILESTONE, m); }
  function emitChain(chain)    { emit(EVENTS.CHAIN_COMPLETE, chain); }

  return { on, off, emit, onUnlocked, onProgress, onMilestone, onChainComplete, emitUnlocked, emitProgress, emitMilestone, emitChain, EVENTS };
})();

// ═══════════════════════════════════════════════════════════════════════════
//  KlanBasarim — 15 KLAN BAŞARIMININ KOŞUL + KP ÖDÜL KATMANI (3 Ağu, Ajan H)
// ═══════════════════════════════════════════════════════════════════════════
//  🔴 BAŞARIM MOTORU DEĞİŞMEDİ. `Achievements.check()`, `_adayKur()`, `_dus()`
//     ve iki katmanlı indeks (`_grup[tip].uyeler` + `_grup[tip].min`) BİR
//     KARAKTER bile değişmedi. Bu modül yalnızca:
//       1) klan durumunu ölçer,
//       2) koşulu sağlanan başarım için `Achievements.check(id)` çağırır
//          (benzersiz tip → sıcak yolda SIFIR maliyet, bkz. katalog notu),
//       3) YENİ açılan başarımın KP'sini `Klan.kpEkle` ile bir kez öder.
//
//  🔴 ALTIN/ELMAS ÖDENMEZ. Katalog kayıtlarında `reward:` alanı YOKTUR; bu
//     yüzden `_notifyUnlock()` `SaveData.addGold/addDiamonds` yoluna HİÇ
//     girmez (dogrula-klan.js §B9 bunu sayaçla ölçüyor).
//
//  ⚠ Bağış / mentorluk / dostluk / etkinlik rekoru için klan şemasında hazır
//    alan YOK. Bu dört sayaç klan nesnesinin `basarimSayac` alanında tutulur
//    (additive; sözleşme §4 gereği yazma `Klan.kaydet()` üzerinden yapılır).
//  ⚠ `Klan`, `KlanSim`, `KlanKutu` bare global olabilir → typeof ile erişilir.
const KlanBasarim = {
  ad: 'klanBasarim',
  surum: '1.0',

  // id → koşul anahtarı + eşik. `kpHam` katalogda (tek kaynak).
  KOSUL: [
    { id: 'klan_kurucu',       alan: 'kurucu',        esik: 1      },
    { id: 'klan_savascisi',    alan: 'etkinlikKatilan', esik: 10   },
    { id: 'klan_lideri',       alan: 'seviye',        esik: 10     },
    { id: 'klan_efsanevi',     alan: 'efsaneLig',     esik: 1      },
    { id: 'klan_toplayici',    alan: 'uyeSayisi',     esik: 20     },
    { id: 'klan_savas_galibi', alan: 'savasKazanilan', esik: 10    },
    { id: 'klan_bagisci',      alan: 'bagis',         esik: 100    },
    { id: 'klan_ustasi',       alan: 'toplamXp',      esik: 50000  },
    { id: 'klan_sadik',        alan: 'uyelikGun',     esik: 30     },
    { id: 'klan_rekortmen',    alan: 'enIyiEtkinlikPuan', esik: 100000 },
    { id: 'klan_diplomat',     alan: 'dostKlan',      esik: 5      },
    { id: 'klan_egitmen',      alan: 'mentorluk',     esik: 10     },
    { id: 'klan_fatihi',       alan: 'ligBirincilik', esik: 1      },
    { id: 'klan_koleksiyon',   alan: 'tumKutularAcildi', esik: 1   },
    { id: 'klan_duayeni',      alan: 'seviye',        esik: 50     }
  ],
  SAYAC_ANAHTAR: ['bagis', 'mentorluk', 'dostKlan', 'enIyiEtkinlikPuan', 'ligBirincilik'],

  _K() { return (typeof Klan !== 'undefined' && Klan) ? Klan : ((typeof window !== 'undefined' && window.Klan) ? window.Klan : null); },
  _S() { return (typeof KlanSim !== 'undefined' && KlanSim) ? KlanSim : ((typeof window !== 'undefined' && window.KlanSim) ? window.KlanSim : null); },
  _Kutu() { return (typeof KlanKutu !== 'undefined' && KlanKutu) ? KlanKutu : ((typeof window !== 'undefined' && window.KlanKutu) ? window.KlanKutu : null); },
  _A() { return (typeof Achievements !== 'undefined' && Achievements) ? Achievements : ((typeof window !== 'undefined' && window.Achievements) ? window.Achievements : null); },
  _sd() { return (typeof SaveData !== 'undefined' && SaveData && SaveData.data) ? SaveData : null; },
  _sayi(v, d) { const n = Number(v); return isFinite(n) ? n : (d || 0); },

  // Katalogdaki 15 kaydı döndürür (tek kaynak — burada KOPYA tutulmaz).
  katalog() {
    const A = this._A();
    if (!A || !Array.isArray(A.list)) return [];
    const idler = {};
    for (let i = 0; i < this.KOSUL.length; i++) idler[this.KOSUL[i].id] = true;
    return A.list.filter(function (a) { return a && idler[a.id]; });
  },
  tanim(id) {
    const l = this.katalog();
    for (let i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  },
  // §6: KP = kpCevir(altın, elmas) × odulCarpani(). Ham değer katalogda kilitli.
  kp(id) {
    const t = this.tanim(id), K = this._K();
    if (!t) return 0;
    if (K && typeof K.kpOdul === 'function') return K.kpOdul(t.kaynakAltin, t.kaynakElmas);
    return this._sayi(t.kpHam, 0);
  },
  kpHam(id) { const t = this.tanim(id); return t ? this._sayi(t.kpHam, 0) : 0; },

  // ── Sayaçlar (şemada hazır alanı olmayan 5 koşul) ───────────────────────
  _kova() {
    const K = this._K();
    const k = (K && typeof K.al === 'function') ? K.al() : null;
    if (!k) return null;
    if (!k.basarimSayac || typeof k.basarimSayac !== 'object') k.basarimSayac = {};
    return k.basarimSayac;
  },
  sayacArtir(anahtar, n) {
    if (this.SAYAC_ANAHTAR.indexOf(anahtar) < 0) return 0;
    const kv = this._kova();
    if (!kv) return 0;
    kv[anahtar] = this._sayi(kv[anahtar], 0) + Math.max(0, this._sayi(n, 1));
    const K = this._K(); if (K && typeof K.kaydet === 'function') K.kaydet();
    return kv[anahtar];
  },
  sayacEnBuyuk(anahtar, deger) {
    if (this.SAYAC_ANAHTAR.indexOf(anahtar) < 0) return 0;
    const kv = this._kova();
    if (!kv) return 0;
    const d = this._sayi(deger, 0);
    if (d > this._sayi(kv[anahtar], 0)) {
      kv[anahtar] = d;
      const K = this._K(); if (K && typeof K.kaydet === 'function') K.kaydet();
    }
    return kv[anahtar];
  },

  // ── ÖLÇÜM — canlı modüllerden toplanır, hepsi typeof korumalı ───────────
  olcum() {
    const K = this._K(), S = this._S(), Ku = this._Kutu();
    const o = {
      kurucu: 0, etkinlikKatilan: 0, seviye: 0, efsaneLig: 0, uyeSayisi: 0,
      savasKazanilan: 0, bagis: 0, toplamXp: 0, uyelikGun: 0,
      enIyiEtkinlikPuan: 0, dostKlan: 0, mentorluk: 0, ligBirincilik: 0,
      tumKutularAcildi: 0
    };
    if (!K || typeof K.var !== 'function' || !K.var()) return o;
    const k = K.al();
    if (!k) return o;
    o.kurucu = (k.kurucuId && k.benimId && k.kurucuId === k.benimId) ? 1 : 0;
    o.etkinlikKatilan = this._sayi(k.etkinlikKatilan, 0);
    o.seviye = (typeof K.seviye === 'function') ? this._sayi(K.seviye(), 1) : 1;
    o.uyeSayisi = (typeof K.uyeler === 'function') ? K.uyeler().length : 0;
    o.savasKazanilan = this._sayi(k.savasKazanilan, 0);
    o.toplamXp = this._sayi(k.xp, 0);
    const simdi = (typeof K._simdi === 'function') ? K._simdi() : Date.now();
    const bas = this._sayi(k.kurulus, simdi);
    o.uyelikGun = Math.max(0, Math.floor((simdi - bas) / 86400000));
    if (S && typeof S.ligBul === 'function') {
      const lig = S.ligBul(this._sayi(k.ligPuan, 0));
      o.efsaneLig = (lig && lig.id === 'efsane') ? 1 : 0;
    }
    if (Ku && typeof Ku.istatistik === 'function' && Array.isArray(Ku.KUTU_SIRA)) {
      const st = Ku.istatistik();
      if (st && st.turAcilan) {
        let hepsi = 1;
        for (let i = 0; i < Ku.KUTU_SIRA.length; i++) if (!(this._sayi(st.turAcilan[Ku.KUTU_SIRA[i]], 0) > 0)) hepsi = 0;
        o.tumKutularAcildi = hepsi;
      }
    }
    const kv = (k.basarimSayac && typeof k.basarimSayac === 'object') ? k.basarimSayac : {};
    for (let i = 0; i < this.SAYAC_ANAHTAR.length; i++) {
      const a = this.SAYAC_ANAHTAR[i];
      o[a] = this._sayi(kv[a], 0);
    }
    return o;
  },

  ilerleme() {
    const o = this.olcum(), sd = this._sd(), cikti = [];
    for (let i = 0; i < this.KOSUL.length; i++) {
      const c = this.KOSUL[i], t = this.tanim(c.id);
      const deger = this._sayi(o[c.alan], 0);
      cikti.push({
        id: c.id, ad: t ? t.name : c.id, aciklama: t ? t.desc : '', ikon: t ? t.icon : '',
        zorluk: t ? t.zorluk : '', kp: this.kp(c.id), kpHam: this.kpHam(c.id),
        deger: deger, hedef: c.esik,
        oran: c.esik > 0 ? Math.min(1, deger / c.esik) : 0,
        acildi: !!(sd && sd.hasAchievement && sd.hasAchievement(c.id))
      });
    }
    return cikti;
  },

  // ── ANA GİRİŞ: koşulları ölç, açılanı bildir, KP'yi BİR KEZ öde ─────────
  //   Sıcak döngüde ÇAĞIRMA — koşu sonunda / klan ekranı açılınca çağır.
  degerlendir() {
    const A = this._A(), K = this._K(), sd = this._sd();
    const sonuc = { acilan: [], kp: 0, kontrol: 0 };
    if (!A || typeof A.check !== 'function' || !sd) return sonuc;
    const o = this.olcum();
    for (let i = 0; i < this.KOSUL.length; i++) {
      const c = this.KOSUL[i];
      if (this._sayi(o[c.alan], 0) < c.esik) continue;
      sonuc.kontrol++;
      const onceAcik = !!(sd.hasAchievement && sd.hasAchievement(c.id));
      if (onceAcik) continue;
      A.check(c.id);
      if (sd.hasAchievement && sd.hasAchievement(c.id)) {
        const kp = this.kp(c.id);
        if (K && typeof K.kpEkle === 'function' && kp > 0) K.kpEkle(kp, 'basarim');
        if (K && typeof K.xpEkle === 'function') K.xpEkle('basarim', 1);
        if (K && typeof K.duyuru === 'function') {
          const t = this.tanim(c.id);
          K.duyuru('basarim', 'Başarım açıldı: ' + (t ? t.name : c.id) + ' (+' + kp + ' KP)', { id: c.id, kp: kp });
        }
        sonuc.acilan.push(c.id);
        sonuc.kp += kp;
      }
    }
    return sonuc;
  },

  hazir() { return true; },

  // ── selfTest — HER KONTROL ÖLÇEREK ──────────────────────────────────────
  selfTest() {
    const r = {};
    const A = this._A();
    r.motorVar = !!A && Array.isArray(A.list);
    const kat = this.katalog();
    r.onBesBasarim = (kat.length === 15);
    r.kosulTablosuTam = (this.KOSUL.length === 15);
    // Katalog ↔ koşul eşleşmesi
    let eslesme = true;
    for (let i = 0; i < this.KOSUL.length; i++) if (!this.tanim(this.KOSUL[i].id)) eslesme = false;
    r.hepsiKatalogda = eslesme;
    // 🔴 Ödül YALNIZ KP: hiçbir kayıtta `reward` alanı olmamalı (yoksa
    //   `_notifyUnlock` SaveData.addGold çağırır).
    let paraVar = false, kpToplam = 0, tipBenzersiz = true;
    const tipler = {};
    for (let i = 0; i < kat.length; i++) {
      const a = kat[i];
      if (a.reward || a.coins || a.gems || a.gold || a.diamonds || a.altin || a.elmas) paraVar = true;
      kpToplam += this._sayi(a.kpHam, 0);
      if (tipler[a.type]) tipBenzersiz = false;
      tipler[a.type] = 1;
      // §6 dönüşümü: kpHam = round(altın/100 + elmas×4)
      if (Math.round(this._sayi(a.kaynakAltin, 0) / 100 + this._sayi(a.kaynakElmas, 0) * 4) !== this._sayi(a.kpHam, 0)) eslesme = false;
    }
    r.paraOdulYok = (paraVar === false);
    r.donusumDogru = eslesme;
    r.tipleriBenzersiz = tipBenzersiz;
    r.duayeni8500 = (this.kpHam('klan_duayeni') === 8500);        // sözleşme §6
    r.kurucu210 = (this.kpHam('klan_kurucu') === 210);
    r.fatih4200 = (this.kpHam('klan_fatihi') === 4200);
    r._kpToplam = kpToplam;
    r.kpToplamMakul = (kpToplam > 20000 && kpToplam < 30000);      // 24.600 bekleniyor
    // 🔴 İNDEKS BOZULMADI MI? — klan tipleri `_DURUM_TIPLERI`'ne veya
    //    `rank`/`manual` grubuna GİRMEMELİ (girerse sıcak yol yavaşlar).
    let sicakYolTemiz = true;
    if (A && Array.isArray(A._DURUM_TIPLERI)) {
      for (let i = 0; i < kat.length; i++) {
        if (A._DURUM_TIPLERI.indexOf(kat[i].type) >= 0) sicakYolTemiz = false;
        if (kat[i].type === 'rank' || kat[i].type === 'manual') sicakYolTemiz = false;
      }
    }
    r.sicakYolEtkilenmedi = sicakYolTemiz;
    // Ölçüm nesnesi tüm koşul alanlarını üretiyor mu?
    const o = this.olcum();
    let alanTam = true;
    for (let i = 0; i < this.KOSUL.length; i++) if (typeof o[this.KOSUL[i].alan] !== 'number') alanTam = false;
    r.olcumAlanlariTam = alanTam;
    r.olcumKlansizCokmuyor = (typeof o === 'object' && o !== null);
    const il = this.ilerleme();
    r.ilerlemeOnBes = (il.length === 15) && il.every(function (x) { return x.oran >= 0 && x.oran <= 1; });
    r.allPass = Object.keys(r).every(function (x) { return x === 'allPass' || x.charAt(0) === '_' || r[x] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') window.KlanBasarim = KlanBasarim;
if (typeof module !== 'undefined' && module.exports) module.exports = KlanBasarim;
