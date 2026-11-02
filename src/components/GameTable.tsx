import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Pause,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowDownCircle,
  Trophy,
  ShieldAlert,
  RotateCcw,
  Hand,
  Check,
  Copy,
  LogOut,
  History,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { GameState, Card, Meld, JokerSuggestion, ChatMessage } from '../game/types';
import { CardView } from './CardView';
import { PlayerSeat } from './PlayerSeat';
import { JokerSuggestionsModal } from './JokerSuggestionsModal';
import { DiscardHistoryModal } from './DiscardHistoryModal';
import { LeaderboardBarChart } from './LeaderboardBarChart';
import { LeaderboardScoreTable } from './LeaderboardScoreTable';
import { ChatBox } from './ChatBox';
import {
  evaluateBestMelds,
  checkCanTutup,
  calculatePlayerScore,
  isDasar4,
  getClosingBonus,
  findJokerSuggestions,
  check4Jokers,
  checkTahanEligibility,
  evaluateHandTutupStatus,
} from '../game/remiRules';

interface GameTableProps {
  gameState: GameState;
  onDrawFromStock: () => void;
  onDrawFromDiscard: () => void;
  onDiscardCard: (cardId: string) => void;
  onTutupGame: (closeCardId: string) => void;
  onSortBySuit: () => void;
  onSortByRank: () => void;
  onGroupByMelds: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  onOpenRules: () => void;
  onPause: () => void;
  onExitToHome?: () => void;
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onToggleTahan: () => void;
  customDasar4CardIds: string[];
  onSetCustomDasar4: (ids: string[]) => void;
  onResetCustomDasar4: () => void;
  onReorderHand: (draggedCardId: string, targetCardId: string) => void;
  isOnlineRoom?: boolean;
  lastActionText?: string;
  onClaim4Jokers?: () => void;
  onUpdateHand?: (cards: Card[]) => void;
  onSendMessage?: (text: string) => void;
  chatMessages?: ChatMessage[];
}

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  onDrawFromStock,
  onDrawFromDiscard,
  onDiscardCard,
  onTutupGame,
  onSortBySuit,
  onSortByRank,
  onGroupByMelds,
  onToggleMute,
  isMuted,
  onOpenRules,
  onPause,
  onExitToHome,
  selectedCardId,
  onSelectCard,
  onToggleTahan,
  customDasar4CardIds,
  onSetCustomDasar4,
  onResetCustomDasar4,
  onReorderHand,
  isOnlineRoom = false,
  lastActionText,
  onClaim4Jokers,
  onUpdateHand,
  onSendMessage,
  chatMessages = [],
}) => {
  const {
    players,
    activePlayerIndex,
    turnPhase,
    stockPile,
    currentDiscardCard,
    roundNumber,
    stockReshuffleCount,
    roomCode,
  } = gameState;

  const [isDropZoneOver, setIsDropZoneOver] = useState(false);
  const [showDasarBuilder, setShowDasarBuilder] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [showJokerModal, setShowJokerModal] = useState(false);
  const [showDiscardHistory, setShowDiscardHistory] = useState(false);
  const [showLeftBarModal, setShowLeftBarModal] = useState(false);
  const [showRightScoreModal, setShowRightScoreModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [tahanWarningToast, setTahanWarningToast] = useState<string | null>(null);

  const localPlayerId = gameState.localPlayerId || 'p_0';
  const localPlayerIndex = players.findIndex((p) => p.id === localPlayerId);
  const effectiveLocalIndex = localPlayerIndex >= 0 ? localPlayerIndex : 0;

  const humanPlayer = players[effectiveLocalIndex] || players[0];
  const isHumanTurn = activePlayerIndex === effectiveLocalIndex;
  const activePlayer = players[activePlayerIndex];

  // Evaluate human hand supporting custom Dasar 4
  const evalResult = evaluateBestMelds(humanPlayer.hand, customDasar4CardIds);
  const scoreBreakdown = calculatePlayerScore(humanPlayer.hand, customDasar4CardIds);
  const tutupCheck = checkCanTutup(humanPlayer.hand, customDasar4CardIds);
  const handTutupStatus = evaluateHandTutupStatus(humanPlayer.hand, customDasar4CardIds);

  // Aturan Tahan: Hanya dapat digunakan jika kurang Dasar 4 atau kurang 1 pola lagi!
  const tahanEligibility = checkTahanEligibility(humanPlayer.hand, customDasar4CardIds);
  const canToggleTahan = tahanEligibility.canTahan;

  // 4 Jokers & Joker Pattern suggestions
  const has4Jokers = check4Jokers(humanPlayer.hand);
  const localHasJoker = humanPlayer.hand.some((c) => c.rank === 'JOKER' || c.suit === 'joker');
  const jokerSuggestions = findJokerSuggestions(humanPlayer.hand);

  const handleApplyJokerSuggestion = (suggestion: JokerSuggestion) => {
    const meldIds = new Set(suggestion.allMeldCards.map((c) => c.id));
    const meldCards = humanPlayer.hand.filter((c) => meldIds.has(c.id));
    const rest = humanPlayer.hand.filter((c) => !meldIds.has(c.id));
    const newHand = [...meldCards, ...rest];

    if (onUpdateHand) {
      onUpdateHand(newHand);
    }
  };

  // Neighbors (discard to player on the right)
  const rightNeighbor = players[(effectiveLocalIndex + 1) % players.length];

  // Selected card details
  const selectedCard = humanPlayer.hand.find((c) => c.id === selectedCardId);
  const isSelectedCardClosing =
    selectedCard &&
    (selectedCard.rank === 'A' || selectedCard.rank === 'JOKER') &&
    tutupCheck.canClose &&
    tutupCheck.closingCardCandidates.some((c) => c.id === selectedCard.id);

  // Closing bonus calculation (+150 for Ace, +250 for Joker)
  const potentialCloseBonus = selectedCard ? getClosingBonus(selectedCard) : 0;

  // Custom Dasar 4 cards list
  const customDasar4Cards = humanPlayer.hand.filter((c) => customDasar4CardIds.includes(c.id));
  const isCustomDasar4Valid = customDasar4Cards.length >= 4 && isDasar4(customDasar4Cards);

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDropOnDasar4Area = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropZoneOver(false);
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    if (!customDasar4CardIds.includes(cardId)) {
      onSetCustomDasar4([...customDasar4CardIds, cardId]);
    }
  };

  const handleDropOnCard = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    const draggedCardId = e.dataTransfer.getData('text/plain');
    if (draggedCardId && draggedCardId !== targetCardId) {
      onReorderHand(draggedCardId, targetCardId);
    }
  };

  const handleToggleCardInCustomDasar4 = (cardId: string) => {
    if (customDasar4CardIds.includes(cardId)) {
      onSetCustomDasar4(customDasar4CardIds.filter((id) => id !== cardId));
    } else {
      onSetCustomDasar4([...customDasar4CardIds, cardId]);
    }
  };

  // Calculate seat position along oval (lingkaran lonjong) table perimeter
  const getRoundSeatPosition = (idx: number, total: number, localIdx: number) => {
    const rel = (idx - localIdx + total) % total;
    // rel = 0 is local player at bottom (90 deg)
    // Clockwise progression: 90 - rel * (360 / total)
    const angleDeg = (90 - rel * (360 / total) + 360) % 360;
    const angleRad = (angleDeg * Math.PI) / 180;

    // Radius along oval axes (x is wider for oval feel):
    const radiusX = 43; // percent
    const radiusY = 37; // percent

    const left = 50 + radiusX * Math.cos(angleRad);
    const top = 50 + radiusY * Math.sin(angleRad);

    return { left: `${left}%`, top: `${top}%` };
  };

  const occupiedCount = players.filter((p) => p.isOccupied).length;

  return (
    <div className="relative w-full h-screen bg-[#062013] overflow-hidden flex flex-col justify-between select-none font-sans text-slate-100">
      {/* Background table textures */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0d4529] via-[#072d1a] to-[#04140b] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#15803d_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

      {/* Top HUD Bar */}
      <header className="relative z-30 w-full px-3 sm:px-4 py-2 flex items-center justify-between border-b border-emerald-900/40 bg-black/60 backdrop-blur-md gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-black text-amber-400 text-base sm:text-lg tracking-wider">
              REMI
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
              R{roundNumber}
            </span>
          </div>

          {/* Mode Pill */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/90 border border-emerald-800/60 text-[10px] font-bold">
            <span>{gameState.gameMode === 'player' ? '👥 Lawan Player' : '🤖 Lawan Bot'}</span>
          </div>

          {gameState.gameMode === 'player' && roomCode && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/60 text-[10px] text-emerald-300 font-bold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Firebase Online</span>
            </div>
          )}

          {roomCode && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#07241c] border border-emerald-700/60 text-[10px] sm:text-xs">
              <span className="text-emerald-400/70 hidden sm:inline">Room:</span>
              <span className="font-mono font-bold text-emerald-300">{roomCode}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(roomCode);
                  setCopiedToast(true);
                  setTimeout(() => setCopiedToast(false), 2000);
                }}
                title="Salin Kode Room"
                className="text-emerald-400 hover:text-white transition-colors cursor-pointer ml-0.5"
              >
                {copiedToast ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300">
            <span className="text-slate-400">Meja Lonjong:</span>
            <span className="font-bold text-amber-300">
              {occupiedCount}/{players.length} Kursi
            </span>
          </div>
        </div>

        {/* Turn Action Banner */}
        <div className="text-center px-1 truncate flex-1 flex justify-center">
          {isHumanTurn ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/20 border border-amber-400/80 text-amber-300 font-bold text-[10px] sm:text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
              <span className="truncate">
                {turnPhase === 'draw'
                  ? `Giliran ${humanPlayer.name}: Ambil Kartu Tengah / Buangan`
                  : humanPlayer.isTahan
                  ? '⚠️ TAHAN AKTIF: Buang atau Tutup Kemenangan!'
                  : `Giliran ${humanPlayer.name}: Buang ke Kanan (atau Tahan & Tutup)`}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 text-[10px] sm:text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
              <span className="truncate">Giliran <strong>{activePlayer.name}</strong>...</span>
            </div>
          )}
        </div>

        {/* Quick Utilities */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Leaderboard Grafik Batang Button (for quick access or compact screens) */}
          <button
            type="button"
            onClick={() => setShowLeftBarModal(true)}
            aria-label="Buka Grafik Batang Poin"
            title="Lihat grafik batang peringkat poin menuju 1000"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-[11px] font-semibold text-amber-300 cursor-pointer transition-colors shadow-xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Grafik</span>
          </button>

          {/* Leaderboard Tabel Skor Button */}
          <button
            type="button"
            onClick={() => setShowRightScoreModal(true)}
            aria-label="Buka Tabel Skor Peringkat"
            title="Lihat tabel skor peringkat poin"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-[11px] font-semibold text-emerald-300 cursor-pointer transition-colors shadow-xs"
          >
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Skor</span>
          </button>

          {/* Real-time Chat Box Button */}
          <button
            type="button"
            onClick={() => setShowChatModal(true)}
            aria-label="Buka Kotak Obrolan Meja"
            title="Buka obrolan pesan antar-pemain"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-[11px] font-semibold text-emerald-300 cursor-pointer transition-colors shadow-xs relative"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Chat</span>
            {chatMessages.length > 0 && (
              <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded-full font-bold border border-emerald-500 tabular-nums">
                {chatMessages.length}
              </span>
            )}
          </button>

          {/* Discard History Button */}
          <button
            type="button"
            onClick={() => setShowDiscardHistory(true)}
            aria-label="Buka Riwayat Buangan Pemain"
            title="Lihat riwayat buangan kartu setiap pemain"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-[11px] font-semibold text-emerald-300 cursor-pointer transition-colors shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Buangan</span>
            <span className="text-[10px] bg-emerald-900 text-amber-300 px-1.5 py-0.2 rounded-full font-bold border border-emerald-600/40 tabular-nums">
              {gameState.discardHistory.length}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenRules}
            aria-label="Buka Peraturan"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-amber-300 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Aturan</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Aktifkan Suara' : 'Matikan Suara'}
            className="p-1 sm:p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Permainan"
            className="p-1 sm:p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {onExitToHome && (
            <button
              type="button"
              onClick={onExitToHome}
              aria-label="Keluar Meja"
              title="Keluar ke Menu Utama"
              className="p-1 sm:p-1.5 rounded-lg bg-slate-900/90 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-700/60 text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 3-Column Arena Layout: Left (Bar Chart) | Center (Arena) | Right (Score Table & Chat) */}
      <div className="relative flex-1 w-full flex items-stretch overflow-hidden px-1 sm:px-2 py-1 gap-2">
        {/* KOLOM SEBELAH KIRI: Leaderboard Grafik Batang */}
        <div className="hidden lg:flex w-56 xl:w-64 shrink-0 flex-col h-full overflow-hidden">
          <LeaderboardBarChart
            players={players}
            activePlayerIndex={activePlayerIndex}
            localPlayerId={localPlayerId}
          />
        </div>

        {/* KOLOM TENGAH: Main Round Table Arena ("Meja Bulat") */}
        <main className="relative flex-1 max-w-5xl mx-auto px-1 sm:px-2 py-1 flex flex-col justify-between items-center z-10 overflow-hidden h-full">
        {/* Toast Copied Room Code */}
        {copiedToast && (
          <div className="absolute top-2 z-40 bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-lg shadow-black/60 flex items-center gap-1.5 animate-bounce">
            <Check className="w-3.5 h-3.5" />
            <span>Kode room berhasil disalin!</span>
          </div>
        )}

        {/* The Oval (Lingkaran Lonjong) Felt Table */}
        <div className="relative w-full max-w-[min(96vw,860px)] aspect-[1.85/1] sm:aspect-[2.1/1] max-h-[440px] my-auto flex items-center justify-center p-1 sm:p-2">
          {/* Wood/Leather Outer Bezel - Oval / Lingkaran Lonjong Kasino Mewah */}
          <div className="w-full h-full rounded-full bg-gradient-to-b from-[#3a1e0f] via-[#24130a] to-[#120804] p-2.5 sm:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.15)] border-3 sm:border-5 border-[#4a2815] relative flex items-center justify-center">
            {/* Golden Inlay Ring Oval */}
            <div className="w-full h-full rounded-full border-2 border-amber-500/35 p-1.5 sm:p-2.5 shadow-inner flex items-center justify-center">
              {/* Deep Emerald Green Felt Table Surface Oval */}
              <div className="w-full h-full rounded-full bg-[radial-gradient(ellipse_at_center,#0e5333_0%,#083321_60%,#03180f_100%)] relative flex items-center justify-center shadow-[inset_0_0_60px_rgba(0,0,0,0.85)]">
                {/* Radial watermarked suits */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none text-9xl font-serif">
                  ♠
                </div>

                {/* Oval Discard Direction Ring */}
                <div className="absolute w-[82%] h-[74%] rounded-full border border-dashed border-emerald-500/25 pointer-events-none" />

                {/* All Player Seats Positioned Along the Circular Perimeter */}
                {players.map((p, idx) => {
                  const coords = getRoundSeatPosition(idx, players.length, effectiveLocalIndex);
                  const isLocal = idx === effectiveLocalIndex;
                  const nextPlayer = players[(idx + 1) % players.length];

                  return (
                    <div
                      key={p.id}
                      style={{ left: coords.left, top: coords.top }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto"
                    >
                      <PlayerSeat
                        player={p}
                        isActive={activePlayerIndex === idx}
                        isLocalPlayer={isLocal}
                        discardToPlayerName={nextPlayer?.isOccupied ? nextPlayer.name : undefined}
                        onInviteClick={() => {
                          if (roomCode) {
                            navigator.clipboard?.writeText(roomCode);
                            setCopiedToast(true);
                            setTimeout(() => setCopiedToast(false), 2000);
                          }
                        }}
                      />
                    </div>
                  );
                })}

                {/* Center Hub: Stock Pile & Discard Card */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="p-3 sm:p-4 rounded-3xl bg-emerald-950/75 border border-emerald-600/40 shadow-2xl backdrop-blur-sm flex items-center gap-3 sm:gap-6">
                    {/* Stock Draw Pile (Tengah) */}
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] sm:text-[11px] font-bold text-emerald-300/90 mb-1 flex items-center gap-1 uppercase tracking-wider">
                        <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Tengah</span>
                      </div>

                      <div className="relative">
                        <div className="absolute top-1 left-1 w-12 sm:w-14 h-16 sm:h-20 rounded-lg bg-slate-900 border border-amber-600/30 opacity-70" />
                        <div
                          role="button"
                          tabIndex={isHumanTurn && turnPhase === 'draw' && stockPile.length > 0 ? 0 : -1}
                          onClick={isHumanTurn && turnPhase === 'draw' ? onDrawFromStock : undefined}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              if (isHumanTurn && turnPhase === 'draw') onDrawFromStock();
                            }
                          }}
                          aria-label="Ambil Kartu Tengah"
                          className={`relative transform transition-all cursor-pointer ${
                            isHumanTurn && turnPhase === 'draw'
                              ? 'hover:scale-105 ring-3 ring-amber-400 shadow-xl shadow-amber-500/40 rounded-xl'
                              : 'opacity-95'
                          }`}
                        >
                          <CardView
                            card={stockPile[0] || { id: 'x', rank: 'A', suit: 'spade', deckIndex: 0 }}
                            faceUp={false}
                            size="sm"
                            disabled={!isHumanTurn || turnPhase !== 'draw'}
                          />
                          <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                            <span className="bg-slate-950 text-amber-400 border border-amber-500/50 text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-md tabular-nums">
                              {stockPile.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isHumanTurn && turnPhase === 'draw' && (
                        <button
                          type="button"
                          onClick={onDrawFromStock}
                          className="mt-2.5 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] sm:text-xs shadow-md hover:bg-amber-400 cursor-pointer ring-2 ring-amber-300/80 transition-all hover:scale-105 active:scale-95"
                        >
                          Ambil
                        </button>
                      )}
                    </div>

                    {/* Discard Direction Flow Arrow */}
                    <div className="flex flex-col items-center justify-center opacity-70">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/90 mb-0.5">
                        Buang
                      </span>
                      <div className="w-6 h-6 rounded-full border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                        <ArrowRight className="w-3 h-3" />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/90 mt-0.5">
                        Kanan
                      </span>
                      {stockReshuffleCount > 0 && (
                        <span className="text-[8px] text-amber-400 font-semibold">
                          #{stockReshuffleCount}
                        </span>
                      )}
                    </div>

                    {/* Live Discard Card (Kartu Buangan) */}
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] sm:text-[11px] font-bold text-amber-300/90 mb-1 flex items-center gap-1 uppercase tracking-wider">
                        <ArrowDownCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Buangan</span>
                      </div>

                      {currentDiscardCard ? (
                        <div className="relative">
                          <div
                            role="button"
                            tabIndex={isHumanTurn && turnPhase === 'draw' ? 0 : -1}
                            onClick={isHumanTurn && turnPhase === 'draw' ? onDrawFromDiscard : undefined}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                if (isHumanTurn && turnPhase === 'draw') onDrawFromDiscard();
                              }
                            }}
                            aria-label="Ambil Kartu Buangan"
                            className={`relative transform transition-all cursor-pointer ${
                              isHumanTurn && turnPhase === 'draw'
                                ? 'hover:scale-105 ring-3 ring-emerald-400 shadow-xl shadow-emerald-500/40 rounded-xl'
                                : ''
                            }`}
                          >
                            <CardView card={currentDiscardCard} faceUp={true} size="sm" />
                          </div>

                          {isHumanTurn && turnPhase === 'draw' && (
                            <button
                              type="button"
                              onClick={onDrawFromDiscard}
                              className="mt-2.5 px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] sm:text-xs shadow-md hover:bg-emerald-400 cursor-pointer ring-2 ring-emerald-300/80 transition-all hover:scale-105 active:scale-95"
                            >
                              Ambil
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-12 sm:w-14 h-16 sm:h-20 rounded-lg border-2 border-dashed border-emerald-700/60 flex items-center justify-center text-slate-400 text-[10px] font-semibold text-center p-1">
                          Kosong
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Human Player Hand & Dasar 4 Drag Zone */}
        <div className="w-full relative z-20 flex flex-col items-center">
          {/* Custom Dasar 4 Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDropZoneOver(true);
            }}
            onDragLeave={() => setIsDropZoneOver(false)}
            onDrop={handleDropOnDasar4Area}
            className={`w-full max-w-4xl p-2 rounded-t-2xl transition-all border-t border-x ${
              isDropZoneOver
                ? 'bg-emerald-900/90 border-emerald-400 ring-2 ring-emerald-300'
                : customDasar4CardIds.length > 0
                ? 'bg-slate-950/95 border-emerald-500/70'
                : 'bg-slate-950/80 border-slate-700/80'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Hand className="w-3.5 h-3.5 text-amber-400" />
                  <span>Area Dasar 4 Pilihan (Drag Kartu ke Sini)</span>
                </span>

                {customDasar4CardIds.length > 0 ? (
                  isCustomDasar4Valid ? (
                    <span className="text-[10px] font-black bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500">
                      ✓ Dasar 4 Pilihan Sah
                    </span>
                  ) : (
                    <span className="text-[10px] font-black bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500">
                      Butuh {Math.max(0, 4 - customDasar4Cards.length)} kartu lagi (urutan murni sejenis)
                    </span>
                  )
                ) : (
                  <span className="text-[10px] text-slate-400 italic">
                    (Tarik kartu ke sini untuk menentukan Dasar 4 pilihan Anda)
                  </span>
                )}
              </div>

              {customDasar4CardIds.length > 0 && (
                <button
                  type="button"
                  onClick={onResetCustomDasar4}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset ke Otomatis</span>
                </button>
              )}
            </div>

            {/* Dropped Cards in Custom Dasar 4 */}
            {customDasar4Cards.length > 0 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1">
                {customDasar4Cards.map((c) => (
                  <div key={c.id} className="relative group">
                    <CardView card={c} size="sm" inDasar4={true} />
                    <button
                      type="button"
                      onClick={() => handleToggleCardInCustomDasar4(c.id)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center opacity-80 hover:opacity-100 cursor-pointer shadow"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Hand Info & Status Bar */}
          <div className="w-full max-w-5xl flex flex-col gap-1 px-3 py-1.5 bg-slate-950 border-x border-slate-700/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Dasar 4 & Poin Status */}
              <div className="flex flex-wrap items-center gap-2">
                {evalResult.hasDasar4 ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/50">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dasar 4: TERPENUHI ✓</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/50">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dasar 4: BELUM ADA ✗</span>
                  </span>
                )}

                {/* Status 13 Kartu Wajib Plus & Penutup */}
                {handTutupStatus.canClose ? (
                  <span className="flex items-center gap-1 text-xs font-black text-amber-300 bg-amber-950/90 px-2.5 py-0.5 rounded-full border border-amber-400 animate-pulse shadow-md shadow-amber-900/40">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>13 KARTU PLUS SEMPURNA + PENUTUP SIAP!</span>
                  </span>
                ) : evalResult.hasDasar4 ? (
                  evalResult.deadwood.length === 0 ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-950/90 px-2.5 py-0.5 rounded-full border border-emerald-500/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>13 Kartu Semua Nilai Plus (Tinggal Ambil Penutup Ace/Joker)</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-600/50">
                      <span>Kombinasi Plus: +{scoreBreakdown.meldPoints}p</span>
                      <span className="text-amber-500">•</span>
                      <span className="text-rose-400 font-bold">Sisa: -{scoreBreakdown.deadwoodPoints}p ({evalResult.deadwood.length} kartu)</span>
                    </span>
                  )
                ) : null}

                {/* Tahan Status Pill */}
                {humanPlayer.isTahan && (
                  <span className="flex items-center gap-1 text-xs font-black text-red-100 bg-red-700 px-2.5 py-0.5 rounded-full border border-red-400 animate-pulse">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-200" />
                    <span>TAHAN AKTIF ⚠️</span>
                  </span>
                )}

                {/* Point preview */}
                <div className="text-[11px] font-semibold text-slate-300">
                  Total:{' '}
                  <span
                    className={`font-bold tabular-nums ${
                      scoreBreakdown.totalPoints >= 0 ? 'text-emerald-300' : 'text-red-400'
                    }`}
                  >
                    {scoreBreakdown.totalPoints >= 0
                      ? `+${scoreBreakdown.totalPoints}`
                      : scoreBreakdown.totalPoints}
                  </span>
                </div>
              </div>

              {/* Hand Organization Helpers */}
              <div className="flex items-center gap-1.5">
                {localHasJoker && (
                  <button
                    type="button"
                    onClick={() => setShowJokerModal(true)}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-500/70 cursor-pointer shadow-md shadow-purple-950/50 animate-pulse"
                    title="Pilihan pola yang dapat dibentuk oleh kartu Joker"
                  >
                    <span className="text-xs">🃏</span>
                    <span>Pola Joker ({jokerSuggestions.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSortBySuit}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                >
                  Urut Bunga
                </button>
                <button
                  type="button"
                  onClick={onSortByRank}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                >
                  Urut Angka
                </button>
                <button
                  type="button"
                  onClick={onGroupByMelds}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-600/50 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Susun Pola</span>
                </button>
              </div>
            </div>

            {/* Sub-keterangan Aturan Penutupan (Edukatif & Ramah Pemain) */}
            <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-0.5 px-0.5">
              <span className="truncate">
                {evalResult.hasDasar4 && evalResult.deadwood.length > 0 ? (
                  <span className="text-amber-300/90">
                    💡 <strong>Aturan Tutup:</strong> Semua 13 kartu wajib masuk pola sah (Dasar 4, Urutan 3, Tris, atau Fourhand) tanpa sisa (0 deadwood), kartu ke-14 adalah Ace atau Joker.
                  </span>
                ) : handTutupStatus.canClose ? (
                  <span className="text-emerald-300 font-medium">
                    🎉 <strong>Siap Tutup:</strong> Tekan Tahan lalu klik Tutup dengan kartu {tutupCheck.closingCardCandidates.map(c => c.rank).join(' atau ')}!
                  </span>
                ) : (
                  <span>
                    Pola Sah: <strong>Dasar 4</strong> (min 4 urut tanpa joker), <strong>Urutan 3</strong>, <strong>Tris</strong> (3 kartu beda bunga), <strong>Fourhand</strong> (4 kartu beda bunga). Penutup: <strong>Ace</strong> (+150) / <strong>Joker</strong> (+250).
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Hand Cards Horizontal Dock */}
          <div className="w-full max-w-5xl bg-slate-950/95 border border-slate-800 rounded-b-2xl p-2.5 sm:p-3 shadow-2xl flex flex-col items-center">
            {/* The Cards (Draggable!) */}
            <div className="w-full flex items-center justify-center -space-x-4 sm:-space-x-6 overflow-x-auto py-2 px-4 scrollbar-thin">
              {(() => {
                const meldMap = new Map<string, import('../game/types').MeldType>();
                evalResult.melds.forEach((m) => {
                  m.cards.forEach((c) => {
                    meldMap.set(c.id, m.type);
                  });
                });

                return humanPlayer.hand.map((card, idx) => {
                  const isSelected = card.id === selectedCardId;
                  const meldType = meldMap.get(card.id) || null;
                  const isClosingCandidate = tutupCheck.closingCardCandidates.some((c) => c.id === card.id);

                  return (
                    <div
                      key={card.id}
                      className="transform origin-bottom transition-all"
                      style={{ zIndex: isSelected ? 30 : idx + 1 }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnCard(e, card.id)}
                    >
                      <CardView
                        card={card}
                        isSelected={isSelected}
                        inDasar4={meldType === 'dasar4'}
                        meldType={meldType}
                        isClosingCandidate={isClosingCandidate}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, card.id)}
                        onClick={() => onSelectCard(card.id)}
                      />
                    </div>
                  );
                });
              })()}
            </div>

            {/* Action Buttons for Discard / TAHAN / Tutup */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800 mt-1">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                {selectedCard ? (
                  <span>
                    Kartu dipilih:{' '}
                    <strong className="text-amber-400">
                      {selectedCard.rank} {selectedCard.suit}
                    </strong>
                    {isSelectedCardClosing && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/60 animate-pulse">
                        ★ Kartu Penutup (+{potentialCloseBonus}p)
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="italic">Klik kartu untuk memilih, atau drag ke Area Dasar 4</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Tombol TAHAN (Hanya dapat digunakan jika kurang dasar 4 atau kurang 1 pola lagi) */}
                <button
                  type="button"
                  disabled={!canToggleTahan && !humanPlayer.isTahan}
                  onClick={onToggleTahan}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                    humanPlayer.isTahan
                      ? 'bg-red-700 text-white border-2 border-red-400 ring-2 ring-red-400/50 shadow-lg shadow-red-600/30 cursor-pointer'
                      : canToggleTahan
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-2 border-amber-300 ring-2 ring-amber-400/50 shadow-md animate-pulse cursor-pointer'
                      : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/60 opacity-60'
                  }`}
                  title={
                    humanPlayer.isTahan
                      ? 'TAHAN AKTIF: Anda siap menutup ronde saat membuang kartu penutup!'
                      : canToggleTahan
                      ? `Syarat Terpenuhi: ${tahanEligibility.description} Tekan untuk mengaktifkan Tahan!`
                      : 'Tombol Tahan tidak dapat digunakan. Hanya aktif jika kurang Dasar 4 atau kurang 1 pola lagi.'
                  }
                >
                  <ShieldAlert className="w-4 h-4 text-red-300" />
                  <span>
                    {humanPlayer.isTahan
                      ? 'TAHAN AKTIF ✓'
                      : canToggleTahan
                      ? `TOMBOL TAHAN (${tahanEligibility.reason === 'kurang_dasar_4' ? 'Kurang D4' : 'Kurang 1 Pola'})`
                      : 'TOMBOL TAHAN (Terkunci)'}
                  </span>
                </button>

                {/* Normal Discard Button */}
                <button
                  type="button"
                  disabled={!isHumanTurn || turnPhase !== 'discard' || !selectedCardId}
                  onClick={() => selectedCardId && onDiscardCard(selectedCardId)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isHumanTurn && turnPhase === 'discard' && selectedCardId
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Buang ke {rightNeighbor.name}</span>
                </button>

                {/* 4 Joker Jackpot Instant Claim Button */}
                {has4Jokers && onClaim4Jokers && (
                  <button
                    type="button"
                    onClick={onClaim4Jokers}
                    className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-xl shadow-amber-500/40 ring-2 ring-yellow-200 animate-bounce cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>🌟 KLAIM 4 JOKER (1000 POIN)!</span>
                  </button>
                )}

                {/* Tutup & Menang Button (Shows Ace +150 / Joker +250 points, and WAJIB TAHAN) */}
                {tutupCheck.canClose && !has4Jokers && (
                  <button
                    type="button"
                    disabled={
                      !isHumanTurn ||
                      !isSelectedCardClosing
                    }
                    onClick={() => {
                      if (!humanPlayer.isTahan) {
                        // User must activate Tahan first
                        onToggleTahan();
                        setTahanWarningToast('⚠️ Tombol TAHAN diaktifkan! Tekan Tutup sekali lagi untuk menutup permainan.');
                        setTimeout(() => setTahanWarningToast(null), 4000);
                        return;
                      }
                      if (selectedCardId) {
                        onTutupGame(selectedCardId);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                      isSelectedCardClosing && humanPlayer.isTahan
                        ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-400 text-slate-950 shadow-xl shadow-amber-500/40 ring-2 ring-amber-300 animate-pulse cursor-pointer'
                        : isSelectedCardClosing && !humanPlayer.isTahan
                        ? 'bg-amber-950 text-amber-300 border-2 border-amber-500/80 animate-bounce cursor-pointer'
                        : 'bg-emerald-950 text-emerald-600 border border-emerald-800/60 opacity-60 cursor-not-allowed'
                    }`}
                    title={
                      !humanPlayer.isTahan
                        ? 'Wajib menekan tombol Tahan terlebih dahulu sebelum menutup!'
                        : 'Tutup permainan dan menangkan ronde ini'
                    }
                  >
                    <Trophy className="w-4 h-4" />
                    <span>
                      {!humanPlayer.isTahan
                        ? '⚠️ WAJIB TEKAN TAHAN SEBELUM TUTUP!'
                        : isSelectedCardClosing
                        ? `TUTUP DENGAN ${selectedCard?.rank} (+${potentialCloseBonus} POIN)!`
                        : 'Pilih Penutup (Ace +150 / Joker +250)'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        </main>

        {/* KOLOM SEBELAH KANAN: Tabel Skor Peringkat & Real-time Live Chat */}
        <div className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col h-full gap-2 overflow-hidden">
          <div className="flex-1 overflow-y-auto min-h-0">
            <LeaderboardScoreTable
              players={players}
              activePlayerIndex={activePlayerIndex}
              localPlayerId={localPlayerId}
              roundNumber={roundNumber}
            />
          </div>
          <div className="h-64 shrink-0 overflow-hidden">
            <ChatBox
              messages={chatMessages}
              onSendMessage={onSendMessage || (() => {})}
              localPlayer={humanPlayer}
              isOnlineRoom={isOnlineRoom}
            />
          </div>
        </div>
      </div>

      {/* Mobile/Compact Leaderboard Bar Chart Modal */}
      {showLeftBarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-md h-[80vh] flex flex-col bg-slate-950 border border-emerald-700/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-end p-2 bg-slate-900 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setShowLeftBarModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Tutup ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <LeaderboardBarChart
                players={players}
                activePlayerIndex={activePlayerIndex}
                localPlayerId={localPlayerId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile/Compact Score Table Modal */}
      {showRightScoreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col bg-slate-950 border border-emerald-700/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-end p-2 bg-slate-900 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setShowRightScoreModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Tutup ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <LeaderboardScoreTable
                players={players}
                activePlayerIndex={activePlayerIndex}
                localPlayerId={localPlayerId}
                roundNumber={roundNumber}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile/Compact Chat Box Modal */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-md h-[75vh] flex flex-col bg-slate-950 border border-emerald-700/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-end p-2 bg-slate-900 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Tutup ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <ChatBox
                messages={chatMessages}
                onSendMessage={onSendMessage || (() => {})}
                localPlayer={humanPlayer}
                isOnlineRoom={isOnlineRoom}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert for Tahan Warning */}
      {tahanWarningToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black text-xs sm:text-sm px-4 py-2 rounded-xl shadow-2xl border-2 border-amber-300 flex items-center gap-2 animate-bounce">
          <ShieldAlert className="w-5 h-5 text-slate-950" />
          <span>{tahanWarningToast}</span>
        </div>
      )}

      {/* Discard History Modal */}
      <DiscardHistoryModal
        isOpen={showDiscardHistory}
        onClose={() => setShowDiscardHistory(false)}
        players={players}
        activePlayerIndex={activePlayerIndex}
      />

      {/* Joker Suggestions Modal */}
      <JokerSuggestionsModal
        isOpen={showJokerModal}
        onClose={() => setShowJokerModal(false)}
        suggestions={jokerSuggestions}
        onApplySuggestion={handleApplyJokerSuggestion}
      />
    </div>
  );
};
