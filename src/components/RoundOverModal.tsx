import React from 'react';
import { Award, Trophy, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';
import { Player, Card } from '../game/types';
import { CardView } from './CardView';
import { calculatePlayerScore } from '../game/remiRules';

interface RoundOverModalProps {
  isOpen: boolean;
  players: Player[];
  winnerId: string | null;
  closingCard: Card | null;
  endReason: 'tutup' | 'stock_empty' | null;
  roundNumber: number;
  onNextRound: () => void;
  onRestartGame: () => void;
}

export const RoundOverModal: React.FC<RoundOverModalProps> = ({
  isOpen,
  players,
  winnerId,
  closingCard,
  endReason,
  roundNumber,
  onNextRound,
  onRestartGame,
}) => {
  if (!isOpen) return null;

  const winner = players.find((p) => p.id === winnerId);

  // Compute breakdown for each player
  const playerBreakdowns = players.map((player) => {
    const isWinner = player.id === winnerId;
    const breakdown = calculatePlayerScore(
      player.hand,
      player.customDasar4CardIds,
      isWinner,
      closingCard
    );
    return {
      player,
      breakdown,
    };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-over-title"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 border-2 border-amber-500/50 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 font-sans">
        {/* Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-3">
            {winner ? <Trophy className="w-8 h-8" /> : <Award className="w-8 h-8" />}
          </div>

          <h2 id="round-over-title" className="text-2xl sm:text-3xl font-black font-serif text-amber-300">
            {winner
              ? `${winner.name} Menutup Kartu (TUTUP)!`
              : 'Ronde Berakhir (Kartu Tengah Habis)'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {winner && closingCard ? (
              <span className="inline-flex items-center gap-1.5 font-medium">
                Berhasil menutup dengan kartu sah:
                <span className="font-bold text-amber-400 bg-slate-800 px-2 py-0.5 rounded border border-amber-500/40">
                  {closingCard.rank} {closingCard.suit.toUpperCase()} (+{closingCard.rank === 'JOKER' ? '250' : '150'} Bonus Poin!)
                </span>
              </span>
            ) : (
              'Semua kartu dihitung berdasarkan kepemilikan Dasar 4 dan kombinasi.'
            )}
          </p>
        </div>

        {/* Players Results Cards */}
        <div className="space-y-3 mb-6">
          {playerBreakdowns.map(({ player, breakdown }) => {
            const isWinner = player.id === winnerId;
            return (
              <div
                key={player.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isWinner
                    ? 'bg-amber-500/10 border-amber-400/80 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-800/60 border-slate-700/80'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{player.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-slate-100">
                          {player.name}
                        </span>
                        {player.isHuman && (
                          <span className="text-[10px] bg-emerald-700 text-emerald-100 px-1.5 py-0.2 rounded font-semibold">
                            Anda
                          </span>
                        )}
                        {isWinner && (
                          <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> PEMENANG
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {breakdown.reason}
                      </span>
                    </div>
                  </div>

                  {/* Score pills */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Ronde Ini
                      </span>
                      <span
                        className={`text-lg font-black tabular-nums ${
                          breakdown.totalPoints >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {breakdown.totalPoints >= 0 ? `+${breakdown.totalPoints}` : breakdown.totalPoints}
                      </span>
                    </div>
                    <div className="text-right pl-3 border-l border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Total Skor
                      </span>
                      <span className="text-lg font-black text-amber-300 tabular-nums">
                        {player.score}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60 text-xs">
                  {breakdown.hasDasar4 ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      ✓ Memiliki Dasar 4 (Kombinasi Plus: +{breakdown.meldPoints}p, Sisa: -{breakdown.deadwoodPoints}p)
                    </span>
                  ) : (
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Tidak Ada Dasar 4 (Semua kartu penalti minus: -{breakdown.deadwoodPoints}p)
                    </span>
                  )}
                </div>

                {/* Hand preview (reveal what everyone held) */}
                <div className="mt-2.5 flex items-center gap-1 overflow-x-auto py-1 scrollbar-thin">
                  {player.hand.map((c) => (
                    <div key={c.id} className="scale-85 origin-left shrink-0 -mr-6">
                      <CardView card={c} size="sm" showPoints={false} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onRestartGame}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Mulai Ulang Game</span>
          </button>

          <button
            type="button"
            data-start="true"
            onClick={onNextRound}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black transition-all cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <span>Ronde Berikutnya (Ronde {roundNumber + 1})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
