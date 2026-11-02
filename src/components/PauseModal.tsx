import React from 'react';
import { Play, RotateCcw, Home, BookOpen, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onBackToTitle: () => void;
  onOpenRules: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onBackToTitle,
  onOpenRules,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 text-center text-slate-100 shadow-2xl font-sans">
        <h2 id="pause-modal-title" className="text-2xl font-black font-serif text-amber-300 mb-1">
          Permainan Dijeda
        </h2>
        <p className="text-xs text-slate-400 mb-6">Pilih aksi untuk melanjutkan permainan Remi</p>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-amber-500/20"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Lanjutkan (Resume)</span>
          </button>

          <button
            type="button"
            onClick={onOpenRules}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
            <span>Peraturan Remi</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ulang Ronde Ini</span>
          </button>

          <button
            type="button"
            onClick={onBackToTitle}
            className="w-full py-2.5 rounded-xl bg-slate-800/60 hover:bg-red-950/40 text-slate-400 hover:text-red-300 text-sm font-semibold border border-slate-700/60 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Menu Utama</span>
          </button>
        </div>
      </div>
    </div>
  );
};
