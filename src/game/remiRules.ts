import { Card, Meld, MeldType, PlayerScoreBreakdown, Rank, Suit, TahanCheckResult } from './types';

export const SUITS: Suit[] = ['spade', 'heart', 'diamond', 'club'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function rankToNumber(rank: Rank, aceHigh = false): number {
  if (rank === 'A') return aceHigh ? 14 : 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  if (rank === 'JOKER') return 99;
  return parseInt(rank, 10);
}

export function getCardBasePoint(card: Card, inLowAceRun = false): number {
  if (card.rank === 'JOKER') return 25;
  if (card.rank === 'A') {
    return inLowAceRun ? 5 : 15;
  }
  if (['J', 'Q', 'K'].includes(card.rank)) {
    return 10;
  }
  return 5; // 2 through 10
}

/**
 * Creates 2 complete 52-card decks plus 4 jokers (total 108 cards)
 */
export function createRemiDeck(): Card[] {
  const cards: Card[] = [];
  let idCounter = 0;

  for (let deckIdx = 0; deckIdx < 2; deckIdx++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `c_${idCounter++}`,
          suit,
          rank,
          deckIndex: deckIdx,
        });
      }
    }
  }

  // 4 Jokers
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `c_${idCounter++}`,
      suit: 'joker',
      rank: 'JOKER',
      deckIndex: i < 2 ? 0 : 1,
    });
  }

  return cards;
}

/**
 * Fisher-Yates shuffle
 */
export function shuffleDeck<T>(array: T[], customRandom?: () => number): T[] {
  const arr = [...array];
  const rnd = customRandom || Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Checks if a group of cards is a valid Dasar 4.
 * Rule: At least 4 consecutive cards of the SAME suit, without Jokers (pure natural run).
 * Ace can be low (A-2-3-4...) or high (...10-J-Q-K-A).
 */
export function isDasar4(cards: Card[]): boolean {
  if (cards.length < 4) return false;
  // No jokers allowed in Dasar 4
  if (cards.some((c) => c.rank === 'JOKER' || c.suit === 'joker')) return false;

  const suit = cards[0].suit;
  if (!cards.every((c) => c.suit === suit)) return false;

  // Check low Ace sequence
  const lowNums = cards.map((c) => rankToNumber(c.rank, false)).sort((a, b) => a - b);
  const isConsecutiveLow = isStrictlyConsecutive(lowNums);
  if (isConsecutiveLow) return true;

  // Check high Ace sequence
  const highNums = cards.map((c) => rankToNumber(c.rank, true)).sort((a, b) => a - b);
  const isConsecutiveHigh = isStrictlyConsecutive(highNums);
  return isConsecutiveHigh;
}

function isStrictlyConsecutive(nums: number[]): boolean {
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) return false;
  }
  return true;
}

/**
 * Checks if cards form a valid Run of 3 or more.
 * If allowJoker is true (which is only valid when a Dasar 4 is already secured or for JQKA combinations),
 * Jokers can substitute missing rank cards of the suit.
 */
export function isValidRun(cards: Card[], allowJoker = false): boolean {
  if (cards.length < 3) return false;

  const jokers = cards.filter((c) => c.rank === 'JOKER');
  const naturals = cards.filter((c) => c.rank !== 'JOKER');

  if (jokers.length > 0 && !allowJoker) return false;
  if (naturals.length === 0) return false; // all jokers cannot form a run alone

  const suit = naturals[0].suit;
  if (!naturals.every((c) => c.suit === suit)) return false;

  // Check low Ace
  if (canFormRunSequence(naturals, jokers.length, false)) return true;
  // Check high Ace
  if (canFormRunSequence(naturals, jokers.length, true)) return true;

  return false;
}

function canFormRunSequence(naturals: Card[], jokerCount: number, aceHigh: boolean): boolean {
  const nums = Array.from(new Set(naturals.map((c) => rankToNumber(c.rank, aceHigh)))).sort((a, b) => a - b);
  // If there are duplicate naturals in the run, not a valid run
  if (nums.length !== naturals.length) return false;

  const min = nums[0];
  const max = nums[nums.length - 1];
  const span = max - min + 1;
  const totalCards = naturals.length + jokerCount;

  // Needed fillers inside the span
  const neededInside = span - naturals.length;
  if (neededInside > jokerCount) return false;

  // If totalCards exceeds maximum possible card span (1 to 14 is max 14 cards)
  if (totalCards > 14) return false;

  // Jokers can fill inside and extend either ends, provided it stays within bounds [1..14]
  const remainingJokers = jokerCount - neededInside;
  const availableLow = aceHigh ? min - 10 : min - 1; // can't go below 1 (or 10 if ace high)
  const availableHigh = aceHigh ? 14 - max : 13 - max;
  return remainingJokers <= Math.max(0, availableLow) + Math.max(0, availableHigh);
}

/**
 * Checks if cards form a valid Tris (exactly 3 cards of same rank with 3 different suits).
 * If allowJoker is true, jokers can substitute for missing cards.
 */
export function isValidTris(cards: Card[], allowJoker = false): boolean {
  if (cards.length !== 3) return false;

  const jokers = cards.filter((c) => c.rank === 'JOKER');
  const naturals = cards.filter((c) => c.rank !== 'JOKER');

  if (jokers.length > 0 && !allowJoker) return false;
  if (naturals.length === 0) return false;

  const rank = naturals[0].rank;
  if (!naturals.every((c) => c.rank === rank)) return false;

  // Naturals must have different suits (bunga berbeda)
  const suitSet = new Set(naturals.map((c) => c.suit));
  if (suitSet.size !== naturals.length) return false;

  return naturals.length + jokers.length === 3;
}

/**
 * Checks if cards form a valid Fourhand (exactly 4 cards of same rank with 4 different suits / pitingan).
 * If allowJoker is true, jokers can substitute for missing cards.
 */
export function isValidFourhand(cards: Card[], allowJoker = false): boolean {
  if (cards.length !== 4) return false;

  const jokers = cards.filter((c) => c.rank === 'JOKER');
  const naturals = cards.filter((c) => c.rank !== 'JOKER');

  if (jokers.length > 0 && !allowJoker) return false;
  if (naturals.length === 0) return false;

  const rank = naturals[0].rank;
  if (!naturals.every((c) => c.rank === rank)) return false;

  // Naturals must have different suits (4 bunga berbeda)
  const suitSet = new Set(naturals.map((c) => c.suit));
  if (suitSet.size !== naturals.length) return false;

  return naturals.length + jokers.length === 4;
}

/**
 * Calculates score for a meld
 */
export function calculateMeldPoints(meld: { type: MeldType; cards: Card[] }): number {
  let isLowAceDasar = false;
  if (meld.type === 'dasar4' || meld.type === 'run') {
    const ranks = meld.cards.map((c) => c.rank);
    if (ranks.includes('A') && (ranks.includes('2') || ranks.includes('3') || ranks.includes('4'))) {
      isLowAceDasar = true;
    }
  }

  let total = 0;
  for (const card of meld.cards) {
    total += getCardBasePoint(card, isLowAceDasar && card.rank === 'A');
  }
  return total;
}

export function getClosingBonus(closeCard: Card | null): number {
  if (!closeCard) return 0;
  if (closeCard.rank === 'JOKER') return 250;
  if (closeCard.rank === 'A') return 150;
  return 0;
}

export function sortHandBySuit(cards: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = {
    spade: 0,
    heart: 1,
    club: 2,
    diamond: 3,
    joker: 4,
  };

  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return rankToNumber(a.rank) - rankToNumber(b.rank);
  });
}

/**
 * Evaluates hand to find all possible valid melds using exact combinatorial search.
 * Tries to prioritize finding at least one Dasar 4, minimizing deadwood, and maximizing points.
 * Supports player's explicitly chosen Dasar 4 if provided.
 */
export function evaluateBestMelds(
  hand: Card[],
  customDasar4CardIds?: string[]
): {
  hasDasar4: boolean;
  melds: Meld[];
  deadwood: Card[];
} {
  if (hand.length === 0) {
    return { hasDasar4: false, melds: [], deadwood: [] };
  }

  // 1. If player specified a custom Dasar 4, check if it's valid
  if (customDasar4CardIds && customDasar4CardIds.length >= 4) {
    const customCards = hand.filter((c) => customDasar4CardIds.includes(c.id));
    if (customCards.length === customDasar4CardIds.length && isDasar4(customCards)) {
      const remainingCards = hand.filter((c) => !customDasar4CardIds.includes(c.id));
      const secondaryMelds = findOptimalSecondaryPartition(remainingCards, true);
      const dasarMeld: Meld = {
        type: 'dasar4',
        cards: customCards,
        points: calculateMeldPoints({ type: 'dasar4', cards: customCards }),
      };
      const allMelds = [dasarMeld, ...secondaryMelds];
      const meldedIds = new Set(allMelds.flatMap((m) => m.cards.map((c) => c.id)));
      const deadwood = hand.filter((c) => !meldedIds.has(c.id));
      return {
        hasDasar4: true,
        melds: allMelds,
        deadwood,
      };
    }
  }

  // 2. Gather all candidate Dasar 4
  const candidateDasar4List = findCandidateDasar4(hand);

  let bestResult: {
    hasDasar4: boolean;
    melds: Meld[];
    deadwood: Card[];
    netScore: number;
  } | null = null;

  // Try each candidate Dasar 4
  for (const dasarCards of candidateDasar4List) {
    const dasarMeld: Meld = {
      type: 'dasar4',
      cards: dasarCards,
      points: calculateMeldPoints({ type: 'dasar4', cards: dasarCards }),
    };

    const remainingCards = hand.filter((c) => !dasarCards.some((dc) => dc.id === c.id));
    const secondaryMelds = findOptimalSecondaryPartition(remainingCards, true);

    const allMelds = [dasarMeld, ...secondaryMelds];
    const meldedIds = new Set(allMelds.flatMap((m) => m.cards.map((c) => c.id)));
    const deadwood = hand.filter((c) => !meldedIds.has(c.id));
    const meldPoints = allMelds.reduce((sum, m) => sum + m.points, 0);
    const deadwoodPenalty = deadwood.reduce((sum, c) => sum + getCardBasePoint(c), 0);
    const netScore = meldPoints - deadwoodPenalty;

    // Prefer 0 deadwood, then higher net score
    if (
      !bestResult ||
      (deadwood.length === 0 && bestResult.deadwood.length > 0) ||
      (deadwood.length === bestResult.deadwood.length && netScore > bestResult.netScore) ||
      (deadwood.length < bestResult.deadwood.length && bestResult.deadwood.length > 0)
    ) {
      bestResult = {
        hasDasar4: true,
        melds: allMelds,
        deadwood,
        netScore,
      };
    }
  }

  // If no valid partition with Dasar 4 was found, or no Dasar 4 exists, evaluate without Dasar 4
  const noDasarMelds = findOptimalSecondaryPartition(hand, false);
  const meldedIds = new Set(noDasarMelds.flatMap((m) => m.cards.map((c) => c.id)));
  const deadwood = hand.filter((c) => !meldedIds.has(c.id));
  const meldPoints = noDasarMelds.reduce((sum, m) => sum + m.points, 0);
  const deadwoodPenalty = deadwood.reduce((sum, c) => sum + getCardBasePoint(c), 0);
  const netScore = meldPoints - deadwoodPenalty;

  if (!bestResult) {
    return {
      hasDasar4: false,
      melds: noDasarMelds,
      deadwood,
    };
  }

  return {
    hasDasar4: bestResult.hasDasar4,
    melds: bestResult.melds,
    deadwood: bestResult.deadwood,
  };
}

/**
 * Finds all candidate runs and tris in remaining cards, then explores disjoint combinations.
 */
function findOptimalSecondaryPartition(cards: Card[], allowJokers: boolean): Meld[] {
  if (cards.length < 3) return [];

  // 1. Enumerate all possible candidate melds (runs, fourhand, and tris)
  const candidateMelds: Meld[] = [];

  // Find all runs of size 3, 4, 5, 6
  for (let size = 3; size <= Math.min(6, cards.length); size++) {
    const combos = getCombinations(cards, size);
    for (const combo of combos) {
      if (isValidRun(combo, allowJokers)) {
        candidateMelds.push({
          type: 'run',
          cards: combo,
          points: calculateMeldPoints({ type: 'run', cards: combo }),
        });
      }
    }
  }

  // Find all Fourhand (size 4: 4 cards of same rank with 4 distinct suits)
  if (cards.length >= 4) {
    const combos4 = getCombinations(cards, 4);
    for (const combo of combos4) {
      if (isValidFourhand(combo, allowJokers)) {
        candidateMelds.push({
          type: 'fourhand',
          cards: combo,
          points: calculateMeldPoints({ type: 'fourhand', cards: combo }),
        });
      }
    }
  }

  // Find all Tris (size 3: 3 cards of same rank with 3 distinct suits)
  const combos3 = getCombinations(cards, 3);
  for (const combo of combos3) {
    if (isValidTris(combo, allowJokers)) {
      candidateMelds.push({
        type: 'tris',
        cards: combo,
        points: calculateMeldPoints({ type: 'tris', cards: combo }),
      });
    }
  }

  if (candidateMelds.length === 0) return [];

  // 2. Backtracking search to find mutually disjoint set of melds that maximizes covered cards and points
  let bestMelds: Meld[] = [];
  let maxCovered = 0;
  let maxPoints = -1;

  function backtrack(startIndex: number, currentChosen: Meld[], usedCardIds: Set<string>, currentPoints: number) {
    const covered = usedCardIds.size;
    if (covered > maxCovered || (covered === maxCovered && currentPoints > maxPoints)) {
      maxCovered = covered;
      maxPoints = currentPoints;
      bestMelds = [...currentChosen];
      // Early exit if all cards covered!
      if (covered === cards.length) return;
    }

    for (let i = startIndex; i < candidateMelds.length; i++) {
      const meld = candidateMelds[i];
      // Check if disjoint
      let overlaps = false;
      for (const c of meld.cards) {
        if (usedCardIds.has(c.id)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      // Choose
      const nextUsed = new Set(usedCardIds);
      for (const c of meld.cards) nextUsed.add(c.id);
      currentChosen.push(meld);

      backtrack(i + 1, currentChosen, nextUsed, currentPoints + meld.points);

      // Unchoose
      currentChosen.pop();

      if (maxCovered === cards.length) return;
    }
  }

  backtrack(0, [], new Set(), 0);
  return bestMelds;
}

/**
 * Finds all possible candidate Dasar 4 (>=4 pure consecutive cards of same suit)
 */
function findCandidateDasar4(cards: Card[]): Card[][] {
  const results: Card[][] = [];
  const naturals = cards.filter((c) => c.rank !== 'JOKER');

  // Group by suit
  for (const suit of SUITS) {
    const suitCards = naturals.filter((c) => c.suit === suit);
    if (suitCards.length < 4) continue;

    // Unique by rank for sequence checking
    const rankMap = new Map<string, Card[]>();
    for (const sc of suitCards) {
      if (!rankMap.has(sc.rank)) rankMap.set(sc.rank, []);
      rankMap.get(sc.rank)!.push(sc);
    }

    // Try both low Ace and high Ace
    for (const aceHigh of [false, true]) {
      const distinctRanks = Array.from(rankMap.keys()).sort(
        (a, b) => rankToNumber(a as Rank, aceHigh) - rankToNumber(b as Rank, aceHigh)
      );

      // Find all contiguous subsequences of length >= 4
      for (let i = 0; i < distinctRanks.length; i++) {
        const seq = [distinctRanks[i]];
        for (let j = i + 1; j < distinctRanks.length; j++) {
          const prevNum = rankToNumber(distinctRanks[j - 1] as Rank, aceHigh);
          const curNum = rankToNumber(distinctRanks[j] as Rank, aceHigh);
          if (curNum === prevNum + 1) {
            seq.push(distinctRanks[j]);
            if (seq.length >= 4) {
              // Pick one card for each rank
              const candidate = seq.map((r) => rankMap.get(r)![0]);
              results.push(candidate);
            }
          } else {
            break;
          }
        }
      }
    }
  }

  return results;
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0 || k > arr.length) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = getCombinations(tail, k - 1).map((c) => [head, ...c]);
  const withoutHead = getCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

/**
 * Poin pemenang utama game (1000 Poin)
 */
export const WINNING_SCORE = 1000;

export function check4Jokers(hand: Card[]): boolean {
  return hand.filter((c) => c.rank === 'JOKER' || c.suit === 'joker').length >= 4;
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spade':
      return '♠';
    case 'heart':
      return '♥';
    case 'diamond':
      return '♦';
    case 'club':
      return '♣';
    case 'joker':
      return '🃏';
  }
}

export function numberToRank(num: number, aceHigh = false): Rank {
  if (num === 1 && !aceHigh) return 'A';
  if (num === 14 && aceHigh) return 'A';
  if (num === 11) return 'J';
  if (num === 12) return 'Q';
  if (num === 13) return 'K';
  return String(num) as Rank;
}

/**
 * Calculates complete score breakdown according to rules:
 * Rule 5: 2-10 = 5 points, JQK = 10, Ace = 15, Joker = 25 (if Ace in A234 Dasar, Ace = 5).
 * Rule 9: If Dasar 4 exists -> valid melds score POSITIVE (+), deadwood is NEGATIVE (-).
 *         If NO Dasar 4 -> ALL cards in hand count NEGATIVE (-)!
 * Poin untuk kartu penutup: langsung nilai tertinggi kartu (Ace +150, Joker +250), tidak dihitung poin dasarnya.
 * Aturan Jackpot 4 Joker: Jika memiliki 4 Joker, langsung mendapatkan 1000 poin!
 */
export function calculatePlayerScore(
  hand: Card[],
  customDasar4CardIds?: string[],
  isClosingWinner = false,
  closeCard?: Card | null
): PlayerScoreBreakdown {
  // 1. Aturan Jackpot 4 Joker (1000 Poin)
  if (check4Jokers(hand)) {
    const jokers = hand.filter((c) => c.rank === 'JOKER' || c.suit === 'joker');
    return {
      hasDasar4: true,
      melds: [
        {
          type: 'tris',
          cards: jokers,
          points: 1000,
        },
      ],
      meldPoints: 1000,
      deadwood: [],
      deadwoodPoints: 0,
      closingBonus: 0,
      totalPoints: 1000,
      reason: '🌟 JACKPOT 4 JOKER! Langsung mendapatkan 1000 poin penuh!',
    };
  }

  // 2. Poin kartu penutup tidak dihitung poin dasarnya, melainkan langsung poin tertingginya
  // Oleh karena itu, jika pemenang menutup kartu, closeCard tidak dihitung sebagai kartu sisa (deadwood)
  const scoringHand =
    isClosingWinner && closeCard
      ? hand.filter((c) => c.id !== closeCard.id)
      : hand;

  const evalResult = evaluateBestMelds(scoringHand, customDasar4CardIds);
  const hasDasar4 = evalResult.hasDasar4;
  const closingBonus = isClosingWinner && closeCard ? getClosingBonus(closeCard) : 0;

  if (!hasDasar4) {
    // Minus whole hand!
    const totalNegative = scoringHand.reduce((sum, c) => sum + getCardBasePoint(c), 0);
    return {
      hasDasar4: false,
      melds: [],
      meldPoints: 0,
      deadwood: scoringHand,
      deadwoodPoints: totalNegative,
      closingBonus: 0,
      totalPoints: -totalNegative,
      reason: 'Tidak memiliki Dasar 4 (Semua kartu bernilai minus)',
    };
  }

  const meldPoints = evalResult.melds.reduce((sum, m) => sum + m.points, 0);
  const deadwoodPoints = evalResult.deadwood.reduce((sum, c) => sum + getCardBasePoint(c), 0);
  const totalPoints = meldPoints - deadwoodPoints + closingBonus;

  let reason = `Dasar 4 terpenuhi (+${meldPoints} poin kombinasi, -${deadwoodPoints} kartu sisa)`;
  if (closingBonus > 0) {
    reason += ` + Poin Kartu Penutup Tertinggi (${closeCard?.rank === 'JOKER' ? 'Joker +250' : 'Ace +150'})`;
  }

  return {
    hasDasar4: true,
    melds: evalResult.melds,
    meldPoints,
    deadwood: evalResult.deadwood,
    deadwoodPoints,
    closingBonus,
    totalPoints,
    reason,
  };
}

/**
 * Rule 7: Checks if a player can "Tutup" (Close / Win).
 * Conditions:
 * 1. Player has 4 Jokers (Instant Win 1000 Poin), OR
 * 2. Player has 13 cards (12 melded cards with Dasar 4/5 + 1 closing card Ace or Joker), OR
 * 3. Player has 14 cards (after drawing, 13 melded cards with Dasar 4/5 + 1 closing card Ace or Joker).
 */
export function checkCanTutup(
  hand: Card[],
  customDasar4CardIds?: string[]
): {
  canClose: boolean;
  closingCardCandidates: Card[];
  meldSetup?: Meld[];
  is4JokerJackpot?: boolean;
} {
  // 4 Joker Jackpot Instant Win check!
  if (check4Jokers(hand)) {
    const jokers = hand.filter((c) => c.rank === 'JOKER' || c.suit === 'joker');
    return {
      canClose: true,
      closingCardCandidates: jokers,
      is4JokerJackpot: true,
    };
  }

  // Support closing with either 13 cards (12 melded + 1 close card) or 14 cards (13 melded + 1 close card)
  if (hand.length !== 13 && hand.length !== 14) {
    return { canClose: false, closingCardCandidates: [] };
  }

  const closingCandidates: Card[] = [];
  let bestMeldSetup: Meld[] | undefined = undefined;

  // Find all cards in hand that are Ace or Joker
  const potentialCloseCards = hand.filter((c) => c.rank === 'A' || c.rank === 'JOKER');
  if (potentialCloseCards.length === 0) {
    return { canClose: false, closingCardCandidates: [] };
  }

  const targetMeldedCount = hand.length - 1; // 12 cards if hand is 13, 13 cards if hand is 14

  // Check for each candidate Ace or Joker: if we separate it as closing card, can all other cards be melded without deadwood?
  for (const closeCard of potentialCloseCards) {
    const remainingCards = hand.filter((c) => c.id !== closeCard.id);
    const evalRem = evaluateBestMelds(remainingCards, customDasar4CardIds);

    // To win completely, must have Dasar (length >= 4) and 0 deadwood (all remaining cards melded)
    if (evalRem.hasDasar4 && evalRem.deadwood.length === 0) {
      const meldedCount = evalRem.melds.reduce((sum, m) => sum + m.cards.length, 0);
      if (meldedCount === targetMeldedCount) {
        closingCandidates.push(closeCard);
        bestMeldSetup = evalRem.melds;
      }
    }
  }

  return {
    canClose: closingCandidates.length > 0,
    closingCardCandidates: closingCandidates,
    meldSetup: bestMeldSetup,
  };
}

export interface HandTutupStatus {
  canClose: boolean;
  hasDasar4: boolean;
  deadwoodCount: number;
  deadwoodPoints: number;
  meldPoints: number;
  totalPoints: number;
  is13AllPlus: boolean;
  closingCardCandidates: Card[];
  statusText: string;
  detailText: string;
}

/**
 * Evaluates hand status regarding closing conditions:
 * - Dasar 4/5 is mandatory (minimal 4 urutan sejenis murni)
 * - All other cards must be formed into valid melds (Dasar, Run 3+, Tris, Fourhand) -> deadwood = 0
 * - Closing card must be Ace or Joker
 */
export function evaluateHandTutupStatus(
  hand: Card[],
  customDasar4CardIds?: string[]
): HandTutupStatus {
  if (check4Jokers(hand)) {
    const jokers = hand.filter((c) => c.rank === 'JOKER' || c.suit === 'joker');
    return {
      canClose: true,
      hasDasar4: true,
      deadwoodCount: 0,
      deadwoodPoints: 0,
      meldPoints: 1000,
      totalPoints: 1000,
      is13AllPlus: true,
      closingCardCandidates: jokers,
      statusText: '🌟 4 JOKER JACKPOT (1000 POIN)',
      detailText: 'Memiliki 4 Joker! Langsung berhak klaim 1000 poin kemenangan.',
    };
  }

  const evalAll = evaluateBestMelds(hand, customDasar4CardIds);
  const scoreBreakdown = calculatePlayerScore(hand, customDasar4CardIds);
  const tutupCheck = checkCanTutup(hand, customDasar4CardIds);

  const deadwoodCount = evalAll.deadwood.length;
  const deadwoodPoints = scoreBreakdown.deadwoodPoints;
  const meldPoints = scoreBreakdown.meldPoints;

  // Jika kartu siap tutup (baik 13 kartu maupun 14 kartu)
  if (tutupCheck.canClose) {
    const candidateRanks = Array.from(new Set(tutupCheck.closingCardCandidates.map((c) => c.rank))).join(', ');
    return {
      canClose: true,
      hasDasar4: true,
      deadwoodCount: 0,
      deadwoodPoints: 0,
      meldPoints,
      totalPoints: scoreBreakdown.totalPoints,
      is13AllPlus: true,
      closingCardCandidates: tutupCheck.closingCardCandidates,
      statusText: `✓ Siap Tutup Permainan dengan Penutup (${candidateRanks})!`,
      detailText: `Semua kombinasi masuk pola sah (Dasar 4/5, Urutan 3, Tris, Fourhand) tanpa sisa. Kartu penutup: ${candidateRanks}.`,
    };
  }

  // Jika kartu 13 dan semua 13 kartu sudah membentuk pola tanpa sisa
  if (hand.length === 13 && evalAll.hasDasar4 && deadwoodCount === 0) {
    return {
      canClose: false,
      hasDasar4: true,
      deadwoodCount: 0,
      deadwoodPoints: 0,
      meldPoints,
      totalPoints: scoreBreakdown.totalPoints,
      is13AllPlus: true,
      closingCardCandidates: [],
      statusText: '✓ 13 Kartu Bernilai Plus Sempurna (Kurang 1 Penutup)',
      detailText: '13 kartu sudah masuk pola (0 sisa). Butuh ambil 1 kartu penutup (Ace atau Joker) untuk menang.',
    };
  }

  // Jika punya Dasar 4 tapi masih ada sisa kartu bernilai minus
  if (evalAll.hasDasar4) {
    return {
      canClose: false,
      hasDasar4: true,
      deadwoodCount,
      deadwoodPoints,
      meldPoints,
      totalPoints: scoreBreakdown.totalPoints,
      is13AllPlus: false,
      closingCardCandidates: [],
      statusText: `✓ Memiliki Dasar 4 (Plus: +${meldPoints}p, Sisa: -${deadwoodPoints}p)`,
      detailText: `⚠️ Belum bisa tutup! Masih ada ${deadwoodCount} kartu sisa (-${deadwoodPoints}p). Syarat tutup: semua kartu masuk pola (0 sisa) & penutup Ace/Joker.`,
    };
  }

  // Jika belum ada Dasar 4
  return {
    canClose: false,
    hasDasar4: false,
    deadwoodCount: hand.length,
    deadwoodPoints: scoreBreakdown.deadwoodPoints,
    meldPoints: 0,
    totalPoints: scoreBreakdown.totalPoints,
    is13AllPlus: false,
    closingCardCandidates: [],
    statusText: `✗ Belum Memiliki Dasar 4 (Semua Kartu Minus: -${scoreBreakdown.deadwoodPoints}p)`,
    detailText: 'Wajib mengumpulkan Dasar 4 (minimal 4 kartu sejenis berurutan murni tanpa Joker) agar kartu bernilai plus.',
  };
}

/**
 * Menganalisis kartu di tangan untuk mencari pola yang mendekati lengkap
 * dan memberikan saran kartu yang dapat disubstitusi oleh Joker.
 */
export function findJokerSuggestions(hand: Card[]): import('./types').JokerSuggestion[] {
  const jokers = hand.filter((c) => c.rank === 'JOKER' || c.suit === 'joker');
  if (jokers.length === 0) return [];

  const naturals = hand.filter((c) => c.rank !== 'JOKER' && c.suit !== 'joker');
  const suggestions: import('./types').JokerSuggestion[] = [];
  const primaryJoker = jokers[0];

  // 1. Peluang Pola Tris (Angka Sama, Bunga Berbeda)
  const rankGroups = new Map<Rank, Card[]>();
  for (const c of naturals) {
    if (!rankGroups.has(c.rank)) rankGroups.set(c.rank, []);
    rankGroups.get(c.rank)!.push(c);
  }

  for (const [rank, cards] of rankGroups.entries()) {
    // Cari kartu dengan bunga berbeda
    const distinctSuits = new Map<Suit, Card>();
    for (const c of cards) {
      if (!distinctSuits.has(c.suit)) distinctSuits.set(c.suit, c);
    }
    const distinctCards = Array.from(distinctSuits.values());

    // Pasangan 2 kartu -> Joker melengkapi Tris 3 kartu
    if (distinctCards.length >= 2) {
      const pair = distinctCards.slice(0, 2);
      const usedSuits = new Set(pair.map((c) => c.suit));
      const missingSuit = SUITS.find((s) => !usedSuits.has(s)) || 'heart';
      const pts = pair.reduce((sum, c) => sum + getCardBasePoint(c), 0) + getCardBasePoint(pair[0]);

      suggestions.push({
        id: `tris_${rank}_${pair.map((c) => c.id).join('_')}`,
        type: 'tris',
        title: `Tris Angka ${rank}`,
        description: `Joker menjadi ${rank}${getSuitSymbol(missingSuit)} melengkapi Tris (${pair.map((c) => c.rank + getSuitSymbol(c.suit)).join(', ')})`,
        jokerCard: primaryJoker,
        naturalCards: pair,
        allMeldCards: [...pair, primaryJoker],
        asCardDescription: `${rank}${getSuitSymbol(missingSuit)}`,
        points: pts,
      });
    }

    // 3 kartu angka sama -> Joker melengkapi 4 kartu (Quad)
    if (distinctCards.length === 3) {
      const triple = distinctCards.slice(0, 3);
      const usedSuits = new Set(triple.map((c) => c.suit));
      const missingSuit = SUITS.find((s) => !usedSuits.has(s)) || 'diamond';
      const pts = triple.reduce((sum, c) => sum + getCardBasePoint(c), 0) + getCardBasePoint(triple[0]);

      suggestions.push({
        id: `tris4_${rank}_${triple.map((c) => c.id).join('_')}`,
        type: 'tris',
        title: `Kombinasi 4 Kartu ${rank}`,
        description: `Joker menjadi ${rank}${getSuitSymbol(missingSuit)} melengkapi 4 kartu sejenis (${triple.map((c) => c.rank + getSuitSymbol(c.suit)).join(', ')})`,
        jokerCard: primaryJoker,
        naturalCards: triple,
        allMeldCards: [...triple, primaryJoker],
        asCardDescription: `${rank}${getSuitSymbol(missingSuit)}`,
        points: pts,
      });
    }
  }

  // 2. Peluang Pola Urutan / Run (Bunga Sama, Angka Berurutan)
  for (const suit of SUITS) {
    const suitCards = naturals.filter((c) => c.suit === suit);
    if (suitCards.length < 2) continue;

    // Unik per rank
    const uniqueByRank = new Map<Rank, Card>();
    for (const c of suitCards) {
      if (!uniqueByRank.has(c.rank)) uniqueByRank.set(c.rank, c);
    }
    const distinctList = Array.from(uniqueByRank.values());

    for (const aceHigh of [false, true]) {
      const sorted = [...distinctList].sort(
        (a, b) => rankToNumber(a.rank, aceHigh) - rankToNumber(b.rank, aceHigh)
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        const c1 = sorted[i];
        const c2 = sorted[i + 1];
        const n1 = rankToNumber(c1.rank, aceHigh);
        const n2 = rankToNumber(c2.rank, aceHigh);
        const diff = n2 - n1;

        // Celah 1 angka di tengah (misal 5 dan 7 -> Joker isi 6)
        if (diff === 2) {
          const filledNum = n1 + 1;
          const filledRank = numberToRank(filledNum, aceHigh);
          const pts =
            getCardBasePoint(c1) +
            getCardBasePoint(c2) +
            (filledRank === 'A' ? (aceHigh ? 15 : 5) : filledNum >= 11 ? 10 : 5);

          suggestions.push({
            id: `run_gap_${c1.id}_${c2.id}_${aceHigh ? 'high' : 'low'}`,
            type: 'run',
            title: `Urutan ${c1.rank}-${filledRank}-${c2.rank} ${getSuitSymbol(suit)}`,
            description: `Joker mengisi ${filledRank}${getSuitSymbol(suit)} di antara ${c1.rank}${getSuitSymbol(suit)} dan ${c2.rank}${getSuitSymbol(suit)}`,
            jokerCard: primaryJoker,
            naturalCards: [c1, c2],
            allMeldCards: [c1, primaryJoker, c2],
            asCardDescription: `${filledRank}${getSuitSymbol(suit)}`,
            points: pts,
          });
        }

        // Berurutan (misal 5 dan 6 -> Joker bisa isi awalan 4 atau akhiran 7)
        if (diff === 1) {
          // Isi awalan (sebelum c1)
          const minBound = aceHigh ? 10 : 1;
          if (n1 > minBound) {
            const filledRank = numberToRank(n1 - 1, aceHigh);
            suggestions.push({
              id: `run_below_${c1.id}_${c2.id}_${aceHigh ? 'high' : 'low'}`,
              type: 'run',
              title: `Urutan ${filledRank}-${c1.rank}-${c2.rank} ${getSuitSymbol(suit)}`,
              description: `Joker mengisi awalan ${filledRank}${getSuitSymbol(suit)} sebelum ${c1.rank}${getSuitSymbol(suit)}-${c2.rank}${getSuitSymbol(suit)}`,
              jokerCard: primaryJoker,
              naturalCards: [c1, c2],
              allMeldCards: [primaryJoker, c1, c2],
              asCardDescription: `${filledRank}${getSuitSymbol(suit)}`,
              points: 15,
            });
          }

          // Isi akhiran (setelah c2)
          const maxBound = aceHigh ? 14 : 13;
          if (n2 < maxBound) {
            const filledRank = numberToRank(n2 + 1, aceHigh);
            suggestions.push({
              id: `run_above_${c1.id}_${c2.id}_${aceHigh ? 'high' : 'low'}`,
              type: 'run',
              title: `Urutan ${c1.rank}-${c2.rank}-${filledRank} ${getSuitSymbol(suit)}`,
              description: `Joker mengisi akhiran ${filledRank}${getSuitSymbol(suit)} setelah ${c1.rank}${getSuitSymbol(suit)}-${c2.rank}${getSuitSymbol(suit)}`,
              jokerCard: primaryJoker,
              naturalCards: [c1, c2],
              allMeldCards: [c1, c2, primaryJoker],
              asCardDescription: `${filledRank}${getSuitSymbol(suit)}`,
              points: 15,
            });
          }
        }
      }

      // Periksa 3 kartu berurutan untuk diperpanjang menjadi 4 kartu
      for (let i = 0; i < sorted.length - 2; i++) {
        const c1 = sorted[i];
        const c2 = sorted[i + 1];
        const c3 = sorted[i + 2];
        const n1 = rankToNumber(c1.rank, aceHigh);
        const n2 = rankToNumber(c2.rank, aceHigh);
        const n3 = rankToNumber(c3.rank, aceHigh);

        if (n2 === n1 + 1 && n3 === n2 + 1) {
          const maxBound = aceHigh ? 14 : 13;
          if (n3 < maxBound) {
            const filledRank = numberToRank(n3 + 1, aceHigh);
            suggestions.push({
              id: `run4_above_${c1.id}_${c3.id}_${aceHigh ? 'high' : 'low'}`,
              type: 'run',
              title: `Urutan 4 Kartu ${getSuitSymbol(suit)}`,
              description: `Joker melengkapi ${c1.rank}-${c2.rank}-${c3.rank} menjadi 4 kartu (${filledRank}${getSuitSymbol(suit)})`,
              jokerCard: primaryJoker,
              naturalCards: [c1, c2, c3],
              allMeldCards: [c1, c2, c3, primaryJoker],
              asCardDescription: `${filledRank}${getSuitSymbol(suit)}`,
              points: 20,
            });
          }
        }
      }
    }
  }

  // Hapus duplikasi berdasarkan judul
  const seen = new Set<string>();
  const uniqueSuggestions: import('./types').JokerSuggestion[] = [];
  for (const s of suggestions) {
    if (!seen.has(s.title)) {
      seen.add(s.title);
      uniqueSuggestions.push(s);
    }
  }

  return uniqueSuggestions.sort((a, b) => b.points - a.points);
}

/**
 * Bot AI for decision making
 */
export function getBotAction(
  botHand: Card[],
  availableDiscard: Card | null,
  stockCount: number,
  playerCount: number
): {
  drawFrom: 'stock' | 'discard';
  cardToDiscardId: string;
  canClose: boolean;
  closingCardId?: string;
} {
  // 1. Decide Draw
  let drawFrom: 'stock' | 'discard' = 'stock';
  if (availableDiscard) {
    // Test if taking the discard significantly improves hand
    const currentEval = evaluateBestMelds(botHand);
    const testHandWithDiscard = [...botHand, availableDiscard];
    const newEval = evaluateBestMelds(testHandWithDiscard);

    // If it gives Dasar 4 when bot didn't have one, or increases meld points
    if (!currentEval.hasDasar4 && newEval.hasDasar4) {
      drawFrom = 'discard';
    } else if (newEval.melds.length > currentEval.melds.length) {
      drawFrom = 'discard';
    } else if (availableDiscard.rank === 'JOKER' || availableDiscard.rank === 'A') {
      // Ace and Joker are valuable for closing or points
      drawFrom = 'discard';
    }
  }

  // Fallback to stock if stock is available
  if (stockCount === 0 && availableDiscard) {
    drawFrom = 'discard';
  }

  // Mock hand after drawing
  const simulatedHand = [...botHand];
  if (drawFrom === 'discard' && availableDiscard) {
    simulatedHand.push(availableDiscard);
  } else if (botHand.length === 13) {
    // Placeholder card to simulate 14 cards if needed
    // In actual game flow, bot draws first, then discards.
  }

  // 2. Check if bot can close
  const tutupCheck = checkCanTutup(simulatedHand);
  if (tutupCheck.canClose && tutupCheck.closingCardCandidates.length > 0) {
    return {
      drawFrom,
      cardToDiscardId: tutupCheck.closingCardCandidates[0].id,
      canClose: true,
      closingCardId: tutupCheck.closingCardCandidates[0].id,
    };
  }

  // 3. Choose which card to discard
  const evalResult = evaluateBestMelds(simulatedHand);
  let cardToDiscard: Card;

  if (evalResult.deadwood.length > 0) {
    // Discard from deadwood! Pick high value deadwood or duplicate card
    const sortedDeadwood = [...evalResult.deadwood].sort((a, b) => {
      // Keep Ace and Joker if possible for future close
      if (a.rank === 'JOKER') return 1;
      if (b.rank === 'JOKER') return -1;
      if (a.rank === 'A') return 1;
      if (b.rank === 'A') return -1;
      return getCardBasePoint(b) - getCardBasePoint(a);
    });
    cardToDiscard = sortedDeadwood[0];
  } else {
    // If all melded, discard any card that isn't essential
    cardToDiscard = simulatedHand[simulatedHand.length - 1];
  }

  return {
    drawFrom,
    cardToDiscardId: cardToDiscard.id,
    canClose: false,
  };
}

/**
 * Aturan Tombol Tahan:
 * Tombol Tahan HANYA DAPAT DIGUNAKAN jika:
 * 1. Kurang Dasar 4 (memiliki 3 kartu berurutan sejenis yang butuh 1 kartu lagi untuk menjadi Dasar 4), ATAU
 * 2. Kurang 1 pola lagi (sudah memiliki Dasar 4 dan sisa kartu hanya butuh 1 pola/kartu lagi menuju tutup, atau kartu siap tutup).
 * Selain kondisi tersebut, tombol tahan TIDAK DAPAT digunakan.
 */
export function checkTahanEligibility(
  hand: Card[],
  customDasar4CardIds?: string[]
): TahanCheckResult {
  if (!hand || hand.length === 0) {
    return {
      canTahan: false,
      description: 'Kartu tangan kosong.',
    };
  }

  // 1. Jika sudah siap tutup (semua pola lengkap + kartu penutup) atau jackpot 4 joker
  const tutupCheck = checkCanTutup(hand, customDasar4CardIds);
  if (tutupCheck.canClose || check4Jokers(hand)) {
    return {
      canTahan: true,
      reason: 'kurang_1_pola',
      description: 'Kartu siap tutup! Wajib aktifkan Tahan sebelum menutup.',
    };
  }

  // 2. Periksa apakah sudah memiliki Dasar 4
  const evalResult = evaluateBestMelds(hand, customDasar4CardIds);
  if (evalResult.hasDasar4) {
    const deadwood = evalResult.deadwood;

    // Jika deadwood tinggal 0 atau 1 kartu, jelas kurang 1 kartu penutup / langkah tutup
    if (deadwood.length <= 1) {
      return {
        canTahan: true,
        reason: 'kurang_1_pola',
        description: 'Kurang 1 pola lagi (Dasar 4 terpenuhi, tinggal 1 kartu penutup).',
      };
    }

    // Jika deadwood memiliki 2 atau 3 kartu, periksa apakah ada pasangan (Tris potensial) atau 2 kartu berurutan (Run potensial)
    const deadwoodNaturals = deadwood.filter((c) => c.rank !== 'JOKER' && c.suit !== 'joker');
    const hasJokerInDeadwood = deadwood.some((c) => c.rank === 'JOKER' || c.suit === 'joker');

    if (hasJokerInDeadwood) {
      return {
        canTahan: true,
        reason: 'kurang_1_pola',
        description: 'Kurang 1 pola lagi (memiliki Joker cadangan untuk melengkapi pola).',
      };
    }

    // Cek pasangan angka sama (calon Tris)
    const rankCounts = new Map<Rank, number>();
    for (const c of deadwoodNaturals) {
      rankCounts.set(c.rank, (rankCounts.get(c.rank) || 0) + 1);
      if ((rankCounts.get(c.rank) || 0) >= 2) {
        return {
          canTahan: true,
          reason: 'kurang_1_pola',
          description: `Kurang 1 pola lagi (Dasar 4 terpenuhi, punya pasangan ${c.rank} butuh 1 untuk Tris).`,
        };
      }
    }

    // Cek 2 kartu berurutan / celah 1 sejenis (calon Run)
    for (const suit of SUITS) {
      const sc = deadwoodNaturals.filter((c) => c.suit === suit);
      if (sc.length >= 2) {
        for (const aceHigh of [false, true]) {
          const sorted = [...sc].sort((a, b) => rankToNumber(a.rank, aceHigh) - rankToNumber(b.rank, aceHigh));
          for (let i = 0; i < sorted.length - 1; i++) {
            const diff = rankToNumber(sorted[i + 1].rank, aceHigh) - rankToNumber(sorted[i].rank, aceHigh);
            if (diff === 1 || diff === 2) {
              return {
                canTahan: true,
                reason: 'kurang_1_pola',
                description: `Kurang 1 pola lagi (Dasar 4 terpenuhi, punya urutan ${getSuitSymbol(suit)} butuh 1 kartu untuk Run).`,
              };
            }
          }
        }
      }
    }

    // Jika Dasar 4 terpenuhi dan sisa kartu deadwood <= 2 (misal tinggal buang 1)
    if (deadwood.length <= 2) {
      return {
        canTahan: true,
        reason: 'kurang_1_pola',
        description: 'Kurang 1 pola lagi (hanya tersisa sedikit kartu lepas).',
      };
    }
  }

  // 3. Jika belum memiliki Dasar 4, periksa Kondisi: "Kurang Dasar 4"
  // Mencari 3 kartu sejenis tanpa Joker yang hanya butuh 1 kartu lagi untuk menjadi Dasar 4 (4 kartu urut murni)
  const naturals = hand.filter((c) => c.rank !== 'JOKER' && c.suit !== 'joker');
  for (const suit of SUITS) {
    const suitCards = naturals.filter((c) => c.suit === suit);
    if (suitCards.length < 3) continue;

    const rankMap = new Map<Rank, Card>();
    for (const c of suitCards) {
      if (!rankMap.has(c.rank)) rankMap.set(c.rank, c);
    }
    const distinctRanks = Array.from(rankMap.keys());
    if (distinctRanks.length < 3) continue;

    for (const aceHigh of [false, true]) {
      const nums = distinctRanks
        .map((r) => rankToNumber(r, aceHigh))
        .sort((a, b) => a - b);

      // Cari kombinasi 3 kartu
      for (let i = 0; i < nums.length - 2; i++) {
        for (let j = i + 1; j < nums.length - 1; j++) {
          for (let k = j + 1; k < nums.length; k++) {
            const n1 = nums[i];
            const n2 = nums[j];
            const n3 = nums[k];
            const span = n3 - n1 + 1;

            // 3 kartu berurutan langsung: n1, n1+1, n1+2 (span 3)
            // Bisa diperpanjang dengan kartu ke-4 di n1-1 atau n3+1
            if (n2 === n1 + 1 && n3 === n2 + 1) {
              const minBound = aceHigh ? 10 : 1;
              const maxBound = aceHigh ? 14 : 13;
              if (n1 > minBound || n3 < maxBound) {
                return {
                  canTahan: true,
                  reason: 'kurang_dasar_4',
                  description: `Kurang Dasar 4 (memiliki 3 kartu urut ${getSuitSymbol(suit)}, butuh 1 kartu lagi).`,
                };
              }
            }

            // 3 kartu dengan 1 celah dalam rentang 4 kartu: misal [5,6,8] atau [5,7,8] (span 4)
            if (span === 4) {
              return {
                canTahan: true,
                reason: 'kurang_dasar_4',
                description: `Kurang Dasar 4 (rentang 4 kartu ${getSuitSymbol(suit)} butuh 1 kartu pengisi).`,
              };
            }
          }
        }
      }
    }
  }

  // 4. Selain itu, tombol tahan TIDAK DAPAT digunakan
  return {
    canTahan: false,
    description: 'Tombol Tahan tidak dapat digunakan. Hanya aktif jika kurang Dasar 4 atau kurang 1 pola lagi.',
  };
}

