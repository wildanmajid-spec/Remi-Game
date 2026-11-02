import React from 'react';
import { Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { Card, JokerSuggestion } from '../game/types';
import { CardView } from './CardView';
import { sounds } from '../utils/soundEffects';

interface JokerSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: JokerSuggestion[];
  onApplySuggestion: (suggestion: JokerSuggestion) => void;
}

export const JokerSuggestionsModal: React.FC<JokerSuggestionsModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  onApplySuggestion,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="joker-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-slate-900 border-2 border-purple-500/60 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-900/50 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/60 flex items-center justify-center text-2xl shadow-inner">
              🃏
            </div>
            <div>
              <h2 id="joker-modal-title" className="text-xl sm:text-2xl font-black font-serif text-purple-300">
                Pilihan Substitusi Kartu Joker
              </h2>
              <p className="text-xs text-purple-200/70">
                Joker dapat mengisi semua kartu dan melengkapi pola yang mendekati
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Pilihan Joker"
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {suggestions.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="text-4xl mb-3">🃏</div>
            <h3 className="text-base font-bold text-slate-200 mb-1">
              Belum Ada Pola yang Mendekati
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Kumpulkan minimal 2 kartu angka sama untuk Tris, atau 2 kartu berurutan bunga sama untuk Run, agar Joker dapat melengkapinya.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-purple-300 flex items-center gap-1.5 px-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Ditemukan {suggestions.length} pola yang dapat dibentuk dengan Joker Anda:</span>
            </div>

            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-800/80 border border-purple-500/30 hover:border-purple-400/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        suggestion.type === 'run'
                          ? 'bg-blue-950 text-blue-300 border border-blue-500/50'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      }`}
                    >
                      {suggestion.type === 'run' ? 'Urutan (Run)' : 'Tris'}
                    </span>
                    <h4 className="font-bold text-sm sm:text-base text-white">
                      {suggestion.title}
                    </h4>
                    <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.2 rounded border border-amber-500/40">
                      +{suggestion.points} Poin
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                    {suggestion.description}
                  </p>

                  {/* Cards preview in meld */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {suggestion.allMeldCards.map((c, i) => (
                      <div key={c.id + i} className="scale-90 origin-left -mr-2">
                        <CardView
                          card={c}
                          size="sm"
                          showPoints={false}
                          highlight={c.rank === 'JOKER'}
                        />
                      </div>
                    ))}
                    <div className="pl-4 text-xs font-medium text-purple-300 flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Sebagai <strong>{suggestion.asCardDescription}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playMeldChime();
                    onApplySuggestion(suggestion);
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-900/40 cursor-pointer shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan Pola</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
