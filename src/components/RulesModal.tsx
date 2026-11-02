import React from 'react';
import { X, BookOpen, AlertCircle, CheckCircle2, Award, Shuffle, Sparkles, Trophy } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl p-6 text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="rules-modal-title" className="text-xl font-bold font-serif text-amber-300">
                Peraturan Permainan REMI
              </h2>
              <p className="text-xs text-slate-400">Panduan lengkap aturan resmi Remi Tradisional & Jackpot</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Peraturan"
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rules List */}
        <div className="space-y-4 text-sm text-slate-200">
          {/* Rule 1 */}
          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 flex gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
              1
            </span>
            <div>
              <h4 className="font-bold text-amber-300 mb-1">Set Kartu (104 Standar + 4 Joker = 108 Kartu) & Jackpot</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Menggunakan <strong>2 set kartu remi standar (104 kartu) + 4 kartu Joker</strong> (Total 108 kartu). Setiap pemain (4 sampai 6 orang) dibagikan <strong>13 kartu</strong>. Sisa kartu diletakkan di tengah sebagai tumpukan pengambilan (Stock Pile).
              </p>
              <div className="mt-2 p-2 rounded-lg bg-purple-950/60 border border-purple-500/40 text-xs text-purple-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Jackpot 4 Joker (1000 Poin)</strong>: Jika pemain berhasil mengumpulkan <strong>4 kartu Joker lengkap</strong> di tangannya, langsung mendapatkan <strong>1000 poin</strong> dan memenangkan permainan!</span>
              </div>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 flex gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
              2
            </span>
            <div>
              <h4 className="font-bold text-amber-300 mb-1">Giliran Ambil, Buang ke Kanan & Riwayat Buangan</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pemain secara bergiliran mengambil 1 kartu (bisa dari tumpukan tengah atau kartu buangan terakhir dari lawan di sebelah kiri), lalu wajib membuang 1 kartu ke <strong>lawan di sebelah kanannya</strong>. Pemain dapat membuka menu <strong>Riwayat Buangan</strong> untuk memantau kartu yang telah dibuang oleh setiap pemain.
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
              3
            </span>
            <div>
              <h4 className="font-bold text-emerald-300 mb-1">Syarat Wajib "Dasar 4" & Bantuan Substitusi Joker</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tujuan utama adalah menyusun kombinasi kartu:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-300 mt-1.5 space-y-1">
                <li>
                  <strong className="text-emerald-400">Dasar 4 (Wajib Paling Utama)</strong>: Minimal <strong>4 kartu berurutan bunga sama murni tanpa Joker</strong> (contoh: 4♥-5♥-6♥-7♥ atau A♠-2♠-3♠-4♠).
                </li>
                <li>
                  <strong>Urutan 3+</strong>: 3 atau lebih kartu berurutan bunga sama.
                </li>
                <li>
                  <strong>Tris</strong>: 3 atau 4 kartu angka sama dengan bunga berbeda (contoh: 7♠-7♥-7♦).
                </li>
                <li>
                  <strong className="text-purple-300">Joker Pengisi Semua Kartu</strong>: Joker dapat mengisi semua kartu dan membentuk pola yang diinginkan. Tekan tombol <strong>🃏 Pola Joker</strong> untuk melihat daftar pilihan pola yang mendekati dari kartu yang Anda miliki!
                </li>
              </ul>
            </div>
          </div>

          {/* Rule 4 */}
          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 flex gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
              4
            </span>
            <div>
              <h4 className="font-bold text-amber-300 mb-1">Sistem Perhitungan Poin Kartu</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                <div className="p-2 rounded bg-slate-900/90 border border-slate-700 text-center">
                  <span className="text-slate-400 block text-[10px]">Angka 2 - 10</span>
                  <span className="font-bold text-base text-amber-400">5 Poin</span>
                </div>
                <div className="p-2 rounded bg-slate-900/90 border border-slate-700 text-center">
                  <span className="text-slate-400 block text-[10px]">Jack, Queen, King</span>
                  <span className="font-bold text-base text-amber-400">10 Poin</span>
                </div>
                <div className="p-2 rounded bg-slate-900/90 border border-slate-700 text-center">
                  <span className="text-slate-400 block text-[10px]">Kartu Ace (A)</span>
                  <span className="font-bold text-base text-amber-400">15 Poin</span>
                  <span className="text-[9px] text-amber-300/80 block mt-0.5">(5 poin jika A-2-3-4)</span>
                </div>
                <div className="p-2 rounded bg-slate-900/90 border border-slate-700 text-center">
                  <span className="text-slate-400 block text-[10px]">Kartu Joker</span>
                  <span className="font-bold text-base text-purple-400">25 Poin</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 5 */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
              5
            </span>
            <div>
              <h4 className="font-bold text-amber-300 mb-1">Poin Kartu Penutup Tertinggi & Syarat Menutup</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-1.5">
                Pemain dapat menutup kartu jika 13 kartunya telah tersusun dalam kombinasi sah (termasuk Dasar 4), dan <strong>kartu penutup ke-14 WAJIB Ace atau Joker</strong>.
              </p>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                <li>
                  <strong className="text-amber-400">Poin Langsung Nilai Tertinggi</strong>: Kartu penutup <strong>tidak dihitung lagi poin dasarnya</strong>, melainkan langsung mendapat nilai tertinggi kartu tersebut: <strong>+150 poin untuk Ace</strong> dan <strong>+250 poin untuk Joker</strong>!
                </li>
                <li>
                  <strong className="text-red-400">Tombol Tahan</strong>: Wajib mengaktifkan tombol TAHAN saat bersiap menutup untuk mengunci lawan.
                </li>
              </ul>
            </div>
          </div>

          {/* Rule 6 */}
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 flex gap-3">
            <span className="w-6 h-6 rounded-full bg-red-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
              6
            </span>
            <div>
              <h4 className="font-bold text-red-300 mb-1">Kocok Ulang 6 Orang & Pemenang 1000 Poin</h4>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                <li>
                  <strong className="text-emerald-400">Kocok Ulang Meja 6 Orang</strong>: Pada permainan 6 orang, jika kartu tengah habis, tumpukan pengambilan <strong>otomatis dikocok ulang (reshuffle)</strong> dari seluruh riwayat kartu buangan.
                </li>
                <li>
                  <strong className="text-amber-400">Target Kemenangan 1000 Poin</strong>: Poin untuk pemenang utama game adalah <strong>1000 poin</strong>. Jika ada pemain yang mencapai 1000 poin, permainan <strong>langsung berakhir</strong> dan pemain harus <strong>membuat room baru</strong>.
                </li>
                <li>
                  <strong className="text-red-400">Penalti Tanpa Dasar 4</strong>: Pemain yang tidak memiliki Dasar 4 saat ronde berakhir dikenakan nilai <strong>minus seluruh kartu di tangannya</strong>.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer transition-colors shadow-lg shadow-amber-500/20"
          >
            Mengerti, Lanjutkan Permainan
          </button>
        </div>
      </div>
    </div>
  );
};
