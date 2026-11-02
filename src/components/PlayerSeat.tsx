import React from 'react';
import { Player } from '../game/types';
import { CardView } from './CardView';
import { UserPlus, Clock } from 'lucide-react';

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  position?: 'top' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom' | 'bottom-left' | 'bottom-right';
  discardToPlayerName?: string;
  isCurrentTurnUser?: boolean;
  isLocalPlayer?: boolean;
  onInviteClick?: () => void;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isActive,
  discardToPlayerName,
  isLocalPlayer,
  onInviteClick,
}) => {
  // Unoccupied seat in Player mode
  if (!player.isOccupied) {
    return (
      <div
        onClick={onInviteClick}
        className="flex flex-col items-center transition-all duration-200 select-none group cursor-pointer"
        aria-label="Kursi Kosong - Menunggu Pemain"
        title="Klik untuk menyalin kode room"
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-emerald-600/60 group-hover:border-amber-400 bg-emerald-950/40 group-hover:bg-emerald-900/40 flex flex-col items-center justify-center transition-all shadow-md">
          <UserPlus className="w-5 h-5 text-emerald-400/80 group-hover:text-amber-300 group-hover:scale-110 transition-transform" />
        </div>
        <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-emerald-800/60 flex items-center gap-1 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[10px] font-bold text-emerald-300">Kursi Kosong</span>
        </div>
        <span className="text-[9px] text-emerald-400/60 mt-0.5 group-hover:text-amber-300 transition-colors">
          Menunggu Teman...
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center transition-all duration-200 select-none ${
        isActive ? 'scale-105' : 'opacity-90'
      }`}
      aria-label={`Pemain: ${player.name}`}
    >
      {/* Bot or Remote Player Card Fan (Backs) */}
      {(!player.isHuman || !isLocalPlayer) && player.hand.length > 0 && (
        <div className="relative flex items-center justify-center -space-x-8 mb-1.5 h-10 sm:h-14">
          {Array.from({ length: Math.min(player.hand.length, 5) }).map((_, idx) => (
            <div
              key={idx}
              className="transform origin-bottom shadow-sm hidden sm:block"
              style={{
                transform: `rotate(${(idx - 2) * 6}deg) translateY(${Math.abs(idx - 2) * 2}px)`,
              }}
            >
              <CardView card={player.hand[0] || { id: 'x', rank: 'A', suit: 'spade', deckIndex: 0 }} faceUp={false} size="sm" />
            </div>
          ))}
          {/* Mobile single card back stack */}
          <div className="sm:hidden transform shadow-sm">
            <CardView card={player.hand[0] || { id: 'x', rank: 'A', suit: 'spade', deckIndex: 0 }} faceUp={false} size="sm" />
          </div>
          <span className="absolute -bottom-1 -right-2 bg-slate-900/90 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-amber-500/40 tabular-nums z-10">
            {player.hand.length}
          </span>
        </div>
      )}

      {/* Profile Badge */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md transition-all shadow-md ${
          isActive
            ? 'bg-amber-500/20 border-2 border-amber-400 shadow-amber-500/30 ring-2 ring-amber-400/50'
            : 'bg-slate-900/85 border border-slate-700/80'
        }`}
      >
        <span className="text-xl" role="img" aria-label={player.name}>
          {player.avatar}
        </span>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-100 max-w-[80px] truncate">
              {player.name}
            </span>
            {isLocalPlayer ? (
              <span className="text-[9px] bg-emerald-600/90 text-emerald-100 px-1 rounded font-bold">
                Anda
              </span>
            ) : player.isHuman ? (
              <span className="text-[9px] bg-blue-600/90 text-blue-100 px-1 rounded font-bold">
                Player
              </span>
            ) : (
              <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded font-medium">
                Bot
              </span>
            )}
            {player.isTahan && (
              <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded-full border border-red-300 animate-pulse">
                TAHAN ⚠️
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-medium text-amber-300 tabular-nums">
            <span>Skor: {player.score}</span>
          </div>
        </div>

        {isActive && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        )}
      </div>

      {/* Discard arrow clue */}
      {discardToPlayerName && (
        <div className="text-[9px] text-emerald-300/80 mt-0.5 font-medium flex items-center gap-0.5">
          <span>Buang ke ➔ {discardToPlayerName}</span>
        </div>
      )}
    </div>
  );
};

