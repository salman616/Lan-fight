import React from 'react';
import { Heart, Flame, Shield, Users, Trophy, Volume2, VolumeX, MessageSquare, RefreshCw } from 'lucide-react';
import { KillFeedEntry, MapData, WEAPONS, WeaponKey } from '../types/game';
import { NetworkPlayer } from '../server/gameServer';

interface HUDProps {
  player: NetworkPlayer;
  allPlayers: NetworkPlayer[];
  map: MapData;
  timeRemaining: number;
  killFeed: KillFeedEntry[];
  grenadeCount: number;
  isReloading: boolean;
  onOpenScoreboard: () => void;
  onSwitchWeapon: () => void;
  onReload: () => void;
  soundMuted: boolean;
  onToggleSound: () => void;
  onSendQuickChat: (msg: string) => void;
  ping: number;
  mode: string;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  allPlayers,
  map,
  timeRemaining,
  killFeed,
  grenadeCount,
  isReloading,
  onOpenScoreboard,
  onSwitchWeapon,
  onReload,
  soundMuted,
  onToggleSound,
  onSendQuickChat,
  ping,
  mode,
}) => {
  const currentWeaponDef = WEAPONS[player.weapon as WeaponKey] || WEAPONS.M4_RIFLE;
  const healthPercent = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
  const boostPercent = Math.max(0, Math.min(100, (player.boost / player.maxBoost) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 md:p-5">
      {/* Top Bar: Health/Boost (Left), Timer/Match Status (Center), Kill Feed & Radar (Right) */}
      <div className="flex justify-between items-start gap-4">
        {/* Left: Player Vital Gauges & Minimap */}
        <div className="flex flex-col gap-2.5">
          {/* Health & Boost Gauges */}
          <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md p-3 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col gap-2 w-56 md:w-64">
            {/* Player Tag */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-white/40 shadow-sm"
                  style={{ backgroundColor: player.color }}
                />
                <span className="font-bold text-xs md:text-sm text-slate-100 tracking-wide truncate max-w-[120px]">
                  {player.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                {ping} ms
              </span>
            </div>

            {/* Health Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="flex items-center gap-1 text-rose-400 font-bold">
                  <Heart size={12} className={healthPercent < 30 ? 'animate-ping' : ''} /> HP
                </span>
                <span className="text-slate-300 font-semibold">{Math.ceil(player.health)} / {player.maxHealth}</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    healthPercent > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                      : healthPercent > 25
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-600 to-red-500 animate-pulse'
                  }`}
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>

            {/* Jetpack Fuel Gauge */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Flame size={12} className={player.isBoosting ? 'animate-bounce' : ''} /> JETPACK
                </span>
                <span className="text-slate-300 font-semibold">{Math.ceil(player.boost)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 transition-all duration-75"
                  style={{ width: `${boostPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mini-Radar / Tactical Map */}
          <div className="hidden sm:block pointer-events-auto relative w-44 h-24 bg-slate-950/80 backdrop-blur-md rounded-xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-slate-400 tracking-wider">
              TACTICAL RADAR
            </div>
            {/* Blips */}
            {allPlayers.map((pl) => {
              const nx = (pl.x / map.width) * 100;
              const ny = (pl.y / map.height) * 100;
              const isSelf = pl.id === player.id;
              return (
                <div
                  key={pl.id}
                  className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-sm ${
                    isSelf
                      ? 'bg-emerald-400 ring-2 ring-emerald-300/80 z-10'
                      : pl.isBot
                      ? 'bg-rose-500'
                      : 'bg-cyan-400'
                  }`}
                  style={{ left: `${nx}%`, top: `${ny}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Center: Match Timer, Kills/Deaths Scoreboard Pill */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700/80 shadow-xl flex items-center gap-3">
            <span className="font-mono text-base md:text-lg font-black tracking-widest text-amber-400">
              {formatTime(timeRemaining)}
            </span>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="text-emerald-400">{player.kills} K</span>
              <span className="text-slate-500">/</span>
              <span className="text-rose-400">{player.deaths} D</span>
            </div>
          </div>

          <div className="text-[10px] font-mono tracking-wider text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
            {mode === 'offline_bots' ? 'OFFLINE PRACTICE (BOTS)' : 'LOCAL HOTSPOT MULTIPLAYER'}
          </div>
        </div>

        {/* Right: Kill Feed & Quick Controls */}
        <div className="flex flex-col items-end gap-2 max-w-[200px] md:max-w-[280px]">
          {/* Quick Menu / Audio Buttons */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={onToggleSound}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
              title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {soundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={onOpenScoreboard}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-amber-400 transition-colors flex items-center gap-1 text-xs font-bold"
              title="Scoreboard (Tab)"
            >
              <Trophy size={16} />
              <span className="hidden sm:inline">RANKS</span>
            </button>
          </div>

          {/* Kill Feed Stack */}
          <div className="flex flex-col gap-1 items-end w-full">
            {killFeed.slice(0, 4).map((kf) => (
              <div
                key={kf.id}
                className="bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/90 text-[11px] font-mono flex items-center gap-1.5 shadow-md animate-in fade-in slide-in-from-right duration-200"
              >
                <span className="font-bold text-emerald-400 truncate max-w-[80px]">{kf.killer}</span>
                <span className="text-slate-400 text-[10px]">
                  {kf.weapon === 'RPG' ? '💥 RPG\'d' : kf.weapon === 'SNIPER' ? '🎯 sniped' : '⚡ fragged'}
                </span>
                <span className="font-bold text-rose-400 truncate max-w-[80px]">{kf.victim}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Center: Weapon Arsenal HUD (Desktop & Mobile Visible) */}
      <div className="flex justify-center items-end mb-2">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-4">
          {/* Current Weapon Details */}
          <button
            onClick={onSwitchWeapon}
            className="flex items-center gap-3 text-left hover:opacity-85 transition-opacity"
            title="Click to Switch Weapon"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-inner"
              style={{
                backgroundColor: currentWeaponDef.color + '25',
                color: currentWeaponDef.color,
                border: `1.5px solid ${currentWeaponDef.color}`,
              }}
            >
              {player.weapon === 'RPG' ? 'RPG' : player.weapon === 'SNIPER' ? '50C' : player.weapon === 'SHOTGUN' ? 'SHT' : 'M4'}
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                {currentWeaponDef.name}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-black text-xl md:text-2xl text-slate-100 font-mono">
                  {player.ammo}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ {currentWeaponDef.maxAmmo}</span>
              </div>
            </div>
          </button>

          <div className="h-8 w-px bg-slate-800" />

          {/* Quick Reload / Grenade Status */}
          <div className="flex items-center gap-2">
            <button
              onClick={onReload}
              disabled={isReloading || player.ammo === currentWeaponDef.maxAmmo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-sky-400 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isReloading ? 'RELOADING...' : 'RELOAD (R)'}</span>
            </button>
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
              <span>💣</span>
              <span>{grenadeCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
