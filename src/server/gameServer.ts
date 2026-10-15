import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

export interface NetworkPlayer {
  id: string;
  name: string;
  color: string;
  avatarIndex: number;
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
  weapon: string;
  ammo: number;
  kills: number;
  deaths: number;
  ping: number;
  isBot?: boolean;
}

export interface BulletData {
  id: string;
  ownerId: string;
  weaponType: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  createdAt: number;
  life: number;
}

export interface GrenadeData {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuse: number;
  createdAt: number;
}

export interface RoomState {
  code: string;
  name: string;
  hostId: string;
  mapId: string;
  maxPlayers: number;
  started: boolean;
  gameTimeRemaining: number;
  players: Record<string, NetworkPlayer>;
  bullets: BulletData[];
  grenades: GrenadeData[];
  killFeed: Array<{ id: string; killer: string; victim: string; weapon: string; time: number }>;
}

const rooms: Record<string, RoomState> = {};
const playerSockets: Map<string, WebSocket> = new Map();
const playerRooms: Map<string, string> = new Map();

export function setupGameWebSocket(httpServer: any) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request: any, socket: any, head: any) => {
    const url = request.url || '';
    if (url.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    let playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    playerSockets.set(playerId, ws);

    // Send initial client handshake
    ws.send(JSON.stringify({
      type: 'connected',
      playerId,
    }));

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        handleClientMessage(playerId, data, ws);
      } catch (err) {
        console.error('Error parsing client message:', err);
      }
    });

    ws.on('close', () => {
      const roomCode = playerRooms.get(playerId);
      if (roomCode && rooms[roomCode]) {
        const room = rooms[roomCode];
        const playerName = room.players[playerId]?.name || 'Player';
        delete room.players[playerId];
        playerRooms.delete(playerId);
        playerSockets.delete(playerId);

        // Notify room
        broadcastToRoom(roomCode, {
          type: 'player_left',
          playerId,
          message: `${playerName} disconnected`,
        });

        // Clean up empty room
        if (Object.keys(room.players).length === 0) {
          delete rooms[roomCode];
        }
      }
      playerSockets.delete(playerId);
    });
  });

  // Game loop tick for rooms (sync state 20 times per second)
  setInterval(() => {
    for (const [code, room] of Object.entries(rooms)) {
      if (!room.started) continue;

      // Update match timer
      if (room.gameTimeRemaining > 0) {
        room.gameTimeRemaining = Math.max(0, room.gameTimeRemaining - 0.05);
      }

      // Broadcast state tick
      broadcastToRoom(code, {
        type: 'state_tick',
        timeRemaining: room.gameTimeRemaining,
        players: room.players,
        bullets: room.bullets,
        grenades: room.grenades,
      });

      // Clear expired bullets / grenades
      const now = Date.now();
      room.bullets = room.bullets.filter(b => now - b.createdAt < b.life);
      room.grenades = room.grenades.filter(g => now - g.createdAt < 3500);
    }
  }, 50);

  return wss;
}

function broadcastToRoom(roomCode: string, payload: any, excludeId?: string) {
  const room = rooms[roomCode];
  if (!room) return;
  const messageStr = JSON.stringify(payload);

  for (const pid of Object.keys(room.players)) {
    if (pid === excludeId) continue;
    const sock = playerSockets.get(pid);
    if (sock && sock.readyState === WebSocket.OPEN) {
      sock.send(messageStr);
    }
  }
}

function handleClientMessage(playerId: string, data: any, ws: WebSocket) {
  switch (data.type) {
    case 'get_rooms': {
      const availableRooms = Object.values(rooms).map(r => ({
        code: r.code,
        name: r.name,
        playerCount: Object.keys(r.players).length,
        maxPlayers: r.maxPlayers,
        started: r.started,
        mapId: r.mapId,
      }));
      ws.send(JSON.stringify({
        type: 'rooms_list',
        rooms: availableRooms,
      }));
      break;
    }

    case 'create_room': {
      const code = (data.code || Math.random().toString(36).substring(2, 7)).toUpperCase();
      const newRoom: RoomState = {
        code,
        name: data.roomName || `Hotspot Arena #${code}`,
        hostId: playerId,
        mapId: data.mapId || 'outpost',
        maxPlayers: data.maxPlayers || 8,
        started: true,
        gameTimeRemaining: 300, // 5 min match
        players: {},
        bullets: [],
        grenades: [],
        killFeed: [],
      };

      newRoom.players[playerId] = {
        id: playerId,
        name: data.name || 'Commander',
        color: data.color || '#10b981',
        avatarIndex: data.avatarIndex || 0,
        x: 200,
        y: 200,
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
        ping: 0,
      };

      rooms[code] = newRoom;
      playerRooms.set(playerId, code);

      ws.send(JSON.stringify({
        type: 'room_joined',
        room: {
          code: newRoom.code,
          name: newRoom.name,
          hostId: newRoom.hostId,
          mapId: newRoom.mapId,
          players: newRoom.players,
          timeRemaining: newRoom.gameTimeRemaining,
        },
        selfId: playerId,
      }));
      break;
    }

    case 'join_room': {
      const code = (data.code || '').toUpperCase();
      const room = rooms[code];
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: `Room ${code} not found.` }));
        return;
      }
      if (Object.keys(room.players).length >= room.maxPlayers) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full.' }));
        return;
      }

      room.players[playerId] = {
        id: playerId,
        name: data.name || 'Soldier',
        color: data.color || '#3b82f6',
        avatarIndex: data.avatarIndex || 1,
        x: 300 + Math.random() * 400,
        y: 200,
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
        ping: 0,
      };

      playerRooms.set(playerId, code);

      ws.send(JSON.stringify({
        type: 'room_joined',
        room: {
          code: room.code,
          name: room.name,
          hostId: room.hostId,
          mapId: room.mapId,
          players: room.players,
          timeRemaining: room.gameTimeRemaining,
        },
        selfId: playerId,
      }));

      // Broadcast join to existing players
      broadcastToRoom(code, {
        type: 'player_joined',
        player: room.players[playerId],
      }, playerId);
      break;
    }

    case 'player_input': {
      const roomCode = playerRooms.get(playerId);
      if (!roomCode || !rooms[roomCode]) return;
      const room = rooms[roomCode];
      const player = room.players[playerId];
      if (!player) return;

      // Update authoritative player kinematics
      if (typeof data.x === 'number') player.x = data.x;
      if (typeof data.y === 'number') player.y = data.y;
      if (typeof data.vx === 'number') player.vx = data.vx;
      if (typeof data.vy === 'number') player.vy = data.vy;
      if (typeof data.angle === 'number') player.angle = data.angle;
      if (typeof data.health === 'number') player.health = data.health;
      if (typeof data.boost === 'number') player.boost = data.boost;
      if (typeof data.isBoosting === 'boolean') player.isBoosting = data.isBoosting;
      if (typeof data.isCrouching === 'boolean') player.isCrouching = data.isCrouching;
      if (data.weapon) player.weapon = data.weapon;
      if (typeof data.ammo === 'number') player.ammo = data.ammo;
      break;
    }

    case 'shoot': {
      const roomCode = playerRooms.get(playerId);
      if (!roomCode || !rooms[roomCode]) return;
      const room = rooms[roomCode];

      const bullet: BulletData = {
        id: 'b_' + Math.random().toString(36).substring(2, 9),
        ownerId: playerId,
        weaponType: data.weaponType || 'M4_RIFLE',
        x: data.x,
        y: data.y,
        vx: data.vx,
        vy: data.vy,
        damage: data.damage || 20,
        createdAt: Date.now(),
        life: data.life || 1500,
      };

      room.bullets.push(bullet);

      broadcastToRoom(roomCode, {
        type: 'bullet_fired',
        bullet,
      });
      break;
    }

    case 'throw_grenade': {
      const roomCode = playerRooms.get(playerId);
      if (!roomCode || !rooms[roomCode]) return;
      const room = rooms[roomCode];

      const grenade: GrenadeData = {
        id: 'g_' + Math.random().toString(36).substring(2, 9),
        ownerId: playerId,
        x: data.x,
        y: data.y,
        vx: data.vx,
        vy: data.vy,
        fuse: data.fuse || 2500,
        createdAt: Date.now(),
      };

      room.grenades.push(grenade);

      broadcastToRoom(roomCode, {
        type: 'grenade_thrown',
        grenade,
      });
      break;
    }

    case 'damage_event': {
      const roomCode = playerRooms.get(playerId);
      if (!roomCode || !rooms[roomCode]) return;
      const room = rooms[roomCode];
      const targetId = data.targetId;
      const target = room.players[targetId];
      if (!target) return;

      target.health = Math.max(0, target.health - (data.damage || 25));

      broadcastToRoom(roomCode, {
        type: 'player_damaged',
        targetId,
        attackerId: playerId,
        damage: data.damage,
        newHealth: target.health,
      });

      if (target.health <= 0) {
        target.deaths += 1;
        const attacker = room.players[playerId];
        if (attacker && attacker.id !== target.id) {
          attacker.kills += 1;
        }

        const killRecord = {
          id: 'kf_' + Math.random().toString(36).substring(2, 7),
          killer: attacker?.name || 'World',
          victim: target.name,
          weapon: data.weapon || 'combat',
          time: Date.now(),
        };
        room.killFeed.unshift(killRecord);
        if (room.killFeed.length > 8) room.killFeed.pop();

        broadcastToRoom(roomCode, {
          type: 'player_killed',
          killerId: playerId,
          victimId: targetId,
          killerName: attacker?.name || 'World',
          victimName: target.name,
          weapon: data.weapon || 'combat',
          killFeed: room.killFeed,
        });
      }
      break;
    }

    case 'respawn': {
      const roomCode = playerRooms.get(playerId);
      if (!roomCode || !rooms[roomCode]) return;
      const room = rooms[roomCode];
      const player = room.players[playerId];
      if (!player) return;

      player.health = player.maxHealth;
      player.boost = player.maxBoost;
      player.x = data.x || (200 + Math.random() * 600);
      player.y = data.y || 150;
      player.vx = 0;
      player.vy = 0;
      player.ammo = 30;

      broadcastToRoom(roomCode, {
        type: 'player_respawned',
        playerId,
        player,
      });
      break;
    }

    case 'chat_message': {
      const roomCode = playerRooms.get(playerId);
      if (!roomCode || !rooms[roomCode]) return;
      const room = rooms[roomCode];
      const sender = room.players[playerId];
      if (!sender) return;

      broadcastToRoom(roomCode, {
        type: 'chat',
        id: 'msg_' + Math.random().toString(36).substring(2, 7),
        senderName: sender.name,
        color: sender.color,
        text: (data.text || '').substring(0, 80),
        time: Date.now(),
      });
      break;
    }

    case 'ping': {
      ws.send(JSON.stringify({ type: 'pong', clientTime: data.clientTime }));
      break;
    }
  }
}
