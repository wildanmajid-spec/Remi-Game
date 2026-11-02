import React from 'react';
import { Trophy, Flame, ShieldAlert, Award } from 'lucide-react';
import { Player } from '../game/types';
import { WINNING_SCORE } from '../game/remiRules';

interface LeaderboardBarChartProps {
  players: Player[];
  activePlayerIndex: number;
  localPlayerId?: string;
}

export const LeaderboardBarChart: React.FC<LeaderboardBarChartProps> = ({
  players,
  activePlayerIndex,
  localPlayerId = 'p_0',
}) => {
  // Sort players by total score descending
  const sortedPlayers = [...players]
    .map((p, originalIndex) => ({ ...p, originalIndex }))
    .sort((a, b) => b.score - a.score);

  const getRankBadge = (rankIndex: number) => {
    switch (rankIndex) {
      case 0:
        return <span className="text-sm font-black text-amber-300 drop-shadow">🥇</span>;
      case 1:
        return <span className="text-sm font-black text-slate-300 drop-shadow">🥈</span>;
      case 2:
        return <span className="text-sm font-black text-amber-600 drop-shadow">🥉</span>;
      default:
        return (
          <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-full">
            #{rankIndex + 1}
          </span>
        );
    }
  };

  const getBarColor = (rankIndex: number, isWinner: boolean) => {
    if (isWinner) {
      return 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-lg shadow-amber-500/50';
    }
    switch (rankIndex) {
      case 0:
        return 'bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500 shadow-md shadow-emerald-500/30';
      case 1:
        return 'bg-gradient-to-r from-cyan-600 via-cyan-400 to-teal-400';
      case 2:
        return 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500';
      default:
        return 'bg-gradient-to-r from-emerald-700 to-emerald-500';
    }
  };

  return (
    <aside
      aria-label="Leaderboard Grafik Batang"
      className="flex flex-col h-full bg-slate-950/90 border border-emerald-900/40 rounded-xl p-3 shadow-xl backdrop-blur-md overflow-hidden text-slate-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-900/60">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-black tracking-wide text-amber-300 uppercase">
            Grafik Batang Poin
          </h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          Target 1000 Pts
        </span>
      </div>

      {/* Axis Guide */}
      <div className="relative w-full text-[9px] text-slate-500 font-mono flex justify-between px-0.5 mb-1 select-none">
        <span>0</span>
        <span className="text-slate-400">250</span>
        <span className="text-slate-400">500</span>
        <span className="text-slate-400">750</span>
        <span className="text-amber-400 font-bold">1000</span>
      </div>

      {/* Milestone Reference Line Background */}
      <div className="relative flex-1 flex flex-col justify-around gap-2 overflow-y-auto pr-0.5">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 pointer-events-none flex justify-between opacity-15">
          <div className="w-px h-full bg-slate-400" />
          <div className="w-px h-full bg-slate-400" />
          <div className="w-px h-full bg-slate-400" />
          <div className="w-px h-full bg-slate-400" />
          <div className="w-px h-full bg-amber-400" />
        </div>

        {sortedPlayers.map((player, rankIdx) => {
          const isLocal = player.id === localPlayerId;
          const isActive = player.originalIndex === activePlayerIndex;
          const isWinner = player.score >= WINNING_SCORE;
          const safeScore = Math.max(0, player.score);
          const percent = Math.min(100, Math.round((safeScore / WINNING_SCORE) * 100));

          return (
            <div
              key={player.id}
              className={`relative z-10 flex flex-col p-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-emerald-900/30 border border-emerald-500/60 ring-1 ring-emerald-400/30'
                  : isLocal
                  ? 'bg-slate-900/70 border border-slate-700/60'
                  : 'bg-slate-900/40 border border-slate-800/60'
              }`}
            >
              {/* Row Header: Avatar, Name, Rank, Badges */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="shrink-0 flex items-center justify-center">
                    {getRankBadge(rankIdx)}
                  </div>
                  <span className="text-sm shrink-0" role="img" aria-label="avatar">
                    {player.avatar}
                  </span>
                  <div className="flex items-center gap-1 min-w-0">
                    <span
                      className={`text-xs font-bold truncate ${
                        isLocal ? 'text-amber-300 font-black' : 'text-slate-200'
                      }`}
                    >
                      {player.name}
                    </span>
                    {isLocal && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-black shrink-0 border border-amber-500/40">
                        Anda
                      </span>
                    )}
                  </div>
                </div>

                {/* Score digits & Round Delta */}
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  {player.roundScore !== 0 && (
                    <span
                      className={`text-[10px] font-bold tabular-nums ${
                        player.roundScore > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {player.roundScore > 0 ? `+${player.roundScore}` : player.roundScore}
                    </span>
                  )}
                  <span className="text-xs font-black tabular-nums text-white">
                    {player.score}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">pts</span>
                  </span>
                </div>
              </div>

              {/* The Horizontal Bar */}
              <div className="relative w-full h-3.5 bg-slate-950/90 rounded-full overflow-hidden border border-slate-800 p-0.5">
                {/* Fill bar */}
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(
                    rankIdx,
                    isWinner
                  )}`}
                  style={{ width: `${Math.max(4, percent)}%` }}
                />
              </div>

              {/* Foot badges under bar: TAHAN, Dasar 4, Percentage */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                <div className="flex items-center gap-1">
                  {player.isTahan && (
                    <span className="flex items-center gap-0.5 font-bold text-red-300 bg-red-950/80 px-1.5 py-0.2 rounded border border-red-500/60 animate-pulse">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      <span>TAHAN</span>
                    </span>
                  )}
                  {player.hasDasar4 && (
                    <span className="text-emerald-400 font-semibold bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-600/40">
                      Dasar 4 ✓
                    </span>
                  )}
                  {isActive && (
                    <span className="text-amber-400 font-semibold bg-amber-950/60 px-1 py-0.2 rounded border border-amber-600/40">
                      Giliran
                    </span>
                  )}
                </div>
                <span className="font-mono tabular-nums text-slate-400">{percent}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="pt-2 mt-1 border-t border-emerald-900/40 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-amber-400" />
          <span>Capai 1000 Pts Menang</span>
        </span>
        <span className="font-mono text-emerald-400 font-bold">104 Kartu + 4 Joker</span>
      </div>
    </aside>
  );
};
