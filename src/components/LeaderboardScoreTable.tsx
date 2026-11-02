import React from 'react';
import { Award, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { Player } from '../game/types';
import { WINNING_SCORE } from '../game/remiRules';

interface LeaderboardScoreTableProps {
  players: Player[];
  activePlayerIndex: number;
  localPlayerId?: string;
  roundNumber: number;
}

export const LeaderboardScoreTable: React.FC<LeaderboardScoreTableProps> = ({
  players,
  activePlayerIndex,
  localPlayerId = 'p_0',
  roundNumber,
}) => {
  // Sort players by total score descending
  const sortedPlayers = [...players]
    .map((p, originalIndex) => ({ ...p, originalIndex }))
    .sort((a, b) => b.score - a.score);

  return (
    <div
      aria-label="Leaderboard Tabel Skor"
      className="flex flex-col bg-slate-950/90 border border-emerald-900/40 rounded-xl p-3 shadow-xl backdrop-blur-md text-slate-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-900/60">
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-black tracking-wide text-emerald-300 uppercase">
            Tabel Skor Peringkat
          </h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60">
          Ronde {roundNumber}
        </span>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-1.5 px-1 text-center w-8">Pos</th>
              <th className="py-1.5 px-2">Pemain</th>
              <th className="py-1.5 px-1.5 text-right">Ronde</th>
              <th className="py-1.5 px-2 text-right">Total</th>
              <th className="py-1.5 px-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedPlayers.map((player, rankIdx) => {
              const isLocal = player.id === localPlayerId;
              const isActive = player.originalIndex === activePlayerIndex;
              const isGrandWinner = player.score >= WINNING_SCORE;

              return (
                <tr
                  key={player.id}
                  className={`transition-colors ${
                    isActive
                      ? 'bg-emerald-950/60 font-semibold'
                      : isLocal
                      ? 'bg-slate-900/60'
                      : 'hover:bg-slate-900/30'
                  }`}
                >
                  {/* Pos */}
                  <td className="py-2 px-1 text-center font-black">
                    {rankIdx === 0 ? (
                      <span className="text-amber-400 text-sm">🥇</span>
                    ) : rankIdx === 1 ? (
                      <span className="text-slate-300 text-sm">🥈</span>
                    ) : rankIdx === 2 ? (
                      <span className="text-amber-600 text-sm">🥉</span>
                    ) : (
                      <span className="text-slate-500 font-mono text-[11px]">#{rankIdx + 1}</span>
                    )}
                  </td>

                  {/* Pemain */}
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm shrink-0" role="img" aria-label="avatar">
                        {player.avatar}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className={`truncate text-xs ${
                              isLocal ? 'text-amber-300 font-black' : 'text-slate-200'
                            }`}
                          >
                            {player.name}
                          </span>
                          {isLocal && (
                            <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-black border border-amber-500/40">
                              Anda
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <span className="text-[9px] text-emerald-400 font-medium">
                            Giliran aktif
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Ronde */}
                  <td className="py-2 px-1.5 text-right font-mono text-xs tabular-nums">
                    {player.roundScore > 0 ? (
                      <span className="text-emerald-400 font-bold">+{player.roundScore}</span>
                    ) : player.roundScore < 0 ? (
                      <span className="text-red-400 font-bold">{player.roundScore}</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>

                  {/* Total */}
                  <td className="py-2 px-2 text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-black font-mono text-xs tabular-nums ${
                          isGrandWinner
                            ? 'text-amber-300 underline decoration-amber-400 animate-pulse'
                            : player.score >= 0
                            ? 'text-white'
                            : 'text-red-400'
                        }`}
                      >
                        {player.score}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {Math.min(100, Math.round((Math.max(0, player.score) / WINNING_SCORE) * 100))}%
                      </span>
                    </div>
                  </td>

                  {/* Status Badges */}
                  <td className="py-2 px-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {player.isTahan && (
                        <span
                          title="Pemain telah mengaktifkan TAHAN!"
                          className="p-1 rounded bg-red-950 text-red-300 border border-red-500/60 animate-pulse"
                        >
                          <ShieldAlert className="w-3 h-3 text-red-400" />
                        </span>
                      )}
                      {player.hasDasar4 && (
                        <span
                          title="Dasar 4 terpenuhi"
                          className="p-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        </span>
                      )}
                      {isGrandWinner && (
                        <span
                          title="Pemenang Game (>=1000 Poin)!"
                          className="p-1 rounded bg-amber-500 text-slate-950 font-black text-[9px]"
                        >
                          WIN
                        </span>
                      )}
                      {!player.isTahan && !player.hasDasar4 && !isGrandWinner && (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info footer */}
      <div className="pt-2 mt-2 border-t border-slate-800 text-[9px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Pemenang: 1000 Poin</span>
        </span>
        <span className="text-slate-500">Reset Meja jika menang</span>
      </div>
    </div>
  );
};
