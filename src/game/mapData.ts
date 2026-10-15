import { MapData } from '../types/game';

export const MAPS: Record<string, MapData> = {
  outpost: {
    id: 'outpost',
    name: 'Outpost Bunker',
    width: 2400,
    height: 1400,
    backgroundColor: '#0f172a',
    spawnPoints: [
      { x: 300, y: 350 },
      { x: 750, y: 250 },
      { x: 1200, y: 550 },
      { x: 1650, y: 350 },
      { x: 2100, y: 400 },
      { x: 450, y: 950 },
      { x: 1950, y: 950 },
      { x: 1200, y: 1050 },
    ],
    platforms: [
      // Outer boundaries
      { x: 0, y: 1350, w: 2400, h: 50, theme: 'rock', color: '#1e293b' }, // Ground floor
      { x: 0, y: 0, w: 2400, h: 40, theme: 'rock', color: '#1e293b' }, // Ceiling
      { x: 0, y: 0, w: 40, h: 1400, theme: 'rock', color: '#1e293b' }, // Left wall
      { x: 2360, y: 0, w: 40, h: 1400, theme: 'rock', color: '#1e293b' }, // Right wall

      // Central Command Bunker (multi-story structure)
      { x: 900, y: 650, w: 600, h: 30, theme: 'bunker', color: '#334155' }, // Bunker roof
      { x: 880, y: 650, w: 30, h: 350, theme: 'bunker', color: '#334155' }, // Left bunker wall
      { x: 1490, y: 650, w: 30, h: 350, theme: 'bunker', color: '#334155' }, // Right bunker wall
      { x: 910, y: 820, w: 260, h: 20, oneWay: true, theme: 'metal', color: '#475569' }, // Bunker mezzanine L
      { x: 1230, y: 820, w: 260, h: 20, oneWay: true, theme: 'metal', color: '#475569' }, // Bunker mezzanine R
      { x: 880, y: 1000, w: 640, h: 30, theme: 'bunker', color: '#334155' }, // Bunker foundation

      // Elevated Left Sniper Tower & Floating Islands
      { x: 180, y: 450, w: 280, h: 25, oneWay: true, theme: 'metal', color: '#475569' },
      { x: 140, y: 720, w: 320, h: 30, theme: 'rock', color: '#334155' },
      { x: 520, y: 350, w: 240, h: 25, oneWay: true, theme: 'wood', color: '#64748b' },
      { x: 500, y: 850, w: 260, h: 25, oneWay: true, theme: 'metal', color: '#475569' },

      // Elevated Right Sniper Tower & Floating Islands
      { x: 1940, y: 450, w: 280, h: 25, oneWay: true, theme: 'metal', color: '#475569' },
      { x: 1940, y: 720, w: 320, h: 30, theme: 'rock', color: '#334155' },
      { x: 1640, y: 350, w: 240, h: 25, oneWay: true, theme: 'wood', color: '#64748b' },
      { x: 1640, y: 850, w: 260, h: 25, oneWay: true, theme: 'metal', color: '#475569' },

      // Sky High Bridge
      { x: 950, y: 300, w: 500, h: 25, oneWay: true, theme: 'metal', color: '#475569' },

      // Underground Tunnel Obstacles & Trenches
      { x: 300, y: 1150, w: 400, h: 25, oneWay: true, theme: 'wood', color: '#64748b' },
      { x: 1700, y: 1150, w: 400, h: 25, oneWay: true, theme: 'wood', color: '#64748b' },
      { x: 1050, y: 1200, w: 300, h: 25, oneWay: true, theme: 'metal', color: '#475569' },
    ],
    barrels: [
      { id: 'b1', x: 250, y: 680, w: 32, h: 42, health: 30, maxHealth: 30, isExploded: false },
      { id: 'b2', x: 1020, y: 610, w: 32, h: 42, health: 30, maxHealth: 30, isExploded: false },
      { id: 'b3', x: 1350, y: 610, w: 32, h: 42, health: 30, maxHealth: 30, isExploded: false },
      { id: 'b4', x: 2100, y: 680, w: 32, h: 42, health: 30, maxHealth: 30, isExploded: false },
      { id: 'b5', x: 1180, y: 1160, w: 32, h: 42, health: 30, maxHealth: 30, isExploded: false },
      { id: 'b6', x: 550, y: 1310, w: 32, h: 42, health: 30, maxHealth: 30, isExploded: false },
      { id: 'b7', x: 1850, y: 1310, w: 32, h: 42, health: 30, maxHealth: 30, isExploded: false },
    ],
    pickups: [
      // High perches = Snipers & RPG
      { id: 'p_snip1', type: 'weapon', weaponKey: 'SNIPER', x: 2050, y: 410, w: 36, h: 36, active: true, respawnTimer: 0 },
      { id: 'p_snip2', type: 'weapon', weaponKey: 'SNIPER', x: 300, y: 410, w: 36, h: 36, active: true, respawnTimer: 0 },
      { id: 'p_rpg1', type: 'weapon', weaponKey: 'RPG', x: 1200, y: 260, w: 36, h: 36, active: true, respawnTimer: 0 },
      { id: 'p_shot1', type: 'weapon', weaponKey: 'SHOTGUN', x: 1200, y: 610, w: 36, h: 36, active: true, respawnTimer: 0 },
      { id: 'p_shot2', type: 'weapon', weaponKey: 'SHOTGUN', x: 1200, y: 960, w: 36, h: 36, active: true, respawnTimer: 0 },

      // Health kits in strategic locations
      { id: 'p_med1', type: 'health', x: 620, y: 310, w: 32, h: 32, active: true, respawnTimer: 0 },
      { id: 'p_med2', type: 'health', x: 1750, y: 310, w: 32, h: 32, active: true, respawnTimer: 0 },
      { id: 'p_med3', type: 'health', x: 1200, y: 780, w: 32, h: 32, active: true, respawnTimer: 0 },
      { id: 'p_med4', type: 'health', x: 500, y: 1310, w: 32, h: 32, active: true, respawnTimer: 0 },

      // Jetpack fuel boost cells
      { id: 'p_boost1', type: 'boost', x: 350, y: 680, w: 32, h: 32, active: true, respawnTimer: 0 },
      { id: 'p_boost2', type: 'boost', x: 2020, y: 680, w: 32, h: 32, active: true, respawnTimer: 0 },
      { id: 'p_boost3', type: 'boost', x: 1200, y: 1310, w: 32, h: 32, active: true, respawnTimer: 0 },

      // Ammo boxes
      { id: 'p_ammo1', type: 'ammo', x: 600, y: 810, w: 32, h: 32, active: true, respawnTimer: 0 },
      { id: 'p_ammo2', type: 'ammo', x: 1780, y: 810, w: 32, h: 32, active: true, respawnTimer: 0 },
    ],
  },
  skybase: {
    id: 'skybase',
    name: 'Floating High Arena',
    width: 2200,
    height: 1300,
    backgroundColor: '#090d16',
    spawnPoints: [
      { x: 300, y: 400 },
      { x: 1100, y: 300 },
      { x: 1900, y: 400 },
      { x: 600, y: 800 },
      { x: 1600, y: 800 },
    ],
    platforms: [
      { x: 0, y: 1260, w: 2200, h: 40, theme: 'metal', color: '#1e293b' },
      { x: 0, y: 0, w: 2200, h: 30, theme: 'metal', color: '#1e293b' },
      { x: 0, y: 0, w: 30, h: 1300, theme: 'metal', color: '#1e293b' },
      { x: 2170, y: 0, w: 30, h: 1300, theme: 'metal', color: '#1e293b' },

      // Floating Platforms
      { x: 300, y: 550, w: 450, h: 25, oneWay: true, theme: 'rock', color: '#334155' },
      { x: 1450, y: 550, w: 450, h: 25, oneWay: true, theme: 'rock', color: '#334155' },
      { x: 800, y: 400, w: 600, h: 30, theme: 'metal', color: '#475569' },
      { x: 700, y: 750, w: 800, h: 30, theme: 'metal', color: '#475569' },
      { x: 450, y: 950, w: 400, h: 25, oneWay: true, theme: 'metal', color: '#334155' },
      { x: 1350, y: 950, w: 400, h: 25, oneWay: true, theme: 'metal', color: '#334155' },
    ],
    barrels: [
      { id: 'sb1', x: 850, y: 360, w: 32, h: 42, health: 30, maxHealth: 30, isExploded: false },
      { id: 'sb2', x: 1300, y: 360, w: 32, h: 42, health: 30, maxHealth: 30, isExploded: false },
      { id: 'sb3', x: 1100, y: 710, w: 32, h: 42, health: 30, maxHealth: 30, isExploded: false },
    ],
    pickups: [
      { id: 'sb_rpg', type: 'weapon', weaponKey: 'RPG', x: 1100, y: 360, w: 36, h: 36, active: true, respawnTimer: 0 },
      { id: 'sb_snip', type: 'weapon', weaponKey: 'SNIPER', x: 1100, y: 710, w: 36, h: 36, active: true, respawnTimer: 0 },
      { id: 'sb_med1', type: 'health', x: 450, y: 510, w: 32, h: 32, active: true, respawnTimer: 0 },
      { id: 'sb_med2', type: 'health', x: 1700, y: 510, w: 32, h: 32, active: true, respawnTimer: 0 },
      { id: 'sb_boost1', type: 'boost', x: 600, y: 910, w: 32, h: 32, active: true, respawnTimer: 0 },
      { id: 'sb_boost2', type: 'boost', x: 1550, y: 910, w: 32, h: 32, active: true, respawnTimer: 0 },
    ],
  },
};
