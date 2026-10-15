import React from 'react';
import { Trophy, X, Shield, Skull, Target, Wifi } from 'lucide-react';
import { NetworkPlayer } from '../server/gameServer';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: NetworkPlayer[];
  selfId: string;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  isOpen,
  onClose,
  players,
  selfId,
}) => {
  if (!isOpen) return null;

  const sortedPlayers = [...players].sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    return a.deaths - b.deaths;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 tracking-wide uppercase">
                Combat Leaderboard
              </h2>
              <p className="text-xs text-slate-400">Match kills, deaths, and network latency</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Player Table */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-xs uppercase tracking-wider">
                <th className="pb-3 pl-2">Rank</th>
                <th className="pb-3">Soldier</th>
                <th className="pb-3 text-center">Kills</th>
                <th className="pb-3 text-center">Deaths</th>
                <th className="pb-3 text-center">K/D</th>
                <th className="pb-3 text-right pr-2">Ping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sortedPlayers.map((pl, idx) => {
                const isSelf = pl.id === selfId;
                const kd = pl.deaths === 0 ? pl.kills.toFixed(1) : (pl.kills / pl.deaths).toFixed(1);

                return (
                  <tr
                    key={pl.id}
                    className={`transition-colors ${
                      isSelf ? 'bg-cyan-950/30 font-bold' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3.5 pl-2 text-slate-400">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </td>
                    <td className="py-3.5 flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full ring-2 ring-white/30"
                        style={{ backgroundColor: pl.color }}
                      />
                      <span className={`truncate max-w-[150px] ${isSelf ? 'text-cyan-300' : 'text-slate-200'}`}>
                        {pl.name}
                      </span>
                      {pl.isBot && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                          BOT
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] bg-cyan-900/60 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-700/50">
                          YOU
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-center text-emerald-400 font-bold">
                      {pl.kills}
                    </td>
                    <td className="py-3.5 text-center text-rose-400">
                      {pl.deaths}
                    </td>
                    <td className="py-3.5 text-center text-amber-400">
                      {kd}
                    </td>
                    <td className="py-3.5 text-right pr-2 text-xs text-slate-400">
                      {pl.isBot ? '5 ms' : `${pl.ping || 12} ms`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/70 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 font-mono">
          <span>Press [TAB] or tap button to toggle</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans font-bold rounded-xl transition-colors"
          >
            Back to Combat
          </button>
        </div>
      </div>
    </div>
  );
};
