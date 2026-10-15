import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Wifi,
  Play,
  Users,
  Settings,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  Shield,
  Bot,
  Swords,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import { MAPS } from '../game/mapData';
import { HotspotGuideModal } from './HotspotGuideModal';

interface LobbyProps {
  onStartOfflineBots: (name: string, color: string, avatarIndex: number, mapId: string) => void;
  onHostMatch: (roomName: string, name: string, color: string, avatarIndex: number, mapId: string) => void;
  onJoinMatch: (code: string, name: string, color: string, avatarIndex: number) => void;
  onHostP2P: (name: string, color: string, avatarIndex: number, mapId: string) => void;
  onJoinP2P: (peerId: string, name: string, color: string, avatarIndex: number) => void;
  availableRooms: any[];
  onRefreshRooms: () => void;
  networkIps: string[];
  activeRoomCode?: string;
  isHost?: boolean;
}

const SOLDIER_COLORS = [
  { name: 'Army Green', hex: '#10b981' },
  { name: 'Special Ops Cyan', hex: '#06b6d4' },
  { name: 'Crimson Fury', hex: '#ef4444' },
  { name: 'Desert Camo', hex: '#f59e0b' },
  { name: 'Stealth Black', hex: '#475569' },
  { name: 'Cyber Violet', hex: '#8b5cf6' },
];

const AVATAR_NAMES = ['Tactical Visor', 'Military Beret', 'Gas Mask', 'Heavy Helmet'];

export const Lobby: React.FC<LobbyProps> = ({
  onStartOfflineBots,
  onHostMatch,
  onJoinMatch,
  onHostP2P,
  onJoinP2P,
  availableRooms,
  onRefreshRooms,
  networkIps,
  activeRoomCode,
  isHost,
}) => {
  const [name, setName] = useState('Commander');
  const [color, setColor] = useState('#10b981');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [selectedMap, setSelectedMap] = useState('outpost');
  const [roomNameInput, setRoomNameInput] = useState('Hotspot Arena');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [p2pCodeInput, setP2pCodeInput] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'host' | 'join' | 'p2p'>('quick');
  const [copied, setCopied] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Host address detection
  const primaryIp = networkIps[0] || '192.168.43.1';
  const hostJoinUrl = `http://${primaryIp}:3000`;

  // Draw animated soldier preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 10;
      const bob = Math.sin(time * 3) * 3;

      // Jetpack Thruster Smoke & Flame Particles
      const flameHeight = 12 + Math.sin(time * 12) * 4;
      const grad = ctx.createLinearGradient(cx - 16, cy + bob + 8, cx - 16, cy + bob + 8 + flameHeight);
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(0.5, '#eab308');
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx - 16, cy + bob + 14, 4, flameHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Jetpack Body
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 20, cy + bob - 10, 8, 22);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 20, cy + bob - 10, 8, 22);

      // Soldier Torso
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(cx - 12, cy + bob - 8, 24, 26, 6);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ammo bandolier belt
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 11, cy + bob + 2, 22, 5);

      // Head
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(cx, cy + bob - 20, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx + 4, cy + bob - 20, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Helmet / Visor based on avatarIndex
      if (avatarIndex === 0) {
        // Tactical Blue Visor
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(cx - 2, cy + bob - 23, 14, 6, 2);
        ctx.fill();
        ctx.stroke();
      } else if (avatarIndex === 1) {
        // Red Beret
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(cx - 2, cy + bob - 32, 16, 6, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (avatarIndex === 2) {
        // Cyber Gas Mask
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(cx + 6, cy + bob - 15, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Heavy Armor Helmet
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, cy + bob - 22, 16, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
      }

      // Gun Arm & Rifle
      ctx.save();
      ctx.translate(cx + 4, cy + bob + 2);
      ctx.rotate(0.15 + Math.sin(time * 2) * 0.08);

      // Arm
      ctx.fillStyle = color;
      ctx.fillRect(0, -3, 14, 6);
      ctx.strokeRect(0, -3, 14, 6);

      // Rifle
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, -6, 26, 6);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(14, -7, 12, 3); // Gun accent

      ctx.restore();

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animFrame);
  }, [color, avatarIndex]);

  // Generate QR code for Host IP
  useEffect(() => {
    if (qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        hostJoinUrl,
        {
          width: 140,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#38bdf8',
          },
        },
        (err) => {
          if (err) console.error(err);
        }
      );
    }
  }, [hostJoinUrl, activeTab]);

  const copyHostUrl = () => {
    navigator.clipboard.writeText(hostJoinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Background Military Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-400">
              <Crosshair size={22} />
            </div>
          </div>
          <div>
            <h1 className="font-black text-lg md:text-xl tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Mini Militia 2D
            </h1>
            <p className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">
              Hotspot Wi-Fi Warfare &bull; No Internet Required
            </p>
          </div>
        </div>

        {/* Hotspot Guide Button */}
        <button
          onClick={() => setIsGuideOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all shadow-sm"
        >
          <HelpCircle size={16} />
          <span>হটস্পট গাইড (Hotspot Guide)</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Soldier Customizer & Preview (4 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-2xl flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-black tracking-wider uppercase text-slate-200 flex items-center gap-2">
              <Shield size={16} className="text-cyan-400" />
              Soldier Customizer
            </h2>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              READY
            </span>
          </div>

          {/* Interactive Soldier Avatar Canvas */}
          <div className="relative w-full h-44 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-center overflow-hidden group">
            <div className="absolute inset-0 bg-radial from-cyan-500/10 to-transparent pointer-events-none" />
            <canvas ref={previewCanvasRef} width={200} height={160} className="relative z-10" />
            <div className="absolute bottom-2 text-[10px] font-mono text-slate-500 tracking-wider">
              JETPACK COMBATANT
            </div>
          </div>

          {/* Call-Sign / Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Codename / Soldier Name
            </label>
            <input
              type="text"
              maxLength={15}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter soldier name"
              className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Uniform Armor Color */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Uniform Camo / Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {SOLDIER_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  className={`h-9 rounded-xl transition-all border-2 flex items-center justify-center ${
                    color === c.hex
                      ? 'scale-110 border-white shadow-md shadow-cyan-500/30'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {color === c.hex && <Check size={16} className="text-slate-950 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Headgear / Helmet Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Combat Headgear
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVATAR_NAMES.map((hName, idx) => (
                <button
                  key={idx}
                  onClick={() => setAvatarIndex(idx)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                    avatarIndex === idx
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>{hName}</span>
                  {avatarIndex === idx && <Sparkles size={12} className="text-cyan-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Map Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Battle Arena Map
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(MAPS).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMap(m.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                    selectedMap === m.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">{m.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {m.id === 'outpost' ? 'Bunker & Tunnels' : 'Vertical Platforms'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Modes & Hotspot Discovery (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Tabs */}
          <div className="grid grid-cols-4 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('quick')}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'quick'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot size={15} />
              <span>Offline Bots</span>
            </button>
            <button
              onClick={() => setActiveTab('host')}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'host'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wifi size={15} />
              <span>Host Match</span>
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'join'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={15} />
              <span>Join Match</span>
            </button>
            <button
              onClick={() => setActiveTab('p2p')}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'p2p'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Swords size={15} />
              <span>P2P PeerJS</span>
            </button>
          </div>

          {/* TAB 1: Offline / Practice with Bots */}
          {activeTab === 'quick' && (
            <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-2xl flex flex-col gap-6 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-100 uppercase tracking-wide">
                    Single Player & Practice Mode
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Play immediately with 4 smart Mini Militia combat bots. Test jetpacks, rocket launchers, and sniper rifles!
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                  <Bot size={24} />
                </div>
              </div>

              {/* Bot roster preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'Sarge', role: 'Heavy Gunner', weapon: 'RPG', color: '#ef4444' },
                  { name: 'Ghost', role: 'Sniper Scout', weapon: 'SNIPER', color: '#38bdf8' },
                  { name: 'Viper', role: 'Assault Specialist', weapon: 'M4', color: '#10b981' },
                  { name: 'Rex', role: 'Breacher', weapon: 'SHOTGUN', color: '#f59e0b' },
                ].map((bot) => (
                  <div
                    key={bot.name}
                    className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bot.color }} />
                      <span className="font-bold text-xs text-slate-200">{bot.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{bot.role}</span>
                    <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40 w-fit">
                      {bot.weapon}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onStartOfflineBots(name, color, avatarIndex, selectedMap)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-green-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-base uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
              >
                <Play size={20} className="fill-slate-950" />
                <span>Launch Practice Combat (Solo / Bots)</span>
              </button>
            </div>
          )}

          {/* TAB 2: Host Hotspot Match */}
          {activeTab === 'host' && (
            <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-100 uppercase tracking-wide">
                    Host Local Wi-Fi Match
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Turn your device into the local match server. Other players on your hotspot can scan or join.
                  </p>
                </div>
                <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
                  <Wifi size={24} />
                </div>
              </div>

              {/* Host Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Match Name</label>
                  <input
                    type="text"
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Local Hotspot Address</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-400 truncate">
                      {hostJoinUrl}
                    </div>
                    <button
                      onClick={copyHostUrl}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Address"
                    >
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Instant QR Code Box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 shadow-inner">
                  <canvas ref={qrCanvasRef} width={130} height={130} className="rounded-lg" />
                </div>
                <div className="flex flex-col gap-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-cyan-400">
                    <QrCode size={16} />
                    <span>Scan to Join Instantly</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Friends connected to your mobile hotspot can open their phone camera and scan this code to join this battlefield immediately!
                  </p>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    Local IP: <span className="text-slate-300">{primaryIp}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onHostMatch(roomNameInput, name, color, avatarIndex, selectedMap)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-base uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
              >
                <Play size={20} className="fill-slate-950" />
                <span>Start & Host Match</span>
              </button>
            </div>
          )}

          {/* TAB 3: Join Local Hotspot Match */}
          {activeTab === 'join' && (
            <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-100 uppercase tracking-wide">
                    Join Match on Hotspot
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Connect to your friend's hosted battle room over Wi-Fi.
                  </p>
                </div>
                <button
                  onClick={onRefreshRooms}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
                >
                  <RefreshCw size={14} />
                  <span>Scan Rooms</span>
                </button>
              </div>

              {/* Direct Code Entry */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter 5-character Room Code (e.g. ALPHA)"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-widest text-slate-100 focus:outline-none focus:border-cyan-500 uppercase"
                />
                <button
                  onClick={() => onJoinMatch(joinCodeInput, name, color, avatarIndex)}
                  disabled={!joinCodeInput.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-sm uppercase tracking-wider shadow-md disabled:opacity-40 transition-transform active:scale-95"
                >
                  Join Room
                </button>
              </div>

              {/* Available Rooms List */}
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Hotspot Rooms Found ({availableRooms.length})
                </div>

                {availableRooms.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center flex flex-col items-center justify-center gap-2">
                    <Wifi size={28} className="text-slate-600 animate-pulse" />
                    <p className="text-xs text-slate-400">
                      No active rooms detected yet.
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm">
                      Make sure you are connected to the Host's Mobile Hotspot Wi-Fi, or have the host click "Host Match".
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {availableRooms.map((room) => (
                      <div
                        key={room.code}
                        className="bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-3.5 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-100">{room.name}</div>
                          <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-2 mt-0.5">
                            <span>Code: {room.code}</span>
                            <span>&bull;</span>
                            <span>{room.playerCount} / {room.maxPlayers} Players</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onJoinMatch(room.code, name, color, avatarIndex)}
                          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: P2P PeerJS Direct Connection */}
          {activeTab === 'p2p' && (
            <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-100 uppercase tracking-wide">
                    Direct P2P Match (PeerJS WebRTC)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Connect two browsers directly peer-to-peer using local WebRTC DataChannels.
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                  <Swords size={24} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Host P2P */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-amber-400">Host as Peer</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Generates a unique peer ID for direct browser-to-browser connection.
                    </p>
                  </div>
                  <button
                    onClick={() => onHostP2P(name, color, avatarIndex, selectedMap)}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase"
                  >
                    Host P2P Session
                  </button>
                </div>

                {/* Join P2P */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-cyan-400">Join Host Peer</h4>
                    <input
                      type="text"
                      value={p2pCodeInput}
                      onChange={(e) => setP2pCodeInput(e.target.value)}
                      placeholder="Paste Host Peer ID"
                      className="w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    onClick={() => onJoinP2P(p2pCodeInput, name, color, avatarIndex)}
                    disabled={!p2pCodeInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase disabled:opacity-40"
                  >
                    Connect P2P
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Controls Reminder Bar */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-4">
              <span><strong>PC:</strong> WASD / Space = Move/Jetpack</span>
              <span><strong>Mouse:</strong> 360° Aim & Fire</span>
              <span><strong>G:</strong> Grenade</span>
              <span><strong>F:</strong> Melee</span>
              <span><strong>R:</strong> Reload</span>
            </div>
            <div className="text-cyan-400 font-bold">
              📱 Mobile: Dual Virtual Joysticks
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-3 border-t border-slate-900 text-center text-xs text-slate-500 font-mono">
        Mini Militia 2D Local Hotspot Warfare &bull; Built for High-Octane LAN Battles &bull; No Internet Required
      </footer>

      {/* Hotspot Guide Modal */}
      <HotspotGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        hostIp={`${primaryIp}:3000`}
      />
    </div>
  );
};
