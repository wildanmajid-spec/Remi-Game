export type Suit = 'spade' | 'heart' | 'diamond' | 'club' | 'joker';

export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'JOKER';

export interface Card {
  id: string; // e.g., 'c_0', 'c_1', ...
  suit: Suit;
  rank: Rank;
  deckIndex: number; // 0 or 1 (which of the 2 decks)
}

export type MeldType = 'dasar4' | 'run' | 'tris';

export interface Meld {
  type: MeldType;
  cards: Card[];
  points: number;
}

export interface PlayerScoreBreakdown {
  hasDasar4: boolean;
  melds: Meld[];
  meldPoints: number;
  deadwood: Card[];
  deadwoodPoints: number;
  closingBonus: number;
  totalPoints: number;
  reason: string;
}

export type GameMode = 'bot' | 'player';

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  isOccupied: boolean; // true if player seated, false if empty slot in player mode
  avatar: string;
  hand: Card[];
  selectedCardIds: string[];
  lastDiscardedCard: Card | null;
  score: number;
  roundScore: number;
  hasDasar4: boolean;
  isTahan: boolean;
  customDasar4CardIds: string[];
  uid?: string; // Firebase Auth user UID
  discardedCards: Card[]; // History of cards discarded by this player in current round
  has4Jokers?: boolean;
}

export type GameStage = 'title' | 'playing' | 'roundOver' | 'paused';

export type TurnPhase = 'draw' | 'discard';

export interface JokerSuggestion {
  id: string;
  type: 'run' | 'tris';
  title: string;
  description: string;
  jokerCard: Card;
  naturalCards: Card[];
  allMeldCards: Card[];
  asCardDescription: string;
  points: number;
}

export interface GameState {
  gameMode: GameMode;
  stage: GameStage;
  playerCount: 4 | 5 | 6;
  players: Player[];
  activePlayerIndex: number;
  turnPhase: TurnPhase;
  stockPile: Card[];
  stockReshuffleCount: number;
  currentDiscardCard: Card | null;
  discardSourcePlayerIndex: number | null; // who discarded this card
  discardHistory: { card: Card; fromPlayerIndex: number; toPlayerIndex: number }[];
  roundNumber: number;
  lastWinnerId: string | null;
  closeCard: Card | null;
  closeBonus: number;
  endReason: 'tutup' | 'stock_empty' | 'jackpot_4_joker' | null;
  scoresHistory: { round: number; scores: { playerId: string; roundScore: number; totalScore: number }[] }[];
  roomCode: string | null;
  isHost?: boolean;
  localPlayerId?: string;
  lastAction?: string;
  updatedAt?: number;
  hostUid?: string;
  isGameOver?: boolean; // True when any player reaches >= 1000 points
  grandWinnerId?: string | null;
}
