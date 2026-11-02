import React from 'react';
import { X, History, Layers } from 'lucide-react';
import { Player } from '../game/types';
import { CardView } from './CardView';

interface DiscardHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  activePlayerIndex: number;
}

export const DiscardHistoryModal: React.FC<DiscardHistoryModalProps> = ({
  isOpen,
  onClose,
  players,
  activePlayerIndex,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-history-title"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-2 border-emerald-500/50 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 id="discard-history-title" className="text-xl sm:text-2xl font-black font-serif text-amber-300">
                Riwayat Buangan Kartu Setiap Pemain
              </h2>
              <p className="text-xs text-slate-400">
                Pantau kartu yang telah dibuang oleh setiap pemain untuk strategi membaca lawan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Riwayat Buangan"
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Players List */}
        <div className="space-y-4">
          {players.map((player, idx) => {
            const discards = player.discardedCards || [];
            const isActive = idx === activePlayerIndex;

            return (
              <div
                key={player.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-400/70 shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/60 border-slate-700/80'
                }`}
              >
                {/* Player Header */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{player.avatar}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm sm:text-base text-white">
                          {player.name}
                        </span>
                        {player.isHuman ? (
                          <span className="text-[10px] bg-emerald-700 text-emerald-100 px-1.5 py-0.2 rounded font-semibold">
                            {idx === 0 ? 'Anda (Host)' : 'Player'}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-medium">
                            Bot
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded animate-pulse">
                            Giliran Aktif
                          </span>
                        )}
                        {player.isTahan && (
                          <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.2 rounded">
                            TAHAN
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Skor Ronde: {player.score} Poin
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-semibold text-amber-300">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{discards.length} kartu dibuang</span>
                  </div>
                </div>

                {/* Discarded Cards Row */}
                {discards.length === 0 ? (
                  <div className="py-2 px-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-500 italic">
                    Belum ada kartu yang dibuang pada ronde ini.
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-thin">
                    {discards.map((card, cIdx) => (
                      <div key={card.id + '_' + cIdx} className="scale-85 origin-left shrink-0 -mr-6">
                        <CardView card={card} size="sm" showPoints={true} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>* Diurutkan dari kartu pertama yang dibuang hingga kartu terbaru.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
