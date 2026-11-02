import { Card, Meld, MeldType, PlayerScoreBreakdown, Rank, Suit } from './types';

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
 * Checks if cards form a valid Tris (3 or 4 cards of same rank with different suits).
 * If allowJoker is true, jokers can substitute for missing cards.
 */
export function isValidTris(cards: Card[], allowJoker = false): boolean {
  if (cards.length < 3 || cards.length > 4) return false;

  const jokers = cards.filter((c) => c.rank === 'JOKER');
  const naturals = cards.filter((c) => c.rank !== 'JOKER');

  if (jokers.length > 0 && !allowJoker) return false;
  if (naturals.length === 0) return false;

  const rank = naturals[0].rank;
  if (!naturals.every((c) => c.rank === rank)) return false;

  // Naturals must have different suits (bunga berbeda)
  const suitSet = new Set(naturals.map((c) => c.suit));
  if (suitSet.size !== naturals.length) return false;

  // Total distinct suits cannot exceed 4
  if (naturals.length + jokers.length > 4) return false;

  return true;
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

  // 1. Enumerate all possible candidate melds (runs and tris)
  const candidateMelds: Meld[] = [];

  // Find all runs of size 3, 4, 5
  for (let size = 3; size <= Math.min(5, cards.length); size++) {
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

  // Find all tris of size 3, 4
  for (let size = 3; size <= Math.min(4, cards.length); size++) {
    const combos = getCombinations(cards, size);
    for (const combo of combos) {
      if (isValidTris(combo, allowJokers)) {
        candidateMelds.push({
          type: 'tris',
          cards: combo,
          points: calculateMeldPoints({ type: 'tris', cards: combo }),
        });
      }
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
 * Calculates complete score breakdown according to rules:
 * Rule 5: 2-10 = 5 points, JQK = 10, Ace = 15, Joker = 25 (if Ace in A234 Dasar, Ace = 5).
 * Rule 9: If Dasar 4 exists -> valid melds score POSITIVE (+), deadwood is NEGATIVE (-).
 *         If NO Dasar 4 -> ALL cards in hand count NEGATIVE (-)!
 * Closing bonus: Ace +150, Joker +250.
 */
export function calculatePlayerScore(
  hand: Card[],
  customDasar4CardIds?: string[],
  isClosingWinner = false,
  closeCard?: Card | null
): PlayerScoreBreakdown {
  const evalResult = evaluateBestMelds(hand, customDasar4CardIds);
  const hasDasar4 = evalResult.hasDasar4;
  const closingBonus = isClosingWinner && closeCard ? getClosingBonus(closeCard) : 0;

  if (!hasDasar4) {
    // Minus whole hand!
    const totalNegative = hand.reduce((sum, c) => sum + getCardBasePoint(c), 0);
    return {
      hasDasar4: false,
      melds: [],
      meldPoints: 0,
      deadwood: hand,
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
    reason += ` + Bonus Tutup (${closeCard?.rank === 'JOKER' ? 'Joker +250' : 'Ace +150'})`;
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
 * 1. Player has 14 cards (after drawing).
 * 2. Player can separate 13 cards into valid melds that MUST include at least one Dasar 4.
 * 3. The remaining 1 card (kartu penutup) MUST be an Ace or a Joker!
 */
export function checkCanTutup(
  hand: Card[],
  customDasar4CardIds?: string[]
): {
  canClose: boolean;
  closingCardCandidates: Card[];
  meldSetup?: Meld[];
} {
  if (hand.length !== 14) {
    return { canClose: false, closingCardCandidates: [] };
  }

  const closingCandidates: Card[] = [];
  let bestMeldSetup: Meld[] | undefined = undefined;

  // Find all cards in hand that are Ace or Joker
  const potentialCloseCards = hand.filter((c) => c.rank === 'A' || c.rank === 'JOKER');
  if (potentialCloseCards.length === 0) {
    return { canClose: false, closingCardCandidates: [] };
  }

  // Check for each candidate Ace or Joker: if we discard it, can the other 13 cards all be melded?
  for (const closeCard of potentialCloseCards) {
    const remaining13 = hand.filter((c) => c.id !== closeCard.id);
    const eval13 = evaluateBestMelds(remaining13, customDasar4CardIds);

    // To win completely, must have Dasar 4 and 0 deadwood (or all 13 cards in valid melds)
    if (eval13.hasDasar4 && eval13.deadwood.length === 0) {
      closingCandidates.push(closeCard);
      bestMeldSetup = eval13.melds;
    }
  }

  return {
    canClose: closingCandidates.length > 0,
    closingCardCandidates: closingCandidates,
    meldSetup: bestMeldSetup,
  };
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
