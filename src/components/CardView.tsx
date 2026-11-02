import React from 'react';
import { Card, Suit } from '../game/types';
import { getCardBasePoint } from '../game/remiRules';

interface CardViewProps {
  card: Card;
  faceUp?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
  inDasar4?: boolean;
  meldType?: 'dasar4' | 'run' | 'tris' | 'fourhand' | null;
  isClosingCandidate?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  faceUp = true,
  isSelected = false,
  onClick,
  disabled = false,
  highlight = false,
  size = 'md',
  showPoints = true,
  inDasar4 = false,
  meldType = null,
  isClosingCandidate = false,
  draggable = false,
  onDragStart,
  onDragEnd,
}) => {
  const isRed = card.suit === 'heart' || card.suit === 'diamond';
  const isJoker = card.rank === 'JOKER';

  const suitSymbol = (s: Suit) => {
    switch (s) {
      case 'spade':
        return '♠';
      case 'heart':
        return '♥';
      case 'diamond':
        return '♦';
      case 'club':
        return '♣';
      case 'joker':
        return '★';
    }
  };

  const dimensions = {
    sm: 'w-12 h-18 text-xs',
    md: 'w-16 sm:w-18 h-24 sm:h-28 text-sm',
    lg: 'w-22 h-32 text-base',
  }[size];

  if (!faceUp) {
    return (
      <div
        className={`${dimensions} rounded-xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 border-2 border-amber-500/40 shadow-md flex items-center justify-center select-none relative overflow-hidden`}
        aria-label="Tutup Kartu"
      >
        <div className="absolute inset-1 rounded-lg border border-amber-500/20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:6px_6px] opacity-40"></div>
        <div className="w-7 h-7 rounded-full border border-amber-400/50 flex items-center justify-center bg-amber-950/60 shadow-inner">
          <span className="text-amber-400 text-xs font-serif font-black">R</span>
        </div>
      </div>
    );
  }

  const basePoints = getCardBasePoint(card);

  const getMeldStyle = () => {
    if (isClosingCandidate && isSelected) {
      return 'border-2 border-amber-400 bg-amber-50 ring-3 ring-amber-400 shadow-xl shadow-amber-500/40';
    }
    if (inDasar4 || meldType === 'dasar4') {
      return 'border-2 border-emerald-500 bg-emerald-50/95 ring-1 ring-emerald-400/70 shadow-xs shadow-emerald-500/20';
    }
    if (meldType === 'run') {
      return 'border-2 border-cyan-500 bg-cyan-50/95 ring-1 ring-cyan-400/70 shadow-xs shadow-cyan-500/20';
    }
    if (meldType === 'tris') {
      return 'border-2 border-purple-500 bg-purple-50/95 ring-1 ring-purple-400/70 shadow-xs shadow-purple-500/20';
    }
    if (meldType === 'fourhand') {
      return 'border-2 border-amber-500 bg-amber-50/95 ring-1 ring-amber-400/70 shadow-xs shadow-amber-500/20';
    }
    return 'border border-slate-300 bg-white';
  };

  return (
    <button
      type="button"
      draggable={draggable && !disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={`${card.rank} ${card.suit}`}
      className={`
        ${dimensions} relative rounded-xl select-none text-left font-sans
        transition-all duration-150 transform
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:-translate-y-1.5'}
        ${isSelected ? '-translate-y-3.5 ring-3 ring-amber-400 shadow-xl shadow-amber-500/35' : 'shadow-md hover:shadow-lg'}
        ${highlight ? 'ring-2 ring-emerald-400' : ''}
        ${getMeldStyle()}
        flex flex-col justify-between p-1.5 overflow-hidden
      `}
    >
      {/* Top Left Corner: Rank, Suit, and Points Badge (Always visible in card fan!) */}
      <div className="flex flex-col items-start leading-none z-10">
        <span
          className={`font-black text-sm sm:text-base tracking-tight ${
            isJoker ? 'text-purple-700' : isRed ? 'text-red-600' : 'text-slate-900'
          }`}
        >
          {isJoker ? 'JK' : card.rank}
        </span>
        <span className={`text-xs my-0.5 ${isRed ? 'text-red-600' : 'text-slate-800'}`}>
          {suitSymbol(card.suit)}
        </span>
        {showPoints && (
          <span className="text-[8px] font-black px-1 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs mt-0.5">
            {basePoints}p
          </span>
        )}
        {/* Meld Pill Indicator */}
        {(inDasar4 || meldType === 'dasar4') && (
          <span className="text-[7px] font-black px-1 py-0.2 rounded bg-emerald-600 text-white mt-0.5 shadow-2xs uppercase">
            Dasar
          </span>
        )}
        {meldType === 'run' && !inDasar4 && (
          <span className="text-[7px] font-black px-1 py-0.2 rounded bg-cyan-600 text-white mt-0.5 shadow-2xs uppercase">
            Urutan
          </span>
        )}
        {meldType === 'tris' && (
          <span className="text-[7px] font-black px-1 py-0.2 rounded bg-purple-600 text-white mt-0.5 shadow-2xs uppercase">
            Tris
          </span>
        )}
        {meldType === 'fourhand' && (
          <span className="text-[7px] font-black px-1 py-0.2 rounded bg-amber-600 text-white mt-0.5 shadow-2xs uppercase">
            4-Hand
          </span>
        )}
        {isClosingCandidate && (
          <span className="text-[7px] font-black px-1 py-0.2 rounded bg-amber-400 text-slate-950 mt-0.5 shadow-2xs uppercase animate-pulse">
            ★Tutup
          </span>
        )}
      </div>

      {/* Center Art / Icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
        {isJoker ? (
          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl text-purple-600">🃏</span>
            <span className="text-[7px] font-black tracking-widest text-purple-800 uppercase mt-0.5">JOKER</span>
          </div>
        ) : (
          <span
            className={`text-2xl sm:text-3xl font-serif ${
              isRed ? 'text-red-600/60' : 'text-slate-900/60'
            }`}
          >
            {suitSymbol(card.suit)}
          </span>
        )}
      </div>

      {/* Bottom Right Corner: Inverted Rank & Suit */}
      <div className="flex flex-col items-end leading-none z-10 w-full">
        <div className="flex flex-col items-center transform rotate-180">
          <span
            className={`font-black text-[11px] sm:text-xs leading-tight ${
              isJoker ? 'text-purple-700' : isRed ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {isJoker ? 'JK' : card.rank}
          </span>
          <span className={`text-[10px] ${isRed ? 'text-red-600' : 'text-slate-800'}`}>
            {suitSymbol(card.suit)}
          </span>
        </div>
      </div>
    </button>
  );
};
