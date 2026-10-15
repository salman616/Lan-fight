import { NetworkPlayer } from '../server/gameServer';
import { MapData, WEAPONS, WeaponKey } from '../types/game';

export interface BotController {
  player: NetworkPlayer;
  targetId: string | null;
  targetX: number;
  targetY: number;
  aimAngle: number;
  fireCooldown: number;
  grenadeCooldown: number;
  jumpCooldown: number;
  changeDirectionTimer: number;
  preferredDirection: number; // -1 or 1
  skill: number; // 0.6 to 0.95
}

export function createBot(id: string, name: string, color: string, x: number, y: number, skill = 0.8): BotController {
  return {
    player: {
      id,
      name,
      color,
      avatarIndex: Math.floor(Math.random() * 4),
      x,
      y,
      vx: 0,
      vy: 0,
      angle: 0,
      health: 100,
      maxHealth: 100,
      boost: 100,
      maxBoost: 100,
      isBoosting: false,
      isCrouching: false,
      weapon: 'M4_RIFLE',
      ammo: 30,
      kills: 0,
      deaths: 0,
      ping: 5,
      isBot: true,
    },
    targetId: null,
    targetX: x,
    targetY: y,
    aimAngle: 0,
    fireCooldown: 0,
    grenadeCooldown: Math.random() * 3000 + 2000,
    jumpCooldown: 0,
    changeDirectionTimer: 0,
    preferredDirection: Math.random() > 0.5 ? 1 : -1,
    skill,
  };
}

export function updateBotAI(
  bot: BotController,
  allPlayers: NetworkPlayer[],
  map: MapData,
  delta: number,
  onShoot: (b: NetworkPlayer, angle: number) => void,
  onThrowGrenade: (b: NetworkPlayer, angle: number) => void
) {
  const p = bot.player;
  if (p.health <= 0) return;

  // 1. Find nearest enemy
  let nearestEnemy: NetworkPlayer | null = null;
  let minDist = Infinity;

  for (const pl of allPlayers) {
    if (pl.id === p.id || pl.health <= 0) continue;
    const dx = pl.x - p.x;
    const dy = pl.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < minDist) {
      minDist = dist;
      nearestEnemy = pl;
    }
  }

  // 2. Navigation & Movement
  bot.changeDirectionTimer -= delta;
  if (bot.changeDirectionTimer <= 0) {
    bot.changeDirectionTimer = 1500 + Math.random() * 2000;
    if (Math.random() > 0.4) {
      bot.preferredDirection = bot.preferredDirection * -1;
    }
  }

  // Check if low health -> seek medkit
  let targetX = p.x;
  let targetY = p.y;

  if (p.health < 40) {
    let nearestMed = map.pickups.find(pk => pk.type === 'health' && pk.active);
    if (nearestMed) {
      targetX = nearestMed.x;
      targetY = nearestMed.y;
    }
  } else if (nearestEnemy) {
    targetX = nearestEnemy.x;
    targetY = nearestEnemy.y;
  }

  const dx = targetX - p.x;
  const dy = targetY - p.y;
  const distToTarget = Math.hypot(dx, dy);

  // Horizontal movement
  const moveSpeed = 5.5;
  if (Math.abs(dx) > 60) {
    p.vx = (dx > 0 ? 1 : -1) * moveSpeed;
  } else {
    p.vx = bot.preferredDirection * moveSpeed * 0.5;
  }

  // Jetpack Vertical Logic
  // If target is above bot or bot is stuck / wants to fly
  const wantsToFly = (dy < -40 && p.boost > 15) || (Math.random() < 0.05 && p.boost > 40);

  if (wantsToFly) {
    p.isBoosting = true;
    p.vy -= 0.85;
    if (p.vy < -7) p.vy = -7;
    p.boost = Math.max(0, p.boost - 0.7);
  } else {
    p.isBoosting = false;
    // Recharge boost when not boosting
    p.boost = Math.min(p.maxBoost, p.boost + 0.4);
  }

  // 3. Aiming & Combat
  if (nearestEnemy && minDist < 900) {
    // Predict lead
    const leadFactor = (1 - bot.skill) * 0.5;
    const aimX = nearestEnemy.x + nearestEnemy.vx * leadFactor * 5;
    const aimY = nearestEnemy.y + nearestEnemy.vy * leadFactor * 5;

    const rawAngle = Math.atan2(aimY - p.y, aimX - p.x);
    // Smooth aim towards target
    bot.aimAngle = rawAngle;
    p.angle = rawAngle;

    // Fire weapon
    bot.fireCooldown -= delta;
    if (bot.fireCooldown <= 0 && p.ammo > 0) {
      const weaponDef = WEAPONS[p.weapon as WeaponKey] || WEAPONS.M4_RIFLE;
      onShoot(p, bot.aimAngle);
      bot.fireCooldown = weaponDef.fireRate * (1 + (1 - bot.skill) * 0.4);
      p.ammo -= 1;

      if (p.ammo <= 0) {
        // Auto reload
        setTimeout(() => {
          p.ammo = weaponDef.maxAmmo;
        }, weaponDef.reloadTime);
      }
    }

    // Grenade throw
    bot.grenadeCooldown -= delta;
    if (bot.grenadeCooldown <= 0 && minDist > 180 && minDist < 550) {
      bot.grenadeCooldown = 5000 + Math.random() * 4000;
      onThrowGrenade(p, bot.aimAngle);
    }
  }

  // Gravity
  p.vy += 0.45;
  if (p.vy > 12) p.vy = 12;

  // Simple floor and platform collisions for bot
  p.x += p.vx;
  p.y += p.vy;

  for (const plat of map.platforms) {
    if (
      p.x + 18 > plat.x &&
      p.x - 18 < plat.x + plat.w &&
      p.y + 26 >= plat.y &&
      p.y - 20 <= plat.y + plat.h
    ) {
      if (plat.oneWay) {
        if (p.vy > 0 && p.y + 20 < plat.y + 16) {
          p.y = plat.y - 24;
          p.vy = 0;
        }
      } else {
        if (p.vy > 0 && p.y < plat.y + 10) {
          p.y = plat.y - 24;
          p.vy = 0;
        } else if (p.vy < 0 && p.y > plat.y + plat.h - 10) {
          p.y = plat.y + plat.h + 24;
          p.vy = 0;
        }
      }
    }
  }

  // Clamp within map bounds
  p.x = Math.max(50, Math.min(map.width - 50, p.x));
  p.y = Math.max(50, Math.min(map.height - 70, p.y));
}
