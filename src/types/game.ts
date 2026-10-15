export type WeaponKey = 'M4_RIFLE' | 'SNIPER' | 'SHOTGUN' | 'RPG' | 'MELEE';

export interface WeaponDef {
  key: WeaponKey;
  name: string;
  damage: number;
  fireRate: number; // ms between shots
  bulletSpeed: number;
  spread: number;
  pellets: number;
  maxAmmo: number;
  reloadTime: number; // ms
  color: string;
  bulletColor: string;
  bulletRadius: number;
  isExplosive?: boolean;
  blastRadius?: number;
  laserSight?: boolean;
}

export const WEAPONS: Record<WeaponKey, WeaponDef> = {
  M4_RIFLE: {
    key: 'M4_RIFLE',
    name: 'M4 Combat Rifle',
    damage: 18,
    fireRate: 110,
    bulletSpeed: 20,
    spread: 0.04,
    pellets: 1,
    maxAmmo: 30,
    reloadTime: 1600,
    color: '#38bdf8',
    bulletColor: '#fef08a',
    bulletRadius: 3,
  },
  SNIPER: {
    key: 'SNIPER',
    name: 'Laser 50cal Sniper',
    damage: 85,
    fireRate: 950,
    bulletSpeed: 34,
    spread: 0.005,
    pellets: 1,
    maxAmmo: 5,
    reloadTime: 2400,
    color: '#ec4899',
    bulletColor: '#f43f5e',
    bulletRadius: 4,
    laserSight: true,
  },
  SHOTGUN: {
    key: 'SHOTGUN',
    name: 'Pump Shotgun',
    damage: 14, // per pellet
    fireRate: 650,
    bulletSpeed: 17,
    spread: 0.22,
    pellets: 6,
    maxAmmo: 8,
    reloadTime: 2000,
    color: '#f97316',
    bulletColor: '#fdba74',
    bulletRadius: 3.5,
  },
  RPG: {
    key: 'RPG',
    name: 'Rocket Launcher',
    damage: 95,
    fireRate: 1200,
    bulletSpeed: 12,
    spread: 0.02,
    pellets: 1,
    maxAmmo: 3,
    reloadTime: 2800,
    color: '#eab308',
    bulletColor: '#ef4444',
    bulletRadius: 6,
    isExplosive: true,
    blastRadius: 110,
  },
  MELEE: {
    key: 'MELEE',
    name: 'Combat Knife',
    damage: 50,
    fireRate: 400,
    bulletSpeed: 0,
    spread: 0,
    pellets: 0,
    maxAmmo: 999,
    reloadTime: 0,
    color: '#94a3b8',
    bulletColor: '#ffffff',
    bulletRadius: 0,
  },
};

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  oneWay?: boolean;
  color?: string;
  theme?: 'rock' | 'metal' | 'wood' | 'bunker';
}

export interface Barrel {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  health: number;
  maxHealth: number;
  isExploded: boolean;
}

export interface PickupItem {
  id: string;
  type: 'health' | 'boost' | 'ammo' | 'weapon';
  weaponKey?: WeaponKey;
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  respawnTimer: number;
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  spawnPoints: Array<{ x: number; y: number }>;
  platforms: Platform[];
  barrels: Barrel[];
  pickups: PickupItem[];
  backgroundColor: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity?: number;
}

export interface DamageNumber {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface KillFeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  time: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  showTouchControls: boolean;
  bloodEffects: boolean;
  screenShake: boolean;
}
