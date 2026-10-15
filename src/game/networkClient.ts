import Peer, { DataConnection } from 'peerjs';
import { BulletData, GrenadeData, NetworkPlayer } from '../server/gameServer';

export type NetworkMode = 'websocket' | 'p2p' | 'offline_bots';

export interface NetworkCallbacks {
  onConnected?: (playerId: string) => void;
  onRoomJoined?: (room: any, selfId: string) => void;
  onRoomsList?: (rooms: any[]) => void;
  onPlayerJoined?: (player: NetworkPlayer) => void;
  onPlayerLeft?: (playerId: string, message: string) => void;
  onStateTick?: (players: Record<string, NetworkPlayer>, bullets: BulletData[], grenades: GrenadeData[], timeRemaining: number) => void;
  onBulletFired?: (bullet: BulletData) => void;
  onGrenadeThrown?: (grenade: GrenadeData) => void;
  onPlayerDamaged?: (targetId: string, attackerId: string, damage: number, newHealth: number) => void;
  onPlayerKilled?: (killerName: string, victimName: string, weapon: string, killFeed: any[]) => void;
  onPlayerRespawned?: (playerId: string, player: NetworkPlayer) => void;
  onChatMessage?: (msg: any) => void;
  onError?: (err: string) => void;
}

export class NetworkClient {
  public mode: NetworkMode = 'websocket';
  public selfId: string = '';
  private ws: WebSocket | null = null;
  private peer: Peer | null = null;
  private p2pConnections: Map<string, DataConnection> = new Map();
  private callbacks: NetworkCallbacks = {};
  public isHost = false;
  public roomCode = '';

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  // 1. Connect via Local Server WebSocket
  public connectWebSocket(serverHost?: string) {
    this.mode = 'websocket';
    if (this.ws) {
      this.ws.close();
    }

    const host = serverHost || window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.getRooms();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handlePacket(data);
        } catch (e) {
          console.error('Failed to parse WebSocket packet', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error, falling back or retry:', err);
        this.callbacks.onError?.('Local server connection error. Make sure Host is on same Wi-Fi.');
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
      };
    } catch (err: any) {
      this.callbacks.onError?.(err?.message || 'Failed to connect WebSocket');
    }
  }

  // 2. Direct P2P via PeerJS
  public initP2PHost(customId?: string, onReady?: (peerId: string) => void) {
    this.mode = 'p2p';
    this.isHost = true;
    const peerId = customId || 'mm-' + Math.random().toString(36).substring(2, 8);
    this.selfId = 'host_' + peerId;

    try {
      this.peer = new Peer(peerId, {
        debug: 1,
      });

      this.peer.on('open', (id) => {
        this.selfId = id;
        this.callbacks.onConnected?.(id);
        onReady?.(id);
      });

      this.peer.on('connection', (conn) => {
        this.p2pConnections.set(conn.peer, conn);

        conn.on('data', (data: any) => {
          this.handlePacket(data);
          // Host relays to other peers
          for (const [peerKey, otherConn] of this.p2pConnections) {
            if (peerKey !== conn.peer && otherConn.open) {
              otherConn.send(data);
            }
          }
        });

        conn.on('close', () => {
          this.p2pConnections.delete(conn.peer);
          this.callbacks.onPlayerLeft?.(conn.peer, 'Player left peer match');
        });
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        this.callbacks.onError?.('P2P Error: ' + err.message);
      });
    } catch (e: any) {
      this.callbacks.onError?.(e.message);
    }
  }

  public joinP2PHost(hostPeerId: string, onConnected?: () => void) {
    this.mode = 'p2p';
    this.isHost = false;

    try {
      this.peer = new Peer({ debug: 1 });
      this.peer.on('open', (myId) => {
        this.selfId = myId;
        const conn = this.peer!.connect(hostPeerId, { reliable: true });

        conn.on('open', () => {
          this.p2pConnections.set(hostPeerId, conn);
          onConnected?.();
          this.callbacks.onConnected?.(myId);
        });

        conn.on('data', (data: any) => {
          this.handlePacket(data);
        });

        conn.on('close', () => {
          this.callbacks.onError?.('Host disconnected');
        });

        conn.on('error', (err) => {
          this.callbacks.onError?.('Connection error: ' + err);
        });
      });
    } catch (err: any) {
      this.callbacks.onError?.(err?.message || 'Failed to initialize PeerJS');
    }
  }

  // Handle incoming packets (both WS and P2P)
  private handlePacket(data: any) {
    switch (data.type) {
      case 'connected':
        this.selfId = data.playerId;
        this.callbacks.onConnected?.(data.playerId);
        break;
      case 'rooms_list':
        this.callbacks.onRoomsList?.(data.rooms);
        break;
      case 'room_joined':
        this.roomCode = data.room.code;
        this.callbacks.onRoomJoined?.(data.room, data.selfId || this.selfId);
        break;
      case 'player_joined':
        this.callbacks.onPlayerJoined?.(data.player);
        break;
      case 'player_left':
        this.callbacks.onPlayerLeft?.(data.playerId, data.message);
        break;
      case 'state_tick':
        this.callbacks.onStateTick?.(data.players, data.bullets, data.grenades, data.timeRemaining);
        break;
      case 'bullet_fired':
        this.callbacks.onBulletFired?.(data.bullet);
        break;
      case 'grenade_thrown':
        this.callbacks.onGrenadeThrown?.(data.grenade);
        break;
      case 'player_damaged':
        this.callbacks.onPlayerDamaged?.(data.targetId, data.attackerId, data.damage, data.newHealth);
        break;
      case 'player_killed':
        this.callbacks.onPlayerKilled?.(data.killerName, data.victimName, data.weapon, data.killFeed);
        break;
      case 'player_respawned':
        this.callbacks.onPlayerRespawned?.(data.playerId, data.player);
        break;
      case 'chat':
        this.callbacks.onChatMessage?.(data);
        break;
      case 'error':
        this.callbacks.onError?.(data.message);
        break;
    }
  }

  // Senders
  public send(payload: any) {
    if (this.mode === 'websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else if (this.mode === 'p2p') {
      for (const [, conn] of this.p2pConnections) {
        if (conn.open) {
          conn.send(payload);
        }
      }
    }
  }

  public getRooms() {
    this.send({ type: 'get_rooms' });
  }

  public createRoom(roomName: string, name: string, color: string, avatarIndex: number, mapId = 'outpost') {
    this.send({
      type: 'create_room',
      roomName,
      name,
      color,
      avatarIndex,
      mapId,
    });
  }

  public joinRoom(code: string, name: string, color: string, avatarIndex: number) {
    this.send({
      type: 'join_room',
      code: code.trim().toUpperCase(),
      name,
      color,
      avatarIndex,
    });
  }

  public sendInput(playerData: Partial<NetworkPlayer>) {
    this.send({
      type: 'player_input',
      ...playerData,
    });
  }

  public shootBullet(bullet: Partial<BulletData>) {
    this.send({
      type: 'shoot',
      ...bullet,
    });
  }

  public throwGrenade(grenade: Partial<GrenadeData>) {
    this.send({
      type: 'throw_grenade',
      ...grenade,
    });
  }

  public dealDamage(targetId: string, damage: number, weapon: string) {
    this.send({
      type: 'damage_event',
      targetId,
      damage,
      weapon,
    });
  }

  public respawn(x: number, y: number) {
    this.send({
      type: 'respawn',
      x,
      y,
    });
  }

  public sendChat(text: string) {
    this.send({
      type: 'chat_message',
      text,
    });
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.p2pConnections.clear();
  }
}
