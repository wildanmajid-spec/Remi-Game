import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  Volume2,
  VolumeX,
  LogIn,
  LogOut,
  Wifi,
  Loader2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { sounds } from '../utils/soundEffects';
import { GameMode } from '../game/types';

interface TitleScreenProps {
  playerCount: 4 | 5 | 6;
  onSelectPlayerCount: (count: 4 | 5 | 6) => void;
  onStartGame: (playerName: string, count: 4 | 5 | 6, roomCode?: string, mode?: GameMode) => void;
  onJoinRoom: (playerName: string, roomCode: string, mode?: GameMode) => void;
  onOpenRules: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  initialGameMode?: GameMode;
  currentUser?: User | null;
  onLoginWithGoogle?: () => Promise<void>;
  onLogout?: () => Promise<void>;
  isOnlineReady?: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  playerCount,
  onSelectPlayerCount,
  onStartGame,
  onJoinRoom,
  onOpenRules,
  isMuted,
  onToggleMute,
  initialGameMode = 'bot',
  currentUser = null,
  onLoginWithGoogle,
  onLogout,
  isOnlineReady = true,
}) => {
  const [playerName, setPlayerName] = useState(
    currentUser?.displayName || 'Sari'
  );
  const [gameMode, setGameMode] = useState<GameMode>(initialGameMode);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (currentUser?.displayName) {
      setPlayerName(currentUser.displayName);
    }
  }, [currentUser]);

  const generateRoomCode = (count: number) => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `REMI-${count}${randomLetter}${randomNum}`;
  };

  const handleCreateRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sounds.playCardSnap();
    let finalName = playerName.trim() || currentUser?.displayName || 'Sari';

    // If choosing player mode and not logged in, prompt Google Login
    if (gameMode === 'player' && !currentUser && onLoginWithGoogle) {
      try {
        setIsAuthenticating(true);
        await onLoginWithGoogle();
      } catch (err: any) {
        setIsAuthenticating(false);
        setErrorMsg('Login Google diperlukan untuk bermain online antar-perangkat.');
        return;
      }
      setIsAuthenticating(false);
    }

    const newRoomCode = generateRoomCode(playerCount);
    onStartGame(finalName, playerCount, newRoomCode, gameMode);
  };

  const handleJoinWithCode = async (codeToJoin?: string) => {
    const targetCode = (codeToJoin || roomCodeInput).trim().toUpperCase();
    if (!targetCode) {
      setErrorMsg('Masukkan kode room terlebih dahulu');
      return;
    }
    setErrorMsg(null);
    sounds.playCardSnap();

    // In online join, prompt login if not authenticated
    if (!currentUser && onLoginWithGoogle) {
      try {
        setIsAuthenticating(true);
        await onLoginWithGoogle();
      } catch (err) {
        setIsAuthenticating(false);
        setErrorMsg('Login Google diperlukan untuk bergabung ke room online.');
        return;
      }
      setIsAuthenticating(false);
    }

    const finalName = playerName.trim() || currentUser?.displayName || 'Pemain';
    onJoinRoom(finalName, targetCode, 'player');
  };

  return (
    <div className="relative w-full h-screen bg-[#040f0c] overflow-hidden flex flex-col justify-between items-center text-slate-100 p-4 sm:p-6 select-none font-sans">
      {/* Background radial gradient & casino felt texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#07241c] via-[#051712] to-[#020a08] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Ambient background suits */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <span className="absolute top-12 left-12 text-9xl font-serif">♠</span>
        <span className="absolute top-24 right-20 text-9xl font-serif text-red-500">♥</span>
        <span className="absolute bottom-20 left-20 text-9xl font-serif text-red-500">♦</span>
        <span className="absolute bottom-16 right-24 text-9xl font-serif">♣</span>
      </div>

      {/* Top Header Utilities */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 font-serif font-black text-sm">
            R
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400/80">
            Remi Indonesia
          </span>
          {/* Firebase Online status badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#051a14] border border-emerald-800/60 text-[10px] text-emerald-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Firebase Realtime</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Auth State Badge / Button */}
          {currentUser ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#07241c] border border-emerald-700/60 shadow-sm">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-5 h-5 rounded-full border border-amber-400/50 object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {(currentUser.displayName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-emerald-200 max-w-[100px] sm:max-w-[130px] truncate">
                {currentUser.displayName || currentUser.email}
              </span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Keluar akun"
                  className="text-emerald-400 hover:text-rose-300 transition-colors cursor-pointer ml-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : onLoginWithGoogle ? (
            <button
              type="button"
              disabled={isAuthenticating}
              onClick={async () => {
                try {
                  setIsAuthenticating(true);
                  await onLoginWithGoogle();
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsAuthenticating(false);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 text-xs font-semibold text-emerald-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {isAuthenticating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Masuk Google</span>
            </button>
          ) : null}

          {/* Top-right "4-6 pemain realtime" status badge */}
          <div className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-medium text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>4–6 pemain realtime</span>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Aktifkan Suara' : 'Matikan Suara'}
            className="w-8 h-8 rounded-lg bg-[#07221a]/80 hover:bg-[#0c3328] border border-emerald-900/60 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="relative z-10 my-auto w-full flex justify-center py-2">
        <div className="w-full max-w-[440px] sm:max-w-[460px] bg-[#061e18] border border-[#11382d] rounded-[26px] p-6 sm:p-8 shadow-2xl shadow-black/90">
          {/* Top row: Label & Users Icon */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold tracking-wider text-[#d4af37] uppercase">
              MULAI PERMAINAN
            </span>
            <Users className="w-6 h-6 text-[#2ec4b6] stroke-[1.75]" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-4">
            BUKA MEJA BARU
          </h1>

          {/* Form */}
          <form onSubmit={handleCreateRoom} className="space-y-4">
            {/* Field 0: Mode Permainan (Bot vs Player) */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-emerald-300/80 uppercase mb-1.5">
                MODE PERMAINAN
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playCardFlip();
                    setGameMode('bot');
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    gameMode === 'bot'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/50'
                      : 'bg-[#041511] text-emerald-400/70 border-emerald-900/70 hover:bg-[#07251d] hover:text-emerald-200'
                  }`}
                >
                  <span>🤖 Lawan Bot</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playCardFlip();
                    setGameMode('player');
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    gameMode === 'player'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-950/50'
                      : 'bg-[#041511] text-emerald-400/70 border-emerald-900/70 hover:bg-[#07251d] hover:text-emerald-200'
                  }`}
                >
                  <span>👥 Lawan Player</span>
                </button>
              </div>
            </div>

            {/* Field 1: Nama Pemain */}
            <div>
              <label
                htmlFor="player-name-input"
                className="block text-[11px] font-bold tracking-wider text-emerald-300/80 uppercase mb-1.5"
              >
                NAMA PEMAIN
              </label>
              <input
                id="player-name-input"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="contoh: Sari"
                maxLength={20}
                className="w-full bg-[#041511] border border-emerald-900/70 rounded-xl px-4 py-3 text-white placeholder-emerald-800/80 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            {/* Field 2: Maks. Pemain */}
            <div>
              <label
                htmlFor="max-player-select"
                className="block text-[11px] font-bold tracking-wider text-emerald-300/80 uppercase mb-1.5"
              >
                MAKS. PEMAIN
              </label>
              <div className="relative">
                <select
                  id="max-player-select"
                  value={playerCount}
                  onChange={(e) => {
                    const count = Number(e.target.value) as 4 | 5 | 6;
                    sounds.playCardFlip();
                    onSelectPlayerCount(count);
                  }}
                  className="w-full bg-[#041511] border border-emerald-900/70 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer pr-10"
                >
                  <option value={4} className="bg-[#061e18] text-white">
                    4 pemain
                  </option>
                  <option value={5} className="bg-[#061e18] text-white">
                    5 pemain
                  </option>
                  <option value={6} className="bg-[#061e18] text-white">
                    6 pemain
                  </option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400/80">
                  <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Description Text with Firebase details */}
            <p className="text-xs text-emerald-400/60 leading-relaxed pt-0.5 pb-1">
              {gameMode === 'player'
                ? 'Mode Lawan Player (Firebase Online): Meja disinkronkan langsung via database online. Bagikan kode room ke teman untuk bermain bersama dari perangkat mana saja.'
                : 'Mode Lawan Bot: Meja diisi bot otomatis sehingga Anda bisa langsung bermain latihan. Di meja 6 orang, buangan bisa dikocok ulang sekali saat kartu tengah habis.'}
            </p>

            {/* Action CTA: Buka meja baru */}
            <button
              type="submit"
              data-start="true"
              disabled={isAuthenticating}
              className="w-full bg-[#876e15] hover:bg-[#9d811b] active:scale-[0.98] text-[#061e18] font-black py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md text-sm sm:text-base tracking-wide"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Menyiapkan Akun...</span>
                </>
              ) : (
                <>
                  <span>{gameMode === 'player' ? 'Buka meja player online baru' : 'Buka meja baru'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Divider: ATAU MASUK DENGAN KODE */}
          <div className="flex items-center my-5">
            <div className="flex-1 h-px bg-emerald-900/50" />
            <span className="px-3 text-[10px] font-bold tracking-widest text-emerald-500/60 uppercase">
              ATAU MASUK DENGAN KODE
            </span>
            <div className="flex-1 h-px bg-emerald-900/50" />
          </div>

          {/* Room Code Entry */}
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => {
                setRoomCodeInput(e.target.value.toUpperCase());
                if (errorMsg) setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleJoinWithCode();
                }
              }}
              placeholder="K O D E   R O O M"
              maxLength={15}
              className="flex-1 min-w-0 bg-[#041511] border border-emerald-900/70 rounded-xl px-4 py-3 text-white placeholder-emerald-800/80 font-mono tracking-widest text-xs sm:text-sm uppercase focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
            <button
              type="button"
              disabled={isAuthenticating}
              onClick={() => handleJoinWithCode()}
              className="bg-[#0a2720] hover:bg-[#11352c] border border-emerald-800/80 text-emerald-200 hover:text-white font-bold px-5 sm:px-6 py-3 rounded-xl transition-colors cursor-pointer text-sm shrink-0 active:scale-95"
            >
              {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Masuk'}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 mt-2 text-center bg-rose-950/40 p-2 rounded-lg border border-rose-800/60">
              {errorMsg}
            </p>
          )}

          {/* Quick Room Suggestions */}
          <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-emerald-400/50">
            <span>Contoh room:</span>
            {[
              { code: 'REMI-482', label: '4P' },
              { code: 'REMI-590', label: '5P' },
              { code: 'REMI-614', label: '6P' },
            ].map((room) => (
              <button
                key={room.code}
                type="button"
                onClick={() => {
                  setRoomCodeInput(room.code);
                  handleJoinWithCode(room.code);
                }}
                className="px-2 py-0.5 rounded-md bg-[#051914] hover:bg-emerald-900/50 border border-emerald-900/40 text-emerald-300 font-mono text-[10px] cursor-pointer transition-colors"
              >
                {room.code} ({room.label})
              </button>
            ))}
          </div>

          {/* Bottom link: Lihat ringkasan aturan */}
          <div className="mt-5 pt-1">
            <button
              type="button"
              onClick={onOpenRules}
              className="flex items-center gap-2 text-xs text-emerald-400/70 hover:text-emerald-300 cursor-pointer transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400/70" />
              <span>Lihat ringkasan aturan</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer hint */}
      <footer className="relative z-10 w-full text-center text-xs text-emerald-500/50 font-mono tracking-tight pb-1">
        Pilih 4–6 pemain · Buka meja baru atau masukkan kode room bersama teman di perangkat lain
      </footer>
    </div>
  );
};
