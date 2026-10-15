import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { MAPS } from './game/mapData';
import { NetworkClient } from './game/networkClient';
import { BotController, createBot, updateBotAI } from './game/botAI';
import { sound } from './utils/audio';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { ScoreboardModal } from './components/ScoreboardModal';
import { Lobby } from './components/Lobby';
import { KillFeedEntry } from './types/game';
import { NetworkPlayer, BulletData, GrenadeData } from './server/gameServer';

export default function App() {
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'game_over'>('lobby');
  const [gameMode, setGameMode] = useState<'offline_bots' | 'websocket' | 'p2p'>('offline_bots');

  // Player Profile
  const [playerName, setPlayerName] = useState('Commander');
  const [playerColor, setPlayerColor] = useState('#10b981');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [selectedMapId, setSelectedMapId] = useState('outpost');

  // Match State
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [ping, setPing] = useState(12);

  // Network & Hotspot State
  const [networkIps, setNetworkIps] = useState<string[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [activeRoomCode, setActiveRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);

  // Touch Device Detection
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Canvas & Engine Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const networkClientRef = useRef<NetworkClient | null>(null);
  const botsRef = useRef<BotController[]>([]);

  // Local Player reactive state for HUD
  const [hudState, setHudState] = useState<{
    player: NetworkPlayer;
    allPlayers: NetworkPlayer[];
    grenadeCount: number;
    isReloading: boolean;
  }>({
    player: {
      id: 'local',
      name: 'Commander',
      color: '#10b981',
      avatarIndex: 0,
      x: 300,
      y: 300,
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
      ping: 10,
    },
    allPlayers: [],
    grenadeCount: 3,
    isReloading: false,
  });

  // 1. Detect touch device & retrieve local network IPs on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);

    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.ips) {
          setNetworkIps(data.ips);
        }
      })
      .catch((err) => {
        console.warn('Network info fetch error (running in client preview):', err);
        setNetworkIps(['192.168.43.1']);
      });
  }, []);

  // 2. Initialize Network Client
  useEffect(() => {
    const client = new NetworkClient({
      onConnected: (id) => {
        console.log('Connected with ID:', id);
      },
      onRoomsList: (rooms) => {
        setAvailableRooms(rooms);
      },
      onRoomJoined: (room, selfId) => {
        setActiveRoomCode(room.code);
        setTimeRemaining(room.timeRemaining || 300);
        startGame('websocket', room.mapId || 'outpost');
      },
      onPlayerJoined: (player) => {
        if (engineRef.current) {
          engineRef.current.otherPlayers[player.id] = player;
        }
      },
      onPlayerLeft: (playerId, message) => {
        if (engineRef.current) {
          delete engineRef.current.otherPlayers[playerId];
        }
      },
      onStateTick: (players, bullets, grenades, timeRem) => {
        setTimeRemaining(Math.ceil(timeRem));
        if (engineRef.current) {
          const selfId = client.selfId;
          const otherMap: Record<string, NetworkPlayer> = {};
          for (const [id, pl] of Object.entries(players)) {
            if (id !== selfId) {
              otherMap[id] = pl;
            }
          }
          engineRef.current.otherPlayers = otherMap;
        }
      },
      onBulletFired: (bullet) => {
        if (engineRef.current && bullet.ownerId !== client.selfId) {
          engineRef.current.bullets.push(bullet);
          sound.playGunshot(bullet.weaponType);
        }
      },
      onGrenadeThrown: (grenade) => {
        if (engineRef.current && grenade.ownerId !== client.selfId) {
          engineRef.current.grenades.push(grenade);
          sound.playGrenadeThrow();
        }
      },
      onPlayerDamaged: (targetId, attackerId, damage, newHealth) => {
        if (engineRef.current) {
          if (targetId === client.selfId) {
            engineRef.current.takeLocalDamage(damage, 'combat', attackerId);
          } else if (engineRef.current.otherPlayers[targetId]) {
            engineRef.current.otherPlayers[targetId].health = newHealth;
          }
        }
      },
      onPlayerKilled: (killer, victim, weapon, feed) => {
        setKillFeed(feed || []);
      },
      onPlayerRespawned: (playerId, pl) => {
        if (engineRef.current && engineRef.current.otherPlayers[playerId]) {
          engineRef.current.otherPlayers[playerId] = pl;
        }
      },
      onError: (err) => {
        console.warn('Network Client Notice:', err);
      },
    });

    networkClientRef.current = client;

    // Connect WebSocket
    try {
      client.connectWebSocket();
    } catch {}

    return () => {
      client.disconnect();
    };
  }, []);

  // 3. Start Game Action
  const startGame = useCallback((mode: 'offline_bots' | 'websocket' | 'p2p', mapId: string) => {
    setGameMode(mode);
    setSelectedMapId(mapId);
    setGameState('playing');
    setTimeRemaining(300);
    setKillFeed([]);

    const map = MAPS[mapId] || MAPS.outpost;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize canvas to full window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const startSpawn = map.spawnPoints[Math.floor(Math.random() * map.spawnPoints.length)];
    const engine = new GameEngine(canvas, map, startSpawn.x, startSpawn.y);

    // Sync soldier custom appearance
    engine.localPlayer.weapon = 'M4_RIFLE';
    engineRef.current = engine;

    // Networking callbacks
    const net = networkClientRef.current;

    engine.onLocalShoot = (b) => {
      if (mode !== 'offline_bots' && net) {
        net.shootBullet(b);
      }
    };

    engine.onLocalGrenade = (g) => {
      if (mode !== 'offline_bots' && net) {
        net.throwGrenade(g);
      }
    };

    engine.onLocalDamageDealt = (targetId, dmg, weapon) => {
      if (mode !== 'offline_bots' && net) {
        net.dealDamage(targetId, dmg, weapon);
      }
    };

    engine.onLocalDeath = (killerId, weapon) => {
      // Auto respawn after 3 seconds
      setTimeout(() => {
        if (engineRef.current) {
          const respawnPoint = map.spawnPoints[Math.floor(Math.random() * map.spawnPoints.length)];
          engineRef.current.respawnLocal(respawnPoint.x, respawnPoint.y);
          if (mode !== 'offline_bots' && net) {
            net.respawn(respawnPoint.x, respawnPoint.y);
          }
        }
      }, 3000);
    };

    engine.onKillFeedAdd = (kf) => {
      setKillFeed((prev) => [kf, ...prev.slice(0, 5)]);
    };

    // If Offline Bots Mode, spawn 4 bots
    if (mode === 'offline_bots') {
      const botNames = [
        { name: 'Sarge', color: '#ef4444' },
        { name: 'Ghost', color: '#38bdf8' },
        { name: 'Viper', color: '#10b981' },
        { name: 'Rex', color: '#f59e0b' },
      ];

      const newBots: BotController[] = botNames.map((bn, i) => {
        const sp = map.spawnPoints[(i + 1) % map.spawnPoints.length];
        return createBot(`bot_${i}`, bn.name, bn.color, sp.x, sp.y, 0.75 + Math.random() * 0.15);
      });

      botsRef.current = newBots;
      const initialOtherPlayers: Record<string, NetworkPlayer> = {};
      for (const b of newBots) {
        initialOtherPlayers[b.player.id] = b.player;
      }
      engine.otherPlayers = initialOtherPlayers;
    }

    engine.start();
  }, []);

  // 4. Main Game Loop Tick for Bot AI & HUD sync
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (timestamp: number) => {
      const delta = Math.min(100, timestamp - lastTime);
      lastTime = timestamp;

      const engine = engineRef.current;
      if (engine) {
        // Sync local position to network if in multiplayer
        if (gameMode !== 'offline_bots' && networkClientRef.current) {
          networkClientRef.current.sendInput({
            x: engine.localPlayer.x,
            y: engine.localPlayer.y,
            vx: engine.localPlayer.vx,
            vy: engine.localPlayer.vy,
            angle: engine.localPlayer.angle,
            health: engine.localPlayer.health,
            boost: engine.localPlayer.boost,
            isBoosting: engine.localPlayer.isBoosting,
            isCrouching: engine.localPlayer.isCrouching,
            weapon: engine.localPlayer.weapon,
            ammo: engine.localPlayer.ammo,
          });
        }

        // Update Bot AI in Offline Mode
        if (gameMode === 'offline_bots') {
          const allP: NetworkPlayer[] = [
            {
              id: 'local',
              name: playerName,
              color: playerColor,
              avatarIndex,
              x: engine.localPlayer.x,
              y: engine.localPlayer.y,
              vx: engine.localPlayer.vx,
              vy: engine.localPlayer.vy,
              angle: engine.localPlayer.angle,
              health: engine.localPlayer.health,
              maxHealth: engine.localPlayer.maxHealth,
              boost: engine.localPlayer.boost,
              maxBoost: engine.localPlayer.maxBoost,
              isBoosting: engine.localPlayer.isBoosting,
              isCrouching: engine.localPlayer.isCrouching,
              weapon: engine.localPlayer.weapon,
              ammo: engine.localPlayer.ammo,
              kills: engine.localPlayer.kills,
              deaths: engine.localPlayer.deaths,
              ping: 5,
            },
            ...botsRef.current.map((b) => b.player),
          ];

          for (const bot of botsRef.current) {
            updateBotAI(
              bot,
              allP,
              engine.map,
              delta,
              (bPlayer, aimAngle) => {
                // Bot shoot bullet
                const def = (bPlayer.weapon === 'RPG' ? 'RPG' : bPlayer.weapon === 'SNIPER' ? 'SNIPER' : 'M4_RIFLE');
                const bullet: BulletData = {
                  id: 'bb_' + Math.random().toString(36).substring(2, 7),
                  ownerId: bPlayer.id,
                  weaponType: def,
                  x: bPlayer.x + Math.cos(aimAngle) * 20,
                  y: bPlayer.y + Math.sin(aimAngle) * 20,
                  vx: Math.cos(aimAngle) * 18,
                  vy: Math.sin(aimAngle) * 18,
                  damage: def === 'RPG' ? 95 : def === 'SNIPER' ? 85 : 18,
                  createdAt: Date.now(),
                  life: 1400,
                };
                engine.bullets.push(bullet);
                sound.playGunshot(def);
              },
              (bPlayer, aimAngle) => {
                // Bot throw grenade
                const grenade: GrenadeData = {
                  id: 'bg_' + Math.random().toString(36).substring(2, 7),
                  ownerId: bPlayer.id,
                  x: bPlayer.x + Math.cos(aimAngle) * 20,
                  y: bPlayer.y + Math.sin(aimAngle) * 20,
                  vx: Math.cos(aimAngle) * 14,
                  vy: Math.sin(aimAngle) * 14 - 3,
                  fuse: 2200,
                  createdAt: Date.now(),
                };
                engine.grenades.push(grenade);
                sound.playGrenadeThrow();
              }
            );

            // Handle bot death & respawn
            if (bot.player.health <= 0 && (bot.player as any).respawnTimer === undefined) {
              (bot.player as any).respawnTimer = 3500;
              setTimeout(() => {
                const sp = engine.map.spawnPoints[Math.floor(Math.random() * engine.map.spawnPoints.length)];
                bot.player.health = 100;
                bot.player.boost = 100;
                bot.player.x = sp.x;
                bot.player.y = sp.y;
                bot.player.ammo = 30;
                delete (bot.player as any).respawnTimer;
              }, 3500);
            }

            engine.otherPlayers[bot.player.id] = bot.player;
          }
        }

        // Match countdown timer
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setGameState('game_over');
            return 0;
          }
          return Math.max(0, prev - delta / 1000);
        });

        // Sync state to React HUD
        const currentLocal = engine.localPlayer;
        const allList: NetworkPlayer[] = [
          {
            id: 'local',
            name: playerName,
            color: playerColor,
            avatarIndex,
            x: currentLocal.x,
            y: currentLocal.y,
            vx: currentLocal.vx,
            vy: currentLocal.vy,
            angle: currentLocal.angle,
            health: currentLocal.health,
            maxHealth: currentLocal.maxHealth,
            boost: currentLocal.boost,
            maxBoost: currentLocal.maxBoost,
            isBoosting: currentLocal.isBoosting,
            isCrouching: currentLocal.isCrouching,
            weapon: currentLocal.weapon,
            ammo: currentLocal.ammo,
            kills: currentLocal.kills,
            deaths: currentLocal.deaths,
            ping: 8,
          },
          ...Object.values(engine.otherPlayers),
        ];

        setHudState({
          player: allList[0],
          allPlayers: allList,
          grenadeCount: currentLocal.grenades,
          isReloading: currentLocal.isReloading,
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, gameMode, playerName, playerColor, avatarIndex]);

  // 5. Desktop Keyboard & Mouse Event Listeners
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      engine.keys[e.code] = true;

      if (e.code === 'KeyR') {
        engine.triggerReload();
      } else if (e.code === 'KeyG') {
        engine.throwGrenade();
      } else if (e.code === 'KeyF' || e.code === 'KeyE') {
        engine.triggerMelee();
      } else if (e.code === 'KeyQ') {
        engine.switchWeapon();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        setIsScoreboardOpen((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.keys[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.mouseX = e.clientX;
      engine.mouseY = e.clientY;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const engine = engineRef.current;
        if (engine) engine.isMouseDown = true;
      } else if (e.button === 2) {
        e.preventDefault();
        engineRef.current?.throwGrenade();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        const engine = engineRef.current;
        if (engine) engine.isMouseDown = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', handleResize);
    };
  }, [gameState]);

  // Handle Touch Movement
  const handleTouchMove = useCallback((dx: number, dy: number, isBoosting: boolean, isCrouching: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.touchMoveX = dx;
    engine.touchMoveY = dy;
    engine.touchIsBoosting = isBoosting;
    engine.touchIsCrouching = isCrouching;
  }, []);

  // Handle Touch Aim & Fire
  const handleTouchAim = useCallback((angle: number, isFiring: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.touchAimAngle = isFiring ? angle : null;
    engine.touchIsFiring = isFiring;
  }, []);

  // Mute Toggle
  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    sound.setMuted(next);
  };

  // Lobby actions
  const handleStartOfflineBots = (name: string, color: string, avIdx: number, mapId: string) => {
    setPlayerName(name);
    setPlayerColor(color);
    setAvatarIndex(avIdx);
    startGame('offline_bots', mapId);
  };

  const handleHostMatch = (roomName: string, name: string, color: string, avIdx: number, mapId: string) => {
    setPlayerName(name);
    setPlayerColor(color);
    setAvatarIndex(avIdx);
    setIsHost(true);
    networkClientRef.current?.createRoom(roomName, name, color, avIdx, mapId);
  };

  const handleJoinMatch = (code: string, name: string, color: string, avIdx: number) => {
    setPlayerName(name);
    setPlayerColor(color);
    setAvatarIndex(avIdx);
    setIsHost(false);
    networkClientRef.current?.joinRoom(code, name, color, avIdx);
  };

  const handleHostP2P = (name: string, color: string, avIdx: number, mapId: string) => {
    setPlayerName(name);
    setPlayerColor(color);
    setAvatarIndex(avIdx);
    setIsHost(true);
    networkClientRef.current?.initP2PHost(undefined, (peerId) => {
      setActiveRoomCode(peerId);
      startGame('p2p', mapId);
    });
  };

  const handleJoinP2P = (peerId: string, name: string, color: string, avIdx: number) => {
    setPlayerName(name);
    setPlayerColor(color);
    setAvatarIndex(avIdx);
    setIsHost(false);
    networkClientRef.current?.joinP2PHost(peerId, () => {
      startGame('p2p', 'outpost');
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 1. LOBBY SCREEN */}
      {gameState === 'lobby' && (
        <Lobby
          onStartOfflineBots={handleStartOfflineBots}
          onHostMatch={handleHostMatch}
          onJoinMatch={handleJoinMatch}
          onHostP2P={handleHostP2P}
          onJoinP2P={handleJoinP2P}
          availableRooms={availableRooms}
          onRefreshRooms={() => networkClientRef.current?.getRooms()}
          networkIps={networkIps}
          activeRoomCode={activeRoomCode}
          isHost={isHost}
        />
      )}

      {/* 2. ACTIVE BATTLEFIELD */}
      {gameState === 'playing' && (
        <>
          {/* HTML5 Game Canvas */}
          <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />

          {/* Tactical HUD */}
          <HUD
            player={hudState.player}
            allPlayers={hudState.allPlayers}
            map={MAPS[selectedMapId] || MAPS.outpost}
            timeRemaining={timeRemaining}
            killFeed={killFeed}
            grenadeCount={hudState.grenadeCount}
            isReloading={hudState.isReloading}
            onOpenScoreboard={() => setIsScoreboardOpen(true)}
            onSwitchWeapon={() => engineRef.current?.switchWeapon()}
            onReload={() => engineRef.current?.triggerReload()}
            soundMuted={soundMuted}
            onToggleSound={toggleSound}
            onSendQuickChat={(msg) => networkClientRef.current?.sendChat(msg)}
            ping={ping}
            mode={gameMode}
          />

          {/* Virtual Dual Touch Controls for Mobile/Tablet or Touchscreen */}
          {isTouchDevice && (
            <TouchControls
              onMove={handleTouchMove}
              onAim={handleTouchAim}
              onThrowGrenade={() => engineRef.current?.throwGrenade()}
              onMelee={() => engineRef.current?.triggerMelee()}
              onReload={() => engineRef.current?.triggerReload()}
              onSwitchWeapon={() => engineRef.current?.switchWeapon()}
              currentWeapon={hudState.player.weapon}
              ammo={hudState.player.ammo}
              maxAmmo={hudState.player.weapon === 'RPG' ? 3 : hudState.player.weapon === 'SNIPER' ? 5 : 30}
              isReloading={hudState.isReloading}
              grenadeCount={hudState.grenadeCount}
              boost={hudState.player.boost}
            />
          )}

          {/* Scoreboard Modal */}
          <ScoreboardModal
            isOpen={isScoreboardOpen}
            onClose={() => setIsScoreboardOpen(false)}
            players={hudState.allPlayers}
            selfId="local"
          />
        </>
      )}

      {/* 3. GAME OVER / MATCH SUMMARY BANNER */}
      {gameState === 'game_over' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-8 max-w-lg w-full text-center flex flex-col items-center gap-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 text-3xl">
              🏆
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-widest">
                Match Finished!
              </h2>
              <p className="text-xs text-slate-400 mt-1">Combat report and final standings</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
              <div>
                <div className="text-xs text-slate-400 uppercase font-mono">Your Kills</div>
                <div className="text-3xl font-black text-emerald-400 font-mono mt-0.5">
                  {hudState.player.kills}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase font-mono">Deaths</div>
                <div className="text-3xl font-black text-rose-400 font-mono mt-0.5">
                  {hudState.player.deaths}
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setIsScoreboardOpen(true)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm uppercase transition-colors"
              >
                View Leaderboard
              </button>
              <button
                onClick={() => {
                  engineRef.current?.stop();
                  setGameState('lobby');
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wide transition-all shadow-lg"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
