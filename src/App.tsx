import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  Card,
  GameMode,
  GameState,
  Player,
  TurnPhase,
} from './game/types';
import {
  createRemiDeck,
  shuffleDeck,
  rankToNumber,
  getBotAction,
  checkCanTutup,
  calculatePlayerScore,
  evaluateBestMelds,
  sortHandBySuit,
  getClosingBonus,
} from './game/remiRules';
import { TitleScreen } from './components/TitleScreen';
import { GameTable } from './components/GameTable';
import { RoundOverModal } from './components/RoundOverModal';
import { RulesModal } from './components/RulesModal';
import { PauseModal } from './components/PauseModal';
import { sounds } from './utils/soundEffects';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  syncGameStateToFirebase,
  subscribeToFirebaseRoom,
  fetchFirebaseRoom,
  testFirestoreConnection,
} from './firebase';

const BOT_CONFIGS = [
  { name: 'Budi', avatar: '🦊' },
  { name: 'Siti', avatar: '🌸' },
  { name: 'Joko', avatar: '🦁' },
  { name: 'Dewi', avatar: '🦉' },
  { name: 'Rian', avatar: '🐯' },
];

const STORAGE_SESSION_KEY = 'remi_saved_session';

function initializePlayers(
  playerCount: 4 | 5 | 6,
  playerName: string = 'Sari',
  gameMode: GameMode = 'bot',
  userUid?: string
): Player[] {
  const players: Player[] = [
    {
      id: 'p_0',
      name: playerName || 'Sari',
      isHuman: true,
      isOccupied: true,
      avatar: '🤠',
      hand: [],
      selectedCardIds: [],
      lastDiscardedCard: null,
      score: 0,
      roundScore: 0,
      hasDasar4: false,
      isTahan: false,
      customDasar4CardIds: [],
      uid: userUid,
    },
  ];

  for (let i = 1; i < playerCount; i++) {
    const isBot = gameMode === 'bot';
    const cfg = BOT_CONFIGS[i - 1];
    players.push({
      id: `p_${i}`,
      name: isBot ? cfg.name : `Kursi ${i + 1}`,
      isHuman: !isBot,
      isOccupied: isBot, // Bot mode: immediately occupied. Player mode: empty slot waiting for players!
      avatar: isBot ? cfg.avatar : '👤',
      hand: [],
      selectedCardIds: [],
      lastDiscardedCard: null,
      score: 0,
      roundScore: 0,
      hasDasar4: false,
      isTahan: false,
      customDasar4CardIds: [],
    });
  }

  return players;
}

export default function App() {
  const [playerCount, setPlayerCount] = useState<4 | 5 | 6>(4);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Firebase Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFirebaseOnline, setIsFirebaseOnline] = useState(true);

  // Track if current state update is originating from remote Firestore snapshot
  const isApplyingRemoteUpdate = useRef(false);

  // Core Game State with Refresh Persistence
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const autostart = urlParams.get('autostart') === '1';

      // 1. Try restore from localStorage on refresh
      try {
        const saved = localStorage.getItem(STORAGE_SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as GameState;
          if (parsed && parsed.stage && parsed.stage !== 'title' && parsed.players?.length >= 4) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Could not restore saved game state:', err);
      }

      if (autostart) {
        return {
          gameMode: 'bot',
          stage: 'playing',
          playerCount: 4,
          players: initializePlayers(4, 'Sari', 'bot'),
          activePlayerIndex: 0,
          turnPhase: 'draw',
          stockPile: [],
          stockReshuffleCount: 0,
          currentDiscardCard: null,
          discardSourcePlayerIndex: null,
          discardHistory: [],
          roundNumber: 1,
          lastWinnerId: null,
          closeCard: null,
          closeBonus: 0,
          endReason: null,
          scoresHistory: [],
          roomCode: 'REMI-4AUTO',
          isHost: true,
          localPlayerId: 'p_0',
        };
      }
    }

    return {
      gameMode: 'bot',
      stage: 'title',
      playerCount: 4,
      players: initializePlayers(4, 'Sari', 'bot'),
      activePlayerIndex: 0,
      turnPhase: 'draw',
      stockPile: [],
      stockReshuffleCount: 0,
      currentDiscardCard: null,
      discardSourcePlayerIndex: null,
      discardHistory: [],
      roundNumber: 1,
      lastWinnerId: null,
      closeCard: null,
      closeBonus: 0,
      endReason: null,
      scoresHistory: [],
      roomCode: null,
      isHost: true,
      localPlayerId: 'p_0',
    };
  });

  // Local player index helper
  const localPlayerId = gameState.localPlayerId || 'p_0';
  const localPlayerIndex = gameState.players.findIndex((p) => p.id === localPlayerId);
  const effectiveLocalIndex = localPlayerIndex >= 0 ? localPlayerIndex : 0;
  const localPlayer = gameState.players[effectiveLocalIndex] || gameState.players[0];

  // 1. Listen for Firebase Auth user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 2. Health check connection to Firestore on boot
  useEffect(() => {
    testFirestoreConnection().then((ok) => {
      setIsFirebaseOnline(ok);
    });
  }, []);

  // 3. Real-time Firebase Room Synchronization (Replaces BroadcastChannel)
  useEffect(() => {
    // Only subscribe if playing in online player mode and roomCode exists
    if (!gameState.roomCode || gameState.gameMode !== 'player') {
      return;
    }

    const roomCode = gameState.roomCode;
    const unsubscribe = subscribeToFirebaseRoom(
      roomCode,
      (remoteState, lastAction) => {
        if (!remoteState || !remoteState.players) return;

        setGameState((prev) => {
          // Identify local player id on this device
          let assignedLocalId = prev.localPlayerId || 'p_0';

          // If current user is logged in, verify if their UID is already assigned to a seat
          if (currentUser?.uid) {
            const mySeat = remoteState.players.find((p) => p.uid === currentUser.uid);
            if (mySeat) {
              assignedLocalId = mySeat.id;
            }
          }

          // Sound cues when changes occur
          if (
            remoteState.currentDiscardCard &&
            remoteState.currentDiscardCard.id !== prev.currentDiscardCard?.id
          ) {
            sounds.playCardSnap();
          } else if (
            remoteState.activePlayerIndex !== prev.activePlayerIndex ||
            remoteState.turnPhase !== prev.turnPhase
          ) {
            sounds.playCardDeal();
          }

          if (remoteState.stage === 'roundOver' && prev.stage !== 'roundOver') {
            if (remoteState.endReason === 'tutup') {
              sounds.playWinFanfare();
            } else {
              sounds.playCardSnap();
            }
          }

          // Keep local player's custom Dasar 4 selection intact
          const currentCustomDasar =
            prev.players.find((p) => p.id === assignedLocalId)?.customDasar4CardIds || [];

          const mergedPlayers = remoteState.players.map((p) => {
            if (p.id === assignedLocalId && currentCustomDasar.length > 0) {
              return { ...p, customDasar4CardIds: currentCustomDasar };
            }
            return p;
          });

          isApplyingRemoteUpdate.current = true;

          return {
            ...remoteState,
            localPlayerId: assignedLocalId,
            players: mergedPlayers,
            lastAction: lastAction || remoteState.lastAction,
          };
        });
      },
      (error) => {
        console.warn('Firebase Room subscription error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [gameState.roomCode, gameState.gameMode, currentUser?.uid]);

  // Persist game state to localStorage on state change & sync URL ?room=
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (gameState.stage !== 'title' && gameState.roomCode) {
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(gameState));
        localStorage.setItem(`remi_room_${gameState.roomCode}`, JSON.stringify(gameState));

        // Sync URL query param ?room=
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get('room') !== gameState.roomCode) {
          currentUrl.searchParams.set('room', gameState.roomCode);
          window.history.replaceState(null, '', currentUrl.toString());
        }
      } catch (err) {
        console.warn('Failed to save session to localStorage:', err);
      }
    }
  }, [gameState]);

  // Sync to Firebase on user actions
  const syncToFirebase = useCallback(
    (newState: GameState, actionDescription?: string) => {
      if (newState.gameMode === 'player' && newState.roomCode) {
        syncGameStateToFirebase(newState.roomCode, newState, actionDescription).catch((err) => {
          console.warn('Sync to Firebase error:', err);
        });
      }
    },
    []
  );

  // Reflect state to document.body.dataset.state for ultra-mode compliance
  useEffect(() => {
    document.body.dataset.state = gameState.stage;
  }, [gameState.stage]);

  // Start new round / deal cards
  const startNewRound = useCallback(
    (
      count?: 4 | 5 | 6,
      nextRoundNum = 1,
      existingPlayers?: Player[],
      roomCode?: string,
      customName?: string,
      mode: GameMode = gameState.gameMode
    ) => {
      const activeCount = count || gameState.playerCount;
      const fullDeck = createRemiDeck();
      const shuffled = shuffleDeck(fullDeck);

      const hostName = customName || currentUser?.displayName || gameState.players[0]?.name || 'Sari';
      const hostUid = currentUser?.uid;

      const players = existingPlayers
        ? existingPlayers.map((p) => ({
            ...p,
            hand: [],
            lastDiscardedCard: null,
            isTahan: false,
            customDasar4CardIds: [],
          }))
        : initializePlayers(activeCount, hostName, mode, hostUid);

      // If host has photo, set avatar
      if (currentUser?.photoURL) {
        players[0].avatar = '🤠';
      }

      // Deal 13 cards to each player seat (for both occupied and reserved slots)
      let cardIdx = 0;
      for (let c = 0; c < 13; c++) {
        for (let p = 0; p < activeCount; p++) {
          players[p].hand.push(shuffled[cardIdx++]);
        }
      }

      // Automatically sort human local player's hand according to suit (bunga)
      players[effectiveLocalIndex].hand = sortHandBySuit(players[effectiveLocalIndex].hand);

      // Remaining cards become the stock pile
      const remainingStock = shuffled.slice(cardIdx);

      const targetRoomCode = roomCode !== undefined ? roomCode : gameState.roomCode;

      const finalState: GameState = {
        gameMode: mode,
        stage: 'playing',
        playerCount: activeCount,
        players,
        activePlayerIndex: 0,
        turnPhase: 'draw',
        stockPile: remainingStock,
        stockReshuffleCount: 0,
        currentDiscardCard: null,
        discardSourcePlayerIndex: null,
        discardHistory: [],
        roundNumber: nextRoundNum,
        lastWinnerId: null,
        closeCard: null,
        closeBonus: 0,
        endReason: null,
        scoresHistory: gameState.scoresHistory || [],
        roomCode: targetRoomCode,
        isHost: true,
        localPlayerId: 'p_0',
        hostUid,
        lastAction: `Meja dibuka oleh ${hostName}`,
      };

      setGameState(finalState);
      if (mode === 'player' && targetRoomCode) {
        syncToFirebase(finalState, `Ronde ${nextRoundNum} dimulai`);
      }

      setSelectedCardId(null);
      sounds.playCardDeal();
    },
    [
      gameState.playerCount,
      gameState.gameMode,
      gameState.players,
      gameState.scoresHistory,
      gameState.roomCode,
      effectiveLocalIndex,
      currentUser,
      syncToFirebase,
    ]
  );

  // Autostart effect if mounted with autostart=1
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1' && gameState.stockPile.length === 0) {
      startNewRound(4, 1, undefined, 'REMI-4AUTO', 'Sari', 'bot');
    }
  }, [startNewRound, gameState.stockPile.length]);

  // Exit table to Title screen (clears session storage and room URL)
  const handleExitToTitle = () => {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('room');
      window.history.replaceState(null, '', currentUrl.pathname);
    } catch (e) {
      console.warn('Storage cleanup error', e);
    }

    setGameState((prev) => ({
      ...prev,
      stage: 'title',
      stockPile: [],
      roomCode: null,
    }));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if rules modal is open
      if (isRulesOpen) {
        if (e.key === 'Escape') setIsRulesOpen(false);
        return;
      }

      if (gameState.stage === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startNewRound(playerCount, 1);
        }
      } else if (gameState.stage === 'playing') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setGameState((prev) => ({ ...prev, stage: 'paused' }));
        } else if (e.key.toLowerCase() === 'm') {
          sounds.isMuted = !sounds.isMuted;
          setIsMuted(sounds.isMuted);
        } else if (gameState.activePlayerIndex === effectiveLocalIndex) {
          // Human turn shortcuts
          if (gameState.turnPhase === 'draw') {
            if (e.key.toLowerCase() === 'a' || e.key === 'Enter') {
              handleDrawFromStock();
            } else if (e.key.toLowerCase() === 'b' && gameState.currentDiscardCard) {
              handleDrawFromDiscard();
            }
          } else if (gameState.turnPhase === 'discard') {
            if (e.key.toLowerCase() === 'd' && selectedCardId) {
              handleDiscard(selectedCardId);
            }
          }
        }
      } else if (gameState.stage === 'paused') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          setGameState((prev) => ({ ...prev, stage: 'playing' }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // End round evaluation
  const handleEndRound = useCallback(
    (reason: 'tutup' | 'stock_empty', winnerId: string | null, closeCard: Card | null) => {
      setGameState((prev) => {
        const isWinnerClose = reason === 'tutup';
        const closeBonus = isWinnerClose && closeCard ? getClosingBonus(closeCard) : 0;

        const updatedPlayers = prev.players.map((p) => {
          const isWinner = isWinnerClose && p.id === winnerId;
          const breakdown = calculatePlayerScore(
            p.hand,
            p.customDasar4CardIds,
            isWinner,
            closeCard
          );
          const addedScore = breakdown.totalPoints;
          return {
            ...p,
            roundScore: addedScore,
            score: p.score + addedScore,
            hasDasar4: breakdown.hasDasar4,
          };
        });

        if (reason === 'tutup') {
          sounds.playWinFanfare();
        } else {
          sounds.playCardSnap();
        }

        const winnerName = prev.players.find((p) => p.id === winnerId)?.name || 'Pemain';
        const actionText =
          reason === 'tutup'
            ? `${winnerName} MENUTUP KARTU (${closeCard?.rank} ${closeCard?.suit})!`
            : 'Kartu tengah habis, ronde berakhir';

        const newState: GameState = {
          ...prev,
          stage: 'roundOver',
          players: updatedPlayers,
          lastWinnerId: winnerId,
          closeCard,
          closeBonus,
          endReason: reason,
          lastAction: actionText,
        };

        syncToFirebase(newState, actionText);
        return newState;
      });
    },
    [syncToFirebase]
  );

  // Human: Draw from Stock
  const handleDrawFromStock = () => {
    if (gameState.stockPile.length === 0) return;
    sounds.playCardDeal();

    const drawnCard = gameState.stockPile[0];
    const newStock = gameState.stockPile.slice(1);
    const playerName = gameState.players[effectiveLocalIndex]?.name || 'Pemain';
    const actionDesc = `${playerName} mengambil kartu tengah`;

    setGameState((prev) => {
      const updatedPlayers = [...prev.players];
      updatedPlayers[effectiveLocalIndex] = {
        ...updatedPlayers[effectiveLocalIndex],
        hand: [...updatedPlayers[effectiveLocalIndex].hand, drawnCard],
      };

      const newState: GameState = {
        ...prev,
        stockPile: newStock,
        players: updatedPlayers,
        turnPhase: 'discard',
        lastAction: actionDesc,
      };

      syncToFirebase(newState, actionDesc);
      return newState;
    });

    setSelectedCardId(drawnCard.id);
  };

  // Human: Draw from Discard
  const handleDrawFromDiscard = () => {
    if (!gameState.currentDiscardCard) return;
    sounds.playCardFlip();

    const drawnCard = gameState.currentDiscardCard;
    const playerName = gameState.players[effectiveLocalIndex]?.name || 'Pemain';
    const actionDesc = `${playerName} mengambil kartu buangan (${drawnCard.rank} ${drawnCard.suit})`;

    setGameState((prev) => {
      const updatedPlayers = [...prev.players];
      updatedPlayers[effectiveLocalIndex] = {
        ...updatedPlayers[effectiveLocalIndex],
        hand: [...updatedPlayers[effectiveLocalIndex].hand, drawnCard],
      };

      const newState: GameState = {
        ...prev,
        currentDiscardCard: null,
        players: updatedPlayers,
        turnPhase: 'discard',
        lastAction: actionDesc,
      };

      syncToFirebase(newState, actionDesc);
      return newState;
    });

    setSelectedCardId(drawnCard.id);
  };

  // Human: Discard Card
  const handleDiscard = (cardId: string) => {
    const cardToDiscard = gameState.players[effectiveLocalIndex].hand.find((c) => c.id === cardId);
    if (!cardToDiscard) return;
    sounds.playCardSnap();

    const playerName = gameState.players[effectiveLocalIndex]?.name || 'Pemain';
    const nextPlayerIdx = (effectiveLocalIndex + 1) % gameState.players.length;
    const nextPlayerName = gameState.players[nextPlayerIdx]?.name || 'pemain sebelah';
    const actionDesc = `${playerName} membuang ${cardToDiscard.rank} ${cardToDiscard.suit} ke ${nextPlayerName}`;

    setGameState((prev) => {
      const newHand = prev.players[effectiveLocalIndex].hand.filter((c) => c.id !== cardId);
      const updatedPlayers = [...prev.players];
      updatedPlayers[effectiveLocalIndex] = {
        ...updatedPlayers[effectiveLocalIndex],
        hand: newHand,
        lastDiscardedCard: cardToDiscard,
      };

      const newState: GameState = {
        ...prev,
        players: updatedPlayers,
        currentDiscardCard: cardToDiscard,
        discardSourcePlayerIndex: effectiveLocalIndex,
        discardHistory: [
          ...prev.discardHistory,
          { card: cardToDiscard, fromPlayerIndex: effectiveLocalIndex, toPlayerIndex: nextPlayerIdx },
        ],
        activePlayerIndex: nextPlayerIdx,
        turnPhase: 'draw',
        lastAction: actionDesc,
      };

      syncToFirebase(newState, actionDesc);
      return newState;
    });

    setSelectedCardId(null);
  };

  // Human: Tutup & Menang
  const handleTutup = (closeCardId: string) => {
    const card = gameState.players[effectiveLocalIndex].hand.find((c) => c.id === closeCardId);
    if (!card) return;

    // Enforce Tahan requirement: player MUST activate Tahan before/when closing
    if (!gameState.players[effectiveLocalIndex].isTahan) {
      setGameState((prev) => {
        const updated = [...prev.players];
        updated[effectiveLocalIndex] = { ...updated[effectiveLocalIndex], isTahan: true };
        return { ...prev, players: updated };
      });
    }

    const tutupCheck = checkCanTutup(
      gameState.players[effectiveLocalIndex].hand,
      gameState.players[effectiveLocalIndex].customDasar4CardIds
    );

    if (!tutupCheck.canClose) {
      sounds.playError();
      return;
    }

    handleEndRound('tutup', gameState.players[effectiveLocalIndex].id, card);
  };

  // Human: Toggle TAHAN button
  const handleToggleTahan = () => {
    sounds.playCardSnap();
    const playerName = gameState.players[effectiveLocalIndex]?.name || 'Pemain';

    setGameState((prev) => {
      const updated = [...prev.players];
      const nextTahan = !updated[effectiveLocalIndex].isTahan;
      updated[effectiveLocalIndex] = { ...updated[effectiveLocalIndex], isTahan: nextTahan };
      const actionDesc = `${playerName} ${nextTahan ? 'mengaktifkan TAHAN! ⚠️' : 'menonaktifkan Tahan'}`;

      const newState: GameState = { ...prev, players: updated, lastAction: actionDesc };
      syncToFirebase(newState, actionDesc);
      return newState;
    });
  };

  // Human: Custom Dasar 4 selection via drag-and-drop or click
  const handleSetCustomDasar4 = (ids: string[]) => {
    sounds.playCardFlip();
    setGameState((prev) => {
      const updated = [...prev.players];
      updated[effectiveLocalIndex] = { ...updated[effectiveLocalIndex], customDasar4CardIds: ids };
      return { ...prev, players: updated };
    });
  };

  const handleResetCustomDasar4 = () => {
    sounds.playCardFlip();
    setGameState((prev) => {
      const updated = [...prev.players];
      updated[effectiveLocalIndex] = { ...updated[effectiveLocalIndex], customDasar4CardIds: [] };
      return { ...prev, players: updated };
    });
  };

  const handleReorderHand = (draggedCardId: string, targetCardId: string) => {
    sounds.playCardFlip();
    setGameState((prev) => {
      const hand = [...prev.players[effectiveLocalIndex].hand];
      const fromIdx = hand.findIndex((c) => c.id === draggedCardId);
      const toIdx = hand.findIndex((c) => c.id === targetCardId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [removed] = hand.splice(fromIdx, 1);
      hand.splice(toIdx, 0, removed);
      const updated = [...prev.players];
      updated[effectiveLocalIndex] = { ...updated[effectiveLocalIndex], hand };
      return { ...prev, players: updated };
    });
  };

  // Bot Turn Automated Runner (runs ONLY in 'bot' mode or when AI seats are present and active)
  useEffect(() => {
    if (gameState.stage !== 'playing') return;
    if (gameState.activePlayerIndex === effectiveLocalIndex) return; // Local turn

    const botIndex = gameState.activePlayerIndex;
    const bot = gameState.players[botIndex];
    if (!bot || bot.isHuman || !bot.isOccupied) return; // Don't run bot on human or empty seats

    const botTimer = setTimeout(() => {
      // 1. Bot decides Draw action
      const botDecision = getBotAction(
        bot.hand,
        gameState.currentDiscardCard,
        gameState.stockPile.length,
        gameState.playerCount
      );

      let drawnCard: Card;
      let newStock = [...gameState.stockPile];
      let newDiscard = gameState.currentDiscardCard;

      if (botDecision.drawFrom === 'discard' && newDiscard) {
        drawnCard = newDiscard;
        newDiscard = null;
        sounds.playCardFlip();
      } else if (newStock.length > 0) {
        drawnCard = newStock[0];
        newStock = newStock.slice(1);
        sounds.playCardDeal();
      } else {
        // Stock is empty! Check Rule 8
        if (gameState.playerCount === 6 && gameState.discardHistory.length > 1) {
          // Reshuffle discarded cards into stock!
          const historyCards = gameState.discardHistory.map((h) => h.card);
          const shuffledStock = shuffleDeck(historyCards);
          drawnCard = shuffledStock[0];
          newStock = shuffledStock.slice(1);
          setGameState((prev) => ({
            ...prev,
            stockReshuffleCount: prev.stockReshuffleCount + 1,
            discardHistory: [],
          }));
        } else {
          // Stock empty and cannot reshuffle -> End of round!
          handleEndRound('stock_empty', null, null);
          return;
        }
      }

      const botHandWithDrawn = [...bot.hand, drawnCard];

      // 2. Check if Bot can Tutup (Win)
      const botTutup = checkCanTutup(botHandWithDrawn);
      if (botTutup.canClose && botTutup.closingCardCandidates.length > 0) {
        const winningClosingCard = botTutup.closingCardCandidates[0];
        setGameState((prev) => {
          const upd = [...prev.players];
          upd[botIndex] = { ...upd[botIndex], isTahan: true };
          return { ...prev, players: upd };
        });
        handleEndRound('tutup', bot.id, winningClosingCard);
        return;
      }

      // 3. Bot Discards
      const discardCard =
        botHandWithDrawn.find((c) => c.id === botDecision.cardToDiscardId) ||
        botHandWithDrawn[botHandWithDrawn.length - 1];
      const finalBotHand = botHandWithDrawn.filter((c) => c.id !== discardCard.id);
      sounds.playCardSnap();

      const nextPlayerIndex = (botIndex + 1) % gameState.players.length;

      // Check if stock pile is empty after bot's draw
      if (newStock.length === 0) {
        if (gameState.playerCount !== 6) {
          handleEndRound('stock_empty', null, null);
          return;
        }
      }

      const actionDesc = `${bot.name} membuang ${discardCard.rank} ${discardCard.suit}`;

      setGameState((prev) => {
        const updatedPlayers = [...prev.players];
        updatedPlayers[botIndex] = {
          ...updatedPlayers[botIndex],
          hand: finalBotHand,
          lastDiscardedCard: discardCard,
        };

        const newState: GameState = {
          ...prev,
          players: updatedPlayers,
          stockPile: newStock,
          currentDiscardCard: discardCard,
          discardSourcePlayerIndex: botIndex,
          discardHistory: [
            ...prev.discardHistory,
            { card: discardCard, fromPlayerIndex: botIndex, toPlayerIndex: nextPlayerIndex },
          ],
          activePlayerIndex: nextPlayerIndex,
          turnPhase: 'draw',
          lastAction: actionDesc,
        };

        syncToFirebase(newState, actionDesc);
        return newState;
      });
    }, 750);

    return () => clearTimeout(botTimer);
  }, [
    gameState.stage,
    gameState.activePlayerIndex,
    gameState.players,
    gameState.stockPile,
    gameState.currentDiscardCard,
    gameState.playerCount,
    gameState.discardHistory,
    effectiveLocalIndex,
    syncToFirebase,
    handleEndRound,
  ]);

  // Hand organizing functions: Urut Bunga sesuai bentuk bunga
  const handleSortBySuit = () => {
    sounds.playCardFlip();
    setGameState((prev) => {
      const sorted = sortHandBySuit(prev.players[effectiveLocalIndex].hand);
      const updated = [...prev.players];
      updated[effectiveLocalIndex] = { ...updated[effectiveLocalIndex], hand: sorted };
      return { ...prev, players: updated };
    });
  };

  const handleSortByRank = () => {
    sounds.playCardFlip();
    setGameState((prev) => {
      const sorted = [...prev.players[effectiveLocalIndex].hand].sort((a, b) => {
        const numA = rankToNumber(a.rank);
        const numB = rankToNumber(b.rank);
        if (numA !== numB) return numA - numB;
        return a.suit.localeCompare(b.suit);
      });
      const updated = [...prev.players];
      updated[effectiveLocalIndex] = { ...updated[effectiveLocalIndex], hand: sorted };
      return { ...prev, players: updated };
    });
  };

  const handleGroupByMelds = () => {
    sounds.playMeldChime();
    setGameState((prev) => {
      const evalRes = evaluateBestMelds(
        prev.players[effectiveLocalIndex].hand,
        prev.players[effectiveLocalIndex].customDasar4CardIds
      );
      const meldedCards = evalRes.melds.flatMap((m) => m.cards);
      const organized = [...meldedCards, ...evalRes.deadwood];
      const updated = [...prev.players];
      updated[effectiveLocalIndex] = { ...updated[effectiveLocalIndex], hand: organized };
      return { ...prev, players: updated };
    });
  };

  const toggleMute = () => {
    sounds.isMuted = !sounds.isMuted;
    setIsMuted(sounds.isMuted);
  };

  // Google Login Handler
  const handleLoginGoogle = async () => {
    try {
      const user = await loginWithGoogle();
      if (user) {
        setCurrentUser(user);
      }
    } catch (e) {
      console.error('Login error:', e);
      throw e;
    }
  };

  // Google Logout Handler
  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-black select-none">
      {gameState.stage === 'title' && (
        <TitleScreen
          playerCount={playerCount}
          onSelectPlayerCount={(count) => {
            setPlayerCount(count);
            setGameState((prev) => ({ ...prev, playerCount: count }));
          }}
          onStartGame={(name, count, roomCode, mode = 'bot') => {
            setPlayerCount(count);
            startNewRound(count, 1, undefined, roomCode, name, mode);
          }}
          onJoinRoom={async (name, code, mode = 'player') => {
            let detectedCount: 4 | 5 | 6 = playerCount;
            if (code.includes('6') || code.includes('6P')) {
              detectedCount = 6;
            } else if (code.includes('5') || code.includes('5P')) {
              detectedCount = 5;
            } else if (code.includes('4') || code.includes('4P')) {
              detectedCount = 4;
            }
            setPlayerCount(detectedCount);

            // Fetch room state from Firebase Firestore
            try {
              const remoteRoom = await fetchFirebaseRoom(code);
              if (remoteRoom && remoteRoom.players) {
                // Check if current user is already seated in this room
                const existingSeatIdx = currentUser?.uid
                  ? remoteRoom.players.findIndex((p) => p.uid === currentUser.uid)
                  : -1;

                if (existingSeatIdx !== -1) {
                  // Reconnect to existing seat
                  const nextState: GameState = {
                    ...remoteRoom,
                    localPlayerId: remoteRoom.players[existingSeatIdx].id,
                    isHost: existingSeatIdx === 0,
                  };
                  setGameState(nextState);
                  return;
                }

                // If not yet seated, find the first empty seat
                const emptyIdx = remoteRoom.players.findIndex((p) => !p.isOccupied);
                if (emptyIdx !== -1) {
                  const updated = [...remoteRoom.players];
                  const joinName = name || currentUser?.displayName || `Pemain ${emptyIdx + 1}`;
                  updated[emptyIdx] = {
                    ...updated[emptyIdx],
                    name: joinName,
                    isOccupied: true,
                    isHuman: true,
                    avatar: '🤠',
                    uid: currentUser?.uid,
                  };

                  const actionDesc = `${joinName} bergabung ke meja`;
                  const nextState: GameState = {
                    ...remoteRoom,
                    players: updated,
                    localPlayerId: updated[emptyIdx].id,
                    isHost: false,
                    lastAction: actionDesc,
                  };

                  setGameState(nextState);
                  syncToFirebase(nextState, actionDesc);
                  return;
                }
              }
            } catch (err) {
              console.warn('Could not fetch room from Firebase, falling back to new room', err);
            }

            // If room not found on Firebase, host creates/starts the room
            startNewRound(detectedCount, 1, undefined, code, name, mode);
          }}
          onOpenRules={() => setIsRulesOpen(true)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          initialGameMode={gameState.gameMode}
          currentUser={currentUser}
          onLoginWithGoogle={handleLoginGoogle}
          onLogout={handleLogout}
          isOnlineReady={isFirebaseOnline}
        />
      )}

      {(gameState.stage === 'playing' || gameState.stage === 'paused' || gameState.stage === 'roundOver') && (
        <GameTable
          gameState={gameState}
          onDrawFromStock={handleDrawFromStock}
          onDrawFromDiscard={handleDrawFromDiscard}
          onDiscardCard={handleDiscard}
          onTutupGame={handleTutup}
          onSortBySuit={handleSortBySuit}
          onSortByRank={handleSortByRank}
          onGroupByMelds={handleGroupByMelds}
          onToggleMute={toggleMute}
          isMuted={isMuted}
          onOpenRules={() => setIsRulesOpen(true)}
          onPause={() => setGameState((prev) => ({ ...prev, stage: 'paused' }))}
          onExitToHome={handleExitToTitle}
          selectedCardId={selectedCardId}
          onSelectCard={(id) => {
            sounds.playCardFlip();
            setSelectedCardId((prev) => (prev === id ? null : id));
          }}
          onToggleTahan={handleToggleTahan}
          customDasar4CardIds={localPlayer.customDasar4CardIds || []}
          onSetCustomDasar4={handleSetCustomDasar4}
          onResetCustomDasar4={handleResetCustomDasar4}
          onReorderHand={handleReorderHand}
          isOnlineRoom={gameState.gameMode === 'player'}
          lastActionText={gameState.lastAction}
        />
      )}

      {/* Round Over Modal */}
      <RoundOverModal
        isOpen={gameState.stage === 'roundOver'}
        players={gameState.players}
        winnerId={gameState.lastWinnerId}
        closingCard={gameState.closeCard}
        endReason={gameState.endReason}
        roundNumber={gameState.roundNumber}
        onNextRound={() => startNewRound(gameState.playerCount, gameState.roundNumber + 1, gameState.players)}
        onRestartGame={() => startNewRound(gameState.playerCount, 1)}
      />

      {/* Pause Modal */}
      <PauseModal
        isOpen={gameState.stage === 'paused'}
        onResume={() => setGameState((prev) => ({ ...prev, stage: 'playing' }))}
        onRestart={() => startNewRound(gameState.playerCount, gameState.roundNumber)}
        onBackToTitle={handleExitToTitle}
        onOpenRules={() => setIsRulesOpen(true)}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
