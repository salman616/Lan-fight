import { sound } from '../utils/audio';
import {
  Barrel,
  DamageNumber,
  KillFeedEntry,
  MapData,
  Particle,
  PickupItem,
  WEAPONS,
  WeaponKey,
} from '../types/game';
import { BulletData, GrenadeData, NetworkPlayer } from '../server/gameServer';

export interface LocalPlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  health: number;
  maxHealth: number;
  boost: number;
  maxBoost: number;
  isBoosting: boolean;
  isCrouching: boolean;
  isGrounded: boolean;
  weapon: WeaponKey;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  grenades: number;
  kills: number;
  deaths: number;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public map: MapData;

  public localPlayer: LocalPlayerState;
  public otherPlayers: Record<string, NetworkPlayer> = {};
  public bullets: BulletData[] = [];
  public grenades: GrenadeData[] = [];
  public barrels: Barrel[] = [];
  public pickups: PickupItem[] = [];

  public particles: Particle[] = [];
  public damageNumbers: DamageNumber[] = [];

  public cameraX = 0;
  public cameraY = 0;
  public screenShake = 0;

  // Input states
  public keys: Record<string, boolean> = {};
  public mouseX = 0;
  public mouseY = 0;
  public isMouseDown = false;
  public touchAimAngle: number | null = null;
  public touchIsFiring = false;
  public touchMoveX = 0;
  public touchMoveY = 0;
  public touchIsBoosting = false;
  public touchIsCrouching = false;

  private lastShootTime = 0;
  private animFrameId: number | null = null;
  private lastTimestamp = 0;

  // Event callbacks to network / host
  public onLocalShoot?: (bullet: Partial<BulletData>) => void;
  public onLocalGrenade?: (grenade: Partial<GrenadeData>) => void;
  public onLocalDamageDealt?: (targetId: string, damage: number, weapon: string) => void;
  public onLocalDeath?: (killerId: string, weapon: string) => void;
  public onKillFeedAdd?: (kf: KillFeedEntry) => void;

  constructor(canvas: HTMLCanvasElement, map: MapData, startX = 300, startY = 300) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context not available');
    this.ctx = context;
    this.map = map;

    this.barrels = JSON.parse(JSON.stringify(map.barrels));
    this.pickups = JSON.parse(JSON.stringify(map.pickups));

    this.localPlayer = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      angle: 0,
      health: 100,
      maxHealth: 100,
      boost: 100,
      maxBoost: 100,
      isBoosting: false,
      isCrouching: false,
      isGrounded: false,
      weapon: 'M4_RIFLE',
      ammo: 30,
      maxAmmo: 30,
      isReloading: false,
      reloadProgress: 0,
      grenades: 3,
      kills: 0,
      deaths: 0,
    };

    this.cameraX = startX - canvas.width / 2;
    this.cameraY = startY - canvas.height / 2;
  }

  public start() {
    this.lastTimestamp = performance.now();
    const loop = (timestamp: number) => {
      const delta = Math.min(100, timestamp - this.lastTimestamp);
      this.lastTimestamp = timestamp;

      this.update(delta);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    sound.setJetpack(false);
  }

  // Reload action
  public triggerReload() {
    const p = this.localPlayer;
    const weaponDef = WEAPONS[p.weapon];
    if (p.isReloading || p.ammo === weaponDef.maxAmmo) return;

    p.isReloading = true;
    p.reloadProgress = 0;
    sound.playReload();

    const reloadDuration = weaponDef.reloadTime;
    const interval = 50;
    const step = interval / reloadDuration;

    const timer = setInterval(() => {
      p.reloadProgress += step;
      if (p.reloadProgress >= 1) {
        clearInterval(timer);
        p.ammo = weaponDef.maxAmmo;
        p.isReloading = false;
        p.reloadProgress = 0;
      }
    }, interval);
  }

  // Switch weapon
  public switchWeapon() {
    const p = this.localPlayer;
    const keys: WeaponKey[] = ['M4_RIFLE', 'SNIPER', 'SHOTGUN', 'RPG'];
    const curIdx = keys.indexOf(p.weapon);
    const nextKey = keys[(curIdx + 1) % keys.length];
    p.weapon = nextKey;
    const def = WEAPONS[nextKey];
    p.maxAmmo = def.maxAmmo;
    p.ammo = def.maxAmmo;
    p.isReloading = false;
    sound.playPickup();
  }

  // Throw Grenade
  public throwGrenade() {
    const p = this.localPlayer;
    if (p.grenades <= 0 || p.health <= 0) return;
    p.grenades -= 1;

    const angle = this.touchAimAngle !== null ? this.touchAimAngle : p.angle;
    const throwSpeed = 16;
    const gx = p.x + Math.cos(angle) * 20;
    const gy = p.y + Math.sin(angle) * 20;
    const gvx = Math.cos(angle) * throwSpeed + p.vx * 0.5;
    const gvy = Math.sin(angle) * throwSpeed - 3;

    sound.playGrenadeThrow();

    const newGrenade: GrenadeData = {
      id: 'g_' + Math.random().toString(36).substring(2, 9),
      ownerId: 'local',
      x: gx,
      y: gy,
      vx: gvx,
      vy: gvy,
      fuse: 2200,
      createdAt: Date.now(),
    };

    this.grenades.push(newGrenade);
    this.onLocalGrenade?.(newGrenade);
  }

  // Melee attack
  public triggerMelee() {
    const p = this.localPlayer;
    if (p.health <= 0) return;

    sound.playPunch();
    this.addDamageText('POW!', p.x, p.y - 30, '#f59e0b');

    // Check hit on nearby enemies
    const meleeRadius = 65;
    for (const [id, enemy] of Object.entries(this.otherPlayers)) {
      if (enemy.health <= 0) continue;
      const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (dist <= meleeRadius) {
        this.applyDamageToEnemy(id, 50, 'MELEE');
        this.createBloodSpatter(enemy.x, enemy.y, 8);
        this.screenShake = 6;
      }
    }
  }

  private update(delta: number) {
    const p = this.localPlayer;
    if (p.health <= 0) {
      sound.setJetpack(false);
      return;
    }

    // 1. Aiming angle
    if (this.touchAimAngle !== null) {
      p.angle = this.touchAimAngle;
    } else {
      // Mouse world coordinates
      const worldMouseX = this.mouseX + this.cameraX;
      const worldMouseY = this.mouseY + this.cameraY;
      p.angle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);
    }

    // 2. Movement & Jetpack Input
    const moveLeft = this.keys['KeyA'] || this.keys['ArrowLeft'] || this.touchMoveX < -0.25;
    const moveRight = this.keys['KeyD'] || this.keys['ArrowRight'] || this.touchMoveX > 0.25;
    const flyUp = this.keys['KeyW'] || this.keys['Space'] || this.keys['ArrowUp'] || this.touchIsBoosting;
    const crouchDown = this.keys['KeyS'] || this.keys['ArrowDown'] || this.touchIsCrouching;

    p.isCrouching = crouchDown;

    const speed = p.isCrouching ? 2.5 : 5.5;
    if (moveLeft) p.vx = -speed;
    else if (moveRight) p.vx = speed;
    else p.vx *= 0.8; // horizontal friction

    // Jetpack Booster logic
    if (flyUp && p.boost > 0) {
      p.isBoosting = true;
      p.vy -= 0.95;
      if (p.vy < -8) p.vy = -8;
      p.boost = Math.max(0, p.boost - 0.65);
      sound.setJetpack(true);

      // Jetpack flame particles
      const flameOffset = p.angle > Math.PI / 2 || p.angle < -Math.PI / 2 ? 14 : -14;
      this.particles.push({
        x: p.x + flameOffset + (Math.random() * 4 - 2),
        y: p.y + 12,
        vx: (Math.random() * 2 - 1) * 1.5,
        vy: Math.random() * 4 + 4,
        radius: Math.random() * 4 + 3,
        color: Math.random() > 0.4 ? '#f97316' : '#facc15',
        alpha: 1,
        decay: 0.05,
      });
    } else {
      p.isBoosting = false;
      sound.setJetpack(false);

      // Recharge jetpack boost when grounded or not boosting
      if (p.isGrounded) {
        p.boost = Math.min(p.maxBoost, p.boost + 0.8);
      } else {
        p.boost = Math.min(p.maxBoost, p.boost + 0.3);
      }
    }

    // Gravity
    p.vy += 0.48;
    if (p.vy > 13) p.vy = 13;

    // Kinematics & Platform Collisions
    p.x += p.vx;
    p.y += p.vy;
    p.isGrounded = false;

    for (const plat of this.map.platforms) {
      // Check bounding box
      const halfW = 16;
      const height = p.isCrouching ? 28 : 42;

      if (
        p.x + halfW > plat.x &&
        p.x - halfW < plat.x + plat.w &&
        p.y + height / 2 >= plat.y &&
        p.y - height / 2 <= plat.y + plat.h
      ) {
        if (plat.oneWay) {
          // Drop down through platform if holding crouch
          if (crouchDown) continue;

          // Land on top if falling down
          if (p.vy > 0 && p.y + height / 2 - p.vy <= plat.y + 12) {
            p.y = plat.y - height / 2;
            p.vy = 0;
            p.isGrounded = true;
          }
        } else {
          // Solid obstacle
          if (p.vy > 0 && p.y < plat.y + 10) {
            p.y = plat.y - height / 2;
            p.vy = 0;
            p.isGrounded = true;
          } else if (p.vy < 0 && p.y > plat.y + plat.h - 10) {
            p.y = plat.y + plat.h + height / 2;
            p.vy = 0;
          } else if (p.vx > 0) {
            p.x = plat.x - halfW;
            p.vx = 0;
          } else if (p.vx < 0) {
            p.x = plat.x + plat.w + halfW;
            p.vx = 0;
          }
        }
      }
    }

    // Arena boundary clamp
    p.x = Math.max(30, Math.min(this.map.width - 30, p.x));
    p.y = Math.max(30, Math.min(this.map.height - 50, p.y));

    // 3. Shooting logic
    const isFiring = this.touchIsFiring || this.isMouseDown;
    const now = performance.now();
    const weaponDef = WEAPONS[p.weapon];

    if (isFiring && !p.isReloading && now - this.lastShootTime >= weaponDef.fireRate) {
      if (p.ammo > 0) {
        p.ammo -= 1;
        this.lastShootTime = now;
        sound.playGunshot(p.weapon);

        if (p.weapon === 'SNIPER' || p.weapon === 'RPG') {
          this.screenShake = 7;
        }

        const muzzleX = p.x + Math.cos(p.angle) * 26;
        const muzzleY = p.y + Math.sin(p.angle) * 26;

        // Muzzle flash particle
        this.particles.push({
          x: muzzleX,
          y: muzzleY,
          vx: Math.cos(p.angle) * 2,
          vy: Math.sin(p.angle) * 2,
          radius: 8,
          color: '#fef08a',
          alpha: 1,
          decay: 0.25,
        });

        // Spawn bullets based on pellet count (e.g. 6 for shotgun)
        for (let i = 0; i < weaponDef.pellets; i++) {
          const spreadOffset = (Math.random() - 0.5) * weaponDef.spread * 2;
          const finalAngle = p.angle + spreadOffset;
          const bvx = Math.cos(finalAngle) * weaponDef.bulletSpeed;
          const bvy = Math.sin(finalAngle) * weaponDef.bulletSpeed;

          const bullet: BulletData = {
            id: 'b_' + Math.random().toString(36).substring(2, 9),
            ownerId: 'local',
            weaponType: p.weapon,
            x: muzzleX,
            y: muzzleY,
            vx: bvx,
            vy: bvy,
            damage: weaponDef.damage,
            createdAt: Date.now(),
            life: 1400,
          };

          this.bullets.push(bullet);
          this.onLocalShoot?.(bullet);
        }

        if (p.ammo <= 0) {
          this.triggerReload();
        }
      } else {
        this.triggerReload();
      }
    }

    // 4. Update Bullets
    this.updateBullets();

    // 5. Update Grenades
    this.updateGrenades();

    // 6. Check Pickups
    this.updatePickups();

    // 7. Update Particles & Damage Numbers
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      if (pt.gravity) pt.vy += pt.gravity;
      pt.alpha -= pt.decay;
      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.y -= 1;
      dn.life -= 16;
      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }

    // 8. Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake *= 0.88;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    // 9. Camera smooth follow
    const targetCamX = p.x - this.canvas.width / 2;
    const targetCamY = p.y - this.canvas.height / 2;
    this.cameraX += (targetCamX - this.cameraX) * 0.12;
    this.cameraY += (targetCamY - this.cameraY) * 0.12;

    // Clamp camera within map bounds
    this.cameraX = Math.max(0, Math.min(this.map.width - this.canvas.width, this.cameraX));
    this.cameraY = Math.max(0, Math.min(this.map.height - this.canvas.height, this.cameraY));
  }

  private updateBullets() {
    const now = Date.now();
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Rocket launcher smoke trail
      if (b.weaponType === 'RPG') {
        this.particles.push({
          x: b.x,
          y: b.y,
          vx: -b.vx * 0.1 + (Math.random() - 0.5),
          vy: -b.vy * 0.1 + (Math.random() - 0.5),
          radius: Math.random() * 3 + 2,
          color: '#cbd5e1',
          alpha: 0.8,
          decay: 0.05,
        });
      }

      // Check collision with platforms
      let hitPlatform = false;
      for (const plat of this.map.platforms) {
        if (
          !plat.oneWay &&
          b.x >= plat.x &&
          b.x <= plat.x + plat.w &&
          b.y >= plat.y &&
          b.y <= plat.y + plat.h
        ) {
          hitPlatform = true;
          break;
        }
      }

      // Check collision with explosive barrels
      for (const barrel of this.barrels) {
        if (!barrel.isExploded && b.x >= barrel.x && b.x <= barrel.x + barrel.w && b.y >= barrel.y && b.y <= barrel.y + barrel.h) {
          barrel.health -= b.damage;
          this.createSparks(b.x, b.y);
          if (barrel.health <= 0) {
            this.explodeBarrel(barrel);
          }
          hitPlatform = true;
          break;
        }
      }

      // Check collision with other players (if shot by local player)
      if (b.ownerId === 'local' && !hitPlatform) {
        for (const [enemyId, enemy] of Object.entries(this.otherPlayers)) {
          if (enemy.health <= 0) continue;
          if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < 24) {
            hitPlatform = true;
            this.applyDamageToEnemy(enemyId, b.damage, b.weaponType);
            this.createBloodSpatter(b.x, b.y, 6);
            break;
          }
        }
      }

      // If hit or expired
      if (hitPlatform || now - b.createdAt > b.life) {
        if (b.weaponType === 'RPG') {
          this.createExplosion(b.x, b.y, 110, 95, b.ownerId);
        } else {
          this.createSparks(b.x, b.y);
        }
        this.bullets.splice(i, 1);
      }
    }
  }

  private updateGrenades() {
    const now = Date.now();
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.vy += 0.35; // gravity
      g.x += g.vx;
      g.y += g.vy;

      // Bounce off platforms
      for (const plat of this.map.platforms) {
        if (
          g.x + 8 > plat.x &&
          g.x - 8 < plat.x + plat.w &&
          g.y + 8 > plat.y &&
          g.y - 8 < plat.y + plat.h
        ) {
          g.vy = -g.vy * 0.65;
          g.vx *= 0.75;
          sound.playGrenadeBounce();
          break;
        }
      }

      // Fuse detonation
      if (now - g.createdAt >= g.fuse) {
        this.createExplosion(g.x, g.y, 130, 90, g.ownerId);
        this.grenades.splice(i, 1);
      }
    }
  }

  private updatePickups() {
    const p = this.localPlayer;
    if (p.health <= 0) return;

    for (const pk of this.pickups) {
      if (!pk.active) {
        pk.respawnTimer -= 16;
        if (pk.respawnTimer <= 0) {
          pk.active = true;
        }
        continue;
      }

      const dist = Math.hypot(p.x - pk.x, p.y - pk.y);
      if (dist < 32) {
        let picked = false;

        if (pk.type === 'health' && p.health < p.maxHealth) {
          p.health = Math.min(p.maxHealth, p.health + 45);
          this.addDamageText('+45 HP', p.x, p.y - 30, '#10b981');
          picked = true;
        } else if (pk.type === 'boost') {
          p.boost = p.maxBoost;
          this.addDamageText('+FUEL', p.x, p.y - 30, '#f59e0b');
          picked = true;
        } else if (pk.type === 'ammo') {
          const wDef = WEAPONS[p.weapon];
          p.ammo = wDef.maxAmmo;
          p.grenades = Math.min(5, p.grenades + 2);
          this.addDamageText('+AMMO', p.x, p.y - 30, '#38bdf8');
          picked = true;
        } else if (pk.type === 'weapon' && pk.weaponKey) {
          p.weapon = pk.weaponKey;
          const wDef = WEAPONS[pk.weaponKey];
          p.maxAmmo = wDef.maxAmmo;
          p.ammo = wDef.maxAmmo;
          this.addDamageText(wDef.name.toUpperCase(), p.x, p.y - 30, '#ec4899');
          picked = true;
        }

        if (picked) {
          pk.active = false;
          pk.respawnTimer = 14000;
          sound.playPickup();
        }
      }
    }
  }

  public createExplosion(x: number, y: number, radius: number, damage: number, attackerId = 'local') {
    sound.playExplosion();
    this.screenShake = 14;

    // Shockwave particles
    for (let i = 0; i < 28; i++) {
      const angle = (Math.PI * 2 * i) / 28;
      const speed = Math.random() * 8 + 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 8 + 4,
        color: Math.random() > 0.4 ? '#f97316' : '#ef4444',
        alpha: 1,
        decay: 0.035,
      });
    }

    // Damage local player if in blast radius
    const distToLocal = Math.hypot(this.localPlayer.x - x, this.localPlayer.y - y);
    if (distToLocal < radius) {
      const falloff = 1 - distToLocal / radius;
      const finalDmg = Math.round(damage * falloff);
      this.takeLocalDamage(finalDmg, 'EXPLOSION', attackerId);
    }

    // Damage other players if attacker is local
    if (attackerId === 'local') {
      for (const [id, pl] of Object.entries(this.otherPlayers)) {
        if (pl.health <= 0) continue;
        const d = Math.hypot(pl.x - x, pl.y - y);
        if (d < radius) {
          const falloff = 1 - d / radius;
          const dmg = Math.round(damage * falloff);
          this.applyDamageToEnemy(id, dmg, 'EXPLOSION');
        }
      }
    }
  }

  private explodeBarrel(barrel: Barrel) {
    barrel.isExploded = true;
    this.createExplosion(barrel.x + barrel.w / 2, barrel.y + barrel.h / 2, 140, 95, 'barrel');
  }

  public takeLocalDamage(dmg: number, weapon: string, attackerId: string) {
    const p = this.localPlayer;
    if (p.health <= 0) return;

    p.health = Math.max(0, p.health - dmg);
    sound.playHitHurt();
    this.createBloodSpatter(p.x, p.y, 8);
    this.addDamageText(`-${dmg}`, p.x, p.y - 25, '#ef4444');
    this.screenShake = 6;

    if (p.health <= 0) {
      p.deaths += 1;
      this.onLocalDeath?.(attackerId, weapon);
    }
  }

  public applyDamageToEnemy(targetId: string, damage: number, weapon: string) {
    const enemy = this.otherPlayers[targetId];
    if (!enemy) return;

    enemy.health = Math.max(0, enemy.health - damage);
    this.addDamageText(`-${damage}`, enemy.x, enemy.y - 25, '#f59e0b');

    this.onLocalDamageDealt?.(targetId, damage, weapon);

    if (enemy.health <= 0) {
      this.localPlayer.kills += 1;
      sound.playKillNotification();
      this.onKillFeedAdd?.({
        id: 'kf_' + Math.random().toString(36).substring(2, 7),
        killer: 'You',
        victim: enemy.name,
        weapon,
        time: Date.now(),
      });
    }
  }

  public respawnLocal(x: number, y: number) {
    const p = this.localPlayer;
    p.health = p.maxHealth;
    p.boost = p.maxBoost;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.ammo = WEAPONS[p.weapon].maxAmmo;
    p.grenades = 3;
    p.isReloading = false;
  }

  private createSparks(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        radius: 2,
        color: '#fef08a',
        alpha: 1,
        decay: 0.1,
      });
    }
  }

  private createBloodSpatter(x: number, y: number, count = 6) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * -3,
        radius: Math.random() * 3 + 2,
        color: '#dc2626',
        alpha: 1,
        decay: 0.04,
        gravity: 0.2,
      });
    }
  }

  private addDamageText(text: string, x: number, y: number, color: string) {
    this.damageNumbers.push({
      id: 'dn_' + Math.random().toString(36).substring(2, 7),
      text,
      x: x + (Math.random() * 16 - 8),
      y,
      color,
      life: 800,
      maxLife: 800,
    });
  }

  // --- RENDERING PIPELINE ---
  public render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();

    // Screen Shake Offset
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // Clear background
    ctx.fillStyle = this.map.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    // Apply Camera Translation
    ctx.translate(-Math.floor(this.cameraX), -Math.floor(this.cameraY));

    // 1. Draw Map Platforms
    this.renderPlatforms();

    // 2. Draw Barrels
    this.renderBarrels();

    // 3. Draw Pickups
    this.renderPickups();

    // 4. Draw Grenades
    this.renderGrenades();

    // 5. Draw Bullets & Laser Sights
    this.renderBullets();

    // 6. Draw Other Players / Bots
    for (const [, pl] of Object.entries(this.otherPlayers)) {
      if (pl.health > 0) {
        this.renderSoldier(pl.x, pl.y, pl.angle, pl.color, pl.avatarIndex, pl.name, pl.health, pl.weapon, pl.isBoosting, pl.isCrouching, false);
      }
    }

    // 7. Draw Local Player
    const p = this.localPlayer;
    if (p.health > 0) {
      this.renderSoldier(p.x, p.y, p.angle, '#10b981', 0, 'YOU', p.health, p.weapon, p.isBoosting, p.isCrouching, true);
    } else {
      // Local player dead overlay notice
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FRAGGED - RESPAWNING...', p.x, p.y - 30);
      ctx.restore();
    }

    // 8. Draw Particles
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 9. Draw Floating Combat Text
    for (const dn of this.damageNumbers) {
      ctx.save();
      ctx.fillStyle = dn.color;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(dn.text, dn.x, dn.y);
      ctx.restore();
    }

    ctx.restore();
  }

  private renderPlatforms() {
    const ctx = this.ctx;
    for (const plat of this.map.platforms) {
      ctx.save();
      if (plat.oneWay) {
        // One way suspension bridge / catwalk
        ctx.fillStyle = plat.color || '#475569';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Top border rail
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(plat.x, plat.y, plat.w, 3);

        // Grid catwalk notches
        ctx.fillStyle = '#1e293b';
        for (let gx = plat.x + 8; gx < plat.x + plat.w; gx += 16) {
          ctx.fillRect(gx, plat.y + 4, 3, plat.h - 6);
        }
      } else {
        // Solid rock / bunker platform
        ctx.fillStyle = plat.color || '#334155';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Top highlight
        ctx.fillStyle = '#64748b';
        ctx.fillRect(plat.x, plat.y, plat.w, 4);

        // Structural bevel border
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      }
      ctx.restore();
    }
  }

  private renderBarrels() {
    const ctx = this.ctx;
    for (const b of this.barrels) {
      if (b.isExploded) continue;

      ctx.save();
      // Red barrel body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 4);
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Yellow hazard stripes
      ctx.fillStyle = '#facc15';
      ctx.fillRect(b.x + 2, b.y + 10, b.w - 4, 5);
      ctx.fillRect(b.x + 2, b.y + 24, b.w - 4, 5);

      // Explosive icon
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TNT', b.x + b.w / 2, b.y + 22);

      ctx.restore();
    }
  }

  private renderPickups() {
    const ctx = this.ctx;
    const time = performance.now() * 0.003;

    for (const pk of this.pickups) {
      if (!pk.active) continue;

      const bobY = Math.sin(time + pk.x) * 4;
      ctx.save();
      ctx.translate(pk.x, pk.y + bobY);

      // Glow aura
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = pk.type === 'health' ? '#10b98125' : pk.type === 'weapon' ? '#ec489925' : '#38bdf825';
      ctx.fill();

      // Box base
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = pk.type === 'health' ? '#10b981' : pk.type === 'weapon' ? '#ec4899' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-12, -12, 24, 24, 6);
      ctx.fill();
      ctx.stroke();

      // Icon
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (pk.type === 'health') ctx.fillText('❤️', 0, 0);
      else if (pk.type === 'boost') ctx.fillText('⚡', 0, 0);
      else if (pk.type === 'ammo') ctx.fillText('📦', 0, 0);
      else ctx.fillText('🔫', 0, 0);

      ctx.restore();
    }
  }

  private renderGrenades() {
    const ctx = this.ctx;
    for (const g of this.grenades) {
      ctx.save();
      ctx.translate(g.x, g.y);

      // Body
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Flashing danger LED
      const flash = (Date.now() - g.createdAt) % 200 < 100;
      ctx.fillStyle = flash ? '#ef4444' : '#fee2e2';
      ctx.beginPath();
      ctx.arc(0, -3, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderBullets() {
    const ctx = this.ctx;

    // Laser sight for sniper rifle
    if (this.localPlayer.weapon === 'SNIPER' && this.localPlayer.health > 0) {
      const p = this.localPlayer;
      ctx.save();
      ctx.strokeStyle = '#ef444455';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * 800, p.y + Math.sin(p.angle) * 800);
      ctx.stroke();
      ctx.restore();
    }

    // Render flying bullets
    for (const b of this.bullets) {
      ctx.save();
      const def = WEAPONS[b.weaponType as WeaponKey] || WEAPONS.M4_RIFLE;

      if (b.weaponType === 'RPG') {
        // Rocket rocket warhead
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));

        ctx.fillStyle = '#475569';
        ctx.fillRect(-10, -3, 14, 6);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(4, -3);
        ctx.lineTo(10, 0);
        ctx.lineTo(4, 3);
        ctx.fill();
      } else {
        // Bullet tracer line
        ctx.strokeStyle = def.bulletColor;
        ctx.lineWidth = def.bulletRadius;
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 0.8, b.y - b.vy * 0.8);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderSoldier(
    x: number,
    y: number,
    angle: number,
    color: string,
    avatarIndex: number,
    name: string,
    health: number,
    weaponKey: string,
    isBoosting: boolean,
    isCrouching: boolean,
    isSelf: boolean
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    const facingRight = Math.cos(angle) >= 0;
    const bodyHeight = isCrouching ? 18 : 26;

    // 1. Floating Name & Health Bar above soldier
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 3;
    ctx.fillText(name, 0, -bodyHeight - 22);

    // Mini Health Bar
    const barW = 32;
    const barH = 4;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-barW / 2, -bodyHeight - 16, barW, barH);
    ctx.fillStyle = health > 50 ? '#10b981' : health > 25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(-barW / 2, -bodyHeight - 16, (health / 100) * barW, barH);

    // 2. Jetpack on Back
    const jpX = facingRight ? -14 : 14;
    ctx.fillStyle = '#334155';
    ctx.fillRect(jpX - 4, -8, 8, 20);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(jpX - 4, -8, 8, 20);

    // 3. Soldier Torso
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, bodyHeight, 5);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Head & Helmet
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(0, -16, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes
    const eyeX = facingRight ? 4 : -4;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eyeX, -16, 2, 0, Math.PI * 2);
    ctx.fill();

    // Helmet / Visor overlay
    if (avatarIndex === 0) {
      // Tactical Visor
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(facingRight ? -2 : -10, -19, 12, 5);
    } else if (avatarIndex === 1) {
      // Beret
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(0, -25, 14, 5, facingRight ? 0.2 : -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (avatarIndex === 2) {
      // Gas Mask
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(eyeX, -12, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Heavy helmet
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, -18, 14, Math.PI, 0);
      ctx.fill();
    }

    // 5. Weapon & Aim Arm (Rotating 360°)
    ctx.save();
    ctx.rotate(angle);

    const wDef = WEAPONS[weaponKey as WeaponKey] || WEAPONS.M4_RIFLE;

    // Arm
    ctx.fillStyle = color;
    ctx.fillRect(0, -3, 12, 5);
    ctx.strokeRect(0, -3, 12, 5);

    // Weapon Gun Sprite
    ctx.fillStyle = '#1e293b';
    if (weaponKey === 'RPG') {
      ctx.fillRect(6, -6, 28, 8);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(16, -7, 10, 10);
    } else if (weaponKey === 'SNIPER') {
      ctx.fillRect(6, -4, 32, 5);
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(10, -7, 8, 3); // Scope
    } else if (weaponKey === 'SHOTGUN') {
      ctx.fillRect(6, -5, 22, 7);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(10, 2, 8, 3);
    } else {
      ctx.fillRect(6, -4, 20, 5);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(10, -5, 8, 2);
    }

    ctx.restore();

    ctx.restore();
  }
}
