
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
// TERRAIN_EXTRA_BIOMES_V2 — Extended biome definitions and rules
// ================================================================
const TERRAIN_EXTRA_BIOMES_V2 = (() => {
  const BIOMES = {
    volcanic: {
      name:'Volcanic',       groundColor:'#1a0800', accentColor:'#ff4400', skyGradient:['#220000','#440800'],
      gravity:9.81,          friction:0.85,          airDensity:1.3,
      hazardTypes:['fire_zone','rock_fall'],
      decorations:['lava_rock','obsidian_pillar','smoke_vent'],
      ambientLight:{ r:1.2, g:0.6, b:0.3 },
      fogColor:'rgba(80,20,0,0.15)',
      weather:['clear','storm'],
      musicMood:'intense',
      windRange:[-2,5],
      particleEmitters:['lava_spark','ash_fall'],
      // --- additive visual palette (charred crust with molten veins) ---
      groundShadow:'#0a0300', groundHighlight:'#5a1c00', groundDetail:'#2e0f02',
      glowColor:'rgba(255,90,20,0.55)', rimLight:'#ff7a2a',
      textureBands:['#150600','#240b02','#3a1103'], sunTint:'#ff6a30',
    },
    jungle: {
      name:'Jungle',         groundColor:'#1a2e00', accentColor:'#44aa00', skyGradient:['#0a1a00','#1a3300'],
      gravity:9.81,          friction:0.9,           airDensity:1.25,
      hazardTypes:['mudpit','water_hazard'],
      decorations:['palm_tree','fern','vine','fallen_log'],
      ambientLight:{ r:0.7, g:1.1, b:0.6 },
      fogColor:'rgba(20,60,0,0.12)',
      weather:['rain','storm','cloudy','clear'],
      musicMood:'tense',
      windRange:[-1,3],
      particleEmitters:['leaf_fall','rain_heavy'],
      // --- additive visual palette (damp loam under thick canopy) ---
      groundShadow:'#0c1800', groundHighlight:'#3f6a12', groundDetail:'#22400a',
      glowColor:'rgba(80,200,40,0.18)', rimLight:'#6ecb2e',
      textureBands:['#132600','#1c3800','#264d05'], sunTint:'#a8e060',
    },
    arctic: {
      name:'Arctic',         groundColor:'#c8dde8', accentColor:'#aaddff', skyGradient:['#111a22','#2244aa'],
      gravity:9.81,          friction:0.4,           airDensity:1.35,
      hazardTypes:['ice_patch','snow'],
      decorations:['ice_spike','frozen_rock','snow_mound','pine_dead'],
      ambientLight:{ r:0.85, g:0.9, b:1.1 },
      fogColor:'rgba(180,210,230,0.08)',
      weather:['snow','blizzard','clear','cloudy'],
      musicMood:'calm',
      windRange:[-6,6],
      particleEmitters:['snow_fall','breath_mist'],
      // --- additive visual palette (packed snow with blue shadow) ---
      groundShadow:'#8fb2cc', groundHighlight:'#ffffff', groundDetail:'#b3d0e0',
      glowColor:'rgba(180,220,255,0.25)', rimLight:'#eaf6ff',
      textureBands:['#c8dde8','#d8e9f2','#eaf4fb'], sunTint:'#dff0ff',
    },
    savanna: {
      name:'Savanna',        groundColor:'#8a6a20', accentColor:'#ddaa44', skyGradient:['#441a00','#ff8800'],
      gravity:9.81,          friction:0.75,          airDensity:1.18,
      hazardTypes:['sand_trap'],
      decorations:['acacia_tree','dry_grass','termite_mound','boulder'],
      ambientLight:{ r:1.3, g:1.1, b:0.7 },
      fogColor:'rgba(200,150,50,0.06)',
      weather:['clear','desert','cloudy'],
      musicMood:'calm',
      windRange:[0,4],
      particleEmitters:['dust_light','heat_shimmer'],
      // --- additive visual palette (sun-baked golden earth) ---
      groundShadow:'#5c4410', groundHighlight:'#c99a3c', groundDetail:'#a07d24',
      glowColor:'rgba(255,200,90,0.20)', rimLight:'#ffd77a',
      textureBands:['#7d5f1c','#8a6a20','#a07d28'], sunTint:'#ffcf70',
    },
    underwater: {
      name:'Underwater',     groundColor:'#001830', accentColor:'#004488', skyGradient:['#000810','#001830'],
      gravity:2.5,           friction:0.3,           airDensity:5.0,
      hazardTypes:['water_hazard'],
      decorations:['coral','kelp','bubble_vent','sunken_ship'],
      ambientLight:{ r:0.4, g:0.7, b:1.1 },
      fogColor:'rgba(0,40,80,0.3)',
      weather:['underwater'],
      musicMood:'calm',
      windRange:[0,0],
      particleEmitters:['bubble_rise','particle_float'],
      // --- additive visual palette (deep silt with caustic light) ---
      groundShadow:'#000c1a', groundHighlight:'#0a3a66', groundDetail:'#04223f',
      glowColor:'rgba(0,120,200,0.30)', rimLight:'#3aa0ff',
      textureBands:['#001526','#001f3a','#002b52'], sunTint:'#59b6ff',
    },
    neon_city: {
      name:'Neon City',      groundColor:'#0a0a18', accentColor:'#ff00ff', skyGradient:['#000000','#0a0020'],
      gravity:9.81,          friction:0.8,           airDensity:1.2,
      hazardTypes:['oil_slick'],
      decorations:['neon_sign','building_silhouette','street_light','hologram'],
      ambientLight:{ r:0.8, g:0.5, b:1.2 },
      fogColor:'rgba(80,0,120,0.1)',
      weather:['clear','rain'],
      musicMood:'intense',
      windRange:[-1,2],
      particleEmitters:['neon_spark','rain_light'],
      // --- additive visual palette (wet asphalt with neon reflections) ---
      groundShadow:'#050510', groundHighlight:'#241040', groundDetail:'#120826',
      glowColor:'rgba(255,0,255,0.35)', rimLight:'#00e5ff',
      textureBands:['#08081a','#0e0a24','#160a32'], sunTint:'#c060ff',
    },
    canyon: {
      name:'Canyon',         groundColor:'#7a3a10', accentColor:'#cc6622', skyGradient:['#220a00','#773300'],
      gravity:9.81,          friction:0.8,           airDensity:1.1,
      hazardTypes:['rock_fall','sand_trap'],
      decorations:['rock_arch','canyon_wall','cactus','dust_devil'],
      ambientLight:{ r:1.3, g:0.95, b:0.7 },
      fogColor:'rgba(150,80,20,0.04)',
      weather:['clear','desert','cloudy'],
      musicMood:'normal',
      windRange:[-2,6],
      particleEmitters:['dust_swirl','canyon_echo'],
      // --- additive visual palette (layered red sandstone strata) ---
      groundShadow:'#4a1e08', groundHighlight:'#c56a2c', groundDetail:'#8a4014',
      glowColor:'rgba(255,140,60,0.18)', rimLight:'#ff9a4a',
      textureBands:['#5e2a0c','#7a3a10','#9a5018'], sunTint:'#ffab5c',
    },
    swamp: {
      name:'Swamp',          groundColor:'#1a2a0a', accentColor:'#557722', skyGradient:['#080d04','#1a2a0a'],
      gravity:9.81,          friction:0.5,           airDensity:1.3,
      hazardTypes:['mudpit','water_hazard'],
      decorations:['dead_tree','lily_pad','gas_vent','moss_covered_rock'],
      ambientLight:{ r:0.6, g:0.8, b:0.5 },
      fogColor:'rgba(30,50,0,0.2)',
      weather:['fog','rain','cloudy'],
      musicMood:'tense',
      windRange:[-1,2],
      particleEmitters:['swamp_gas','mist_ground'],
      // --- additive visual palette (murky bog with algae sheen) ---
      groundShadow:'#0a1404', groundHighlight:'#3a5518', groundDetail:'#1e320c',
      glowColor:'rgba(120,180,60,0.14)', rimLight:'#7fa03a',
      textureBands:['#122006','#1a2a0a','#243a10'], sunTint:'#8faa5a',
    },
  };

  function get(name)    { return BIOMES[name] || BIOMES.savanna; }
  function list()       { return Object.keys(BIOMES); }
  function random()     { const k=list(); return BIOMES[k[Math.floor(Math.random()*k.length)]]; }
  function getGravity(name) { return (BIOMES[name]||{}).gravity || 9.81; }
  function getFriction(name){ return (BIOMES[name]||{}).friction || 0.8; }
  function getWeather(name) { return (BIOMES[name]||{}).weather || ['clear']; }

  function blendAmbient(nameA, nameB, t) {
    const a = BIOMES[nameA]?.ambientLight || {r:1,g:1,b:1};
    const b = BIOMES[nameB]?.ambientLight || {r:1,g:1,b:1};
    return {
      r: a.r+(b.r-a.r)*t,
      g: a.g+(b.g-a.g)*t,
      b: a.b+(b.b-a.b)*t,
    };
  }

  // Returns a ready-to-use ground palette for layered terrain rendering.
  // Falls back gracefully so callers can always destructure safely.
  function getPalette(name) {
    const b = BIOMES[name] || BIOMES.savanna;
    return {
      base:      b.groundColor,
      shadow:    b.groundShadow   || b.groundColor,
      highlight: b.groundHighlight || b.accentColor,
      detail:    b.groundDetail   || b.groundColor,
      accent:    b.accentColor,
      glow:      b.glowColor      || 'rgba(255,255,255,0)',
      rim:       b.rimLight       || b.accentColor,
      bands:     b.textureBands   || [b.groundColor],
      sun:       b.sunTint        || '#ffffff',
      sky:       b.skyGradient,
      fog:       b.fogColor,
    };
  }

  return { BIOMES, get, list, random, getGravity, getFriction, getWeather, blendAmbient, getPalette };
})();
if (typeof window !== "undefined") { window.TERRAIN_EXTRA_BIOMES_V2 = TERRAIN_EXTRA_BIOMES_V2; }
if (typeof module !== "undefined") { module.exports = Object.assign(module.exports||{}, { TERRAIN_EXTRA_BIOMES_V2 }); }

// ================================================================
// TERRAIN_EXTRA_DECOR_CATALOG — Extended decoration item definitions
// ================================================================
const TERRAIN_EXTRA_DECOR_CATALOG = (() => {
  const ITEMS = [
    // Trees
    { id:'pine',         w:40, h:80, anchorY:1.0, zLayer:1, parallax:0.95, castsShadow:true, biomes:['forest','arctic'] },
    { id:'palm',         w:30, h:90, anchorY:1.0, zLayer:1, parallax:0.95, castsShadow:true, biomes:['desert','jungle','savanna'] },
    { id:'dead_tree',    w:35, h:70, anchorY:1.0, zLayer:1, parallax:0.95, castsShadow:true, biomes:['swamp','volcanic'] },
    { id:'oak',          w:60, h:70, anchorY:1.0, zLayer:1, parallax:0.95, castsShadow:true, biomes:['forest'] },
    { id:'acacia',       w:80, h:60, anchorY:1.0, zLayer:1, parallax:0.95, castsShadow:true, biomes:['savanna'] },
    // Rocks
    { id:'boulder_lg',   w:60, h:40, anchorY:1.0, zLayer:2, parallax:1.0,  castsShadow:true, biomes:['all'] },
    { id:'boulder_sm',   w:30, h:20, anchorY:1.0, zLayer:2, parallax:1.0,  castsShadow:false,biomes:['all'] },
    { id:'rock_cluster', w:80, h:35, anchorY:1.0, zLayer:2, parallax:1.0,  castsShadow:true, biomes:['all'] },
    { id:'obsidian',     w:25, h:50, anchorY:1.0, zLayer:2, parallax:1.0,  castsShadow:true, biomes:['volcanic'] },
    { id:'ice_spike',    w:18, h:60, anchorY:1.0, zLayer:2, parallax:1.0,  castsShadow:true, biomes:['arctic'] },
    // Background
    { id:'mountain_bg',  w:300,h:200,anchorY:1.0, zLayer:0, parallax:0.3,  castsShadow:false,biomes:['all'] },
    { id:'cloud',        w:200,h:60, anchorY:0,   zLayer:-1,parallax:0.1,  castsShadow:false,biomes:['all'] },
    { id:'moon',         w:80, h:80, anchorY:0,   zLayer:-2,parallax:0.0,  castsShadow:false,biomes:['all'] },
    // Props
    { id:'fuel_barrel',  w:24, h:32, anchorY:1.0, zLayer:2, parallax:1.0,  collectible:'fuel',  amount:20,  biomes:['all'] },
    { id:'coin_pile',    w:20, h:14, anchorY:1.0, zLayer:2, parallax:1.0,  collectible:'coins', amount:50,  biomes:['all'] },
    { id:'gem_gem',      w:18, h:22, anchorY:1.0, zLayer:2, parallax:1.0,  collectible:'gem',   amount:1,   biomes:['all'] },
    { id:'boost_pad',    w:50, h:10, anchorY:1.0, zLayer:2, parallax:1.0,  interactive:'boost', power:600,  biomes:['all'] },
    { id:'ramp_sm',      w:80, h:20, anchorY:1.0, zLayer:2, parallax:1.0,  interactive:'ramp',  angle:20,   biomes:['all'] },
    { id:'ramp_lg',      w:150,h:40, anchorY:1.0, zLayer:2, parallax:1.0,  interactive:'ramp',  angle:35,   biomes:['all'] },
    { id:'finish_flag',  w:10, h:80, anchorY:1.0, zLayer:2, parallax:1.0,  interactive:'finish',            biomes:['all'] },
    { id:'checkpoint',   w:8,  h:90, anchorY:1.0, zLayer:2, parallax:1.0,  interactive:'checkpoint',        biomes:['all'] },
    // Vegetation
    { id:'grass_patch',  w:40, h:12, anchorY:1.0, zLayer:1, parallax:0.98, castsShadow:false,biomes:['forest','savanna'] },
    { id:'cactus',       w:20, h:45, anchorY:1.0, zLayer:1, parallax:0.98, castsShadow:true, biomes:['desert'] },
    { id:'fern',         w:30, h:20, anchorY:1.0, zLayer:1, parallax:0.98, castsShadow:false,biomes:['jungle','forest'] },
    { id:'coral',        w:25, h:30, anchorY:1.0, zLayer:1, parallax:0.98, castsShadow:false,biomes:['underwater'] },
    { id:'kelp',         w:15, h:80, anchorY:1.0, zLayer:1, parallax:0.95, castsShadow:false,biomes:['underwater'] },
  ];

  // --- additive per-item render palettes (fill / shade / light / detail) ---
  // Purely visual: consumed by decoration draw routines. Missing ids fall back.
  const PALETTES = {
    pine:        { fill:'#1f4d1a', shade:'#123010', light:'#3a7a30', detail:'#5b3a1c' },
    palm:        { fill:'#2e6b1e', shade:'#1a4010', light:'#5aa83a', detail:'#8a5a24' },
    dead_tree:   { fill:'#4a3520', shade:'#2c2012', light:'#6e5233', detail:'#1a120a' },
    oak:         { fill:'#2a5a22', shade:'#173812', light:'#4c8a3a', detail:'#6b4a28' },
    acacia:      { fill:'#3a6a26', shade:'#254514', light:'#6aa040', detail:'#7a5a2c' },
    boulder_lg:  { fill:'#6b6b70', shade:'#3e3e44', light:'#9a9aa0', detail:'#2a2a30' },
    boulder_sm:  { fill:'#70707a', shade:'#454550', light:'#a0a0aa', detail:'#2e2e38' },
    rock_cluster:{ fill:'#66666c', shade:'#3a3a40', light:'#94949a', detail:'#28282e' },
    obsidian:    { fill:'#181420', shade:'#0a0810', light:'#4a3a66', detail:'#000000' },
    ice_spike:   { fill:'#bfe4f5', shade:'#7fb4d8', light:'#ffffff', detail:'#5a90c0' },
    mountain_bg: { fill:'#4a5a72', shade:'#2e3a4c', light:'#7a8aa2', detail:'#e8f0ff' },
    cloud:       { fill:'#eef2f8', shade:'#c4ccd8', light:'#ffffff', detail:'#dfe6f0' },
    moon:        { fill:'#f4f0d8', shade:'#c8c2a0', light:'#ffffff', detail:'#d8d2b0' },
    fuel_barrel: { fill:'#c22020', shade:'#7a1010', light:'#f05050', detail:'#f0d040' },
    coin_pile:   { fill:'#f0c020', shade:'#b08010', light:'#fff080', detail:'#8a5c08' },
    gem_gem:     { fill:'#30d0e0', shade:'#1888a0', light:'#a0f8ff', detail:'#ffffff' },
    boost_pad:   { fill:'#20a0f0', shade:'#1060a0', light:'#80e0ff', detail:'#ffffff' },
    ramp_sm:     { fill:'#8a6a3a', shade:'#5a4424', light:'#b89058', detail:'#3a2c16' },
    ramp_lg:     { fill:'#8a6a3a', shade:'#5a4424', light:'#b89058', detail:'#3a2c16' },
    finish_flag: { fill:'#ffffff', shade:'#b0b0b0', light:'#ffffff', detail:'#111111' },
    checkpoint:  { fill:'#30d060', shade:'#1a8a3a', light:'#80ffb0', detail:'#ffffff' },
    grass_patch: { fill:'#3a7a2a', shade:'#245018', light:'#5aa83a', detail:'#7ac04a' },
    cactus:      { fill:'#2e7a3a', shade:'#1a4c22', light:'#5aa860', detail:'#d8e0a0' },
    fern:        { fill:'#2a6a2a', shade:'#184018', light:'#4c9a4c', detail:'#6ac06a' },
    coral:       { fill:'#e0608a', shade:'#a03a5c', light:'#ffa0c0', detail:'#ffd0e0' },
    kelp:        { fill:'#2a7a4a', shade:'#184c2e', light:'#4aaa6e', detail:'#6ac088' },
  };
  const _defaultPalette = { fill:'#888888', shade:'#555555', light:'#bbbbbb', detail:'#333333' };
  for (const item of ITEMS) item.palette = PALETTES[item.id] || _defaultPalette;

  const _byId  = {};
  for (const item of ITEMS) _byId[item.id] = item;

  function get(id)   { return _byId[id]||null; }
  function getPalette(id) { return (PALETTES[id] || _defaultPalette); }
  function getAll()  { return [...ITEMS]; }
  function list()    { return ITEMS.map(i=>i.id); }

  function forBiome(biome) {
    return ITEMS.filter(i=>i.biomes.includes('all')||i.biomes.includes(biome));
  }

  function getCollectibles() {
    return ITEMS.filter(i=>i.collectible);
  }

  function getInteractives() {
    return ITEMS.filter(i=>i.interactive);
  }

  function getByLayer(z) {
    return ITEMS.filter(i=>i.zLayer===z);
  }

  function random(biome) {
    const pool = forBiome(biome||'all').filter(i=>i.zLayer>=1); // skip far BG
    return pool[Math.floor(Math.random()*pool.length)]||ITEMS[0];
  }

  return { get, getPalette, getAll, list, forBiome, getCollectibles, getInteractives, getByLayer, random, ITEMS };
})();
if (typeof window !== "undefined") { window.TERRAIN_EXTRA_DECOR_CATALOG = TERRAIN_EXTRA_DECOR_CATALOG; }
if (typeof module !== "undefined") { module.exports = Object.assign(module.exports||{}, { TERRAIN_EXTRA_DECOR_CATALOG }); }
