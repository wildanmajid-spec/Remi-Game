import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRemiDeck,
  isDasar4,
  isValidRun,
  isValidTris,
  calculatePlayerScore,
  checkCanTutup,
  getCardBasePoint,
  evaluateBestMelds,
  check4Jokers,
  findJokerSuggestions,
  WINNING_SCORE,
} from './remiRules';
import { Card } from './types';

function makeCard(rank: any, suit: any, id: string = `c_${Math.random()}`): Card {
  return { id, rank, suit, deckIndex: 0 };
}

test('Rule 1: Deck contains 108 cards (2 standard decks + 4 jokers)', () => {
  const deck = createRemiDeck();
  assert.equal(deck.length, 108);

  const jokers = deck.filter((c) => c.rank === 'JOKER');
  assert.equal(jokers.length, 4);

  const spades = deck.filter((c) => c.suit === 'spade');
  assert.equal(spades.length, 26); // 13 * 2 decks
});

test('Rule 3 & 4: Dasar 4 requires at least 4 consecutive cards of same suit without Jokers', () => {
  const validDasar4 = [
    makeCard('4', 'heart'),
    makeCard('5', 'heart'),
    makeCard('6', 'heart'),
    makeCard('7', 'heart'),
  ];
  assert.equal(isDasar4(validDasar4), true);

  // 3 cards is NOT Dasar 4
  const only3Cards = [
    makeCard('4', 'heart'),
    makeCard('5', 'heart'),
    makeCard('6', 'heart'),
  ];
  assert.equal(isDasar4(only3Cards), false);

  // Dasar 4 with Joker is INVALID (Joker cannot substitute in Dasar 4)
  const withJoker = [
    makeCard('4', 'heart'),
    makeCard('JOKER', 'joker'),
    makeCard('6', 'heart'),
    makeCard('7', 'heart'),
  ];
  assert.equal(isDasar4(withJoker), false);

  // Low Ace Dasar 4: A-2-3-4
  const lowAceDasar = [
    makeCard('A', 'spade'),
    makeCard('2', 'spade'),
    makeCard('3', 'spade'),
    makeCard('4', 'spade'),
  ];
  assert.equal(isDasar4(lowAceDasar), true);

  // High Ace Dasar 4: J-Q-K-A
  const highAceDasar = [
    makeCard('J', 'diamond'),
    makeCard('Q', 'diamond'),
    makeCard('K', 'diamond'),
    makeCard('A', 'diamond'),
  ];
  assert.equal(isDasar4(highAceDasar), true);
});

test('Rule 4: Joker can substitute in Runs or Tris if allowJoker is enabled (after Dasar 4 exists)', () => {
  const runWithJoker = [
    makeCard('7', 'club'),
    makeCard('JOKER', 'joker'),
    makeCard('9', 'club'),
  ];
  assert.equal(isValidRun(runWithJoker, false), false);
  assert.equal(isValidRun(runWithJoker, true), true);

  const trisWithJoker = [
    makeCard('K', 'heart'),
    makeCard('K', 'spade'),
    makeCard('JOKER', 'joker'),
  ];
  assert.equal(isValidTris(trisWithJoker, false), false);
  assert.equal(isValidTris(trisWithJoker, true), true);

  // Duplicate suit in tris is invalid
  const invalidTris = [
    makeCard('K', 'heart'),
    makeCard('K', 'heart'),
    makeCard('K', 'spade'),
  ];
  assert.equal(isValidTris(invalidTris, true), false);
});

test('Rule 5: Card point values and special low Ace rule', () => {
  assert.equal(getCardBasePoint(makeCard('5', 'heart')), 5);
  assert.equal(getCardBasePoint(makeCard('10', 'spade')), 5);
  assert.equal(getCardBasePoint(makeCard('J', 'diamond')), 10);
  assert.equal(getCardBasePoint(makeCard('Q', 'club')), 10);
  assert.equal(getCardBasePoint(makeCard('K', 'heart')), 10);
  assert.equal(getCardBasePoint(makeCard('A', 'spade')), 15);
  assert.equal(getCardBasePoint(makeCard('A', 'spade'), true), 5); // A-2-3-4 counts 5
  assert.equal(getCardBasePoint(makeCard('JOKER', 'joker')), 25);
});

test('Rule 9: If NO Dasar 4, all cards count negative', () => {
  // Hand with some Tris and random cards, but NO Dasar 4
  const handWithoutDasar = [
    makeCard('7', 'spade'),
    makeCard('7', 'heart'),
    makeCard('7', 'diamond'), // 3 of a kind
    makeCard('2', 'club'),
    makeCard('K', 'spade'),
  ];

  const score = calculatePlayerScore(handWithoutDasar);
  assert.equal(score.hasDasar4, false);
  // Total hand: 7(5) + 7(5) + 7(5) + 2(5) + K(10) = 30 points -> -30
  assert.equal(score.totalPoints, -30);
});

test('Rule 9: If Dasar 4 exists, melds are positive and deadwood is negative', () => {
  const handWithDasar = [
    // Dasar 4: 5♥, 6♥, 7♥, 8♥ (5*4 = 20 pts)
    makeCard('5', 'heart'),
    makeCard('6', 'heart'),
    makeCard('7', 'heart'),
    makeCard('8', 'heart'),
    // Deadwood: K♠ (10 pts penalty)
    makeCard('K', 'spade'),
  ];

  const score = calculatePlayerScore(handWithDasar);
  assert.equal(score.hasDasar4, true);
  assert.equal(score.meldPoints, 20);
  assert.equal(score.deadwoodPoints, 10);
  assert.equal(score.totalPoints, 10); // 20 - 10 = +10
});

test('Rule 7: Tutup (Winning) requires 13 melded cards with Dasar 4, and closing card MUST be Ace or Joker', () => {
  // 14 cards hand:
  // Dasar 4: 4♠, 5♠, 6♠, 7♠ (4 cards)
  // Run: 9♦, 10♦, J♦ (3 cards)
  // Tris: Q♥, Q♣, Q♦ (3 cards)
  // Tris: 3♥, 3♠, 3♦ (3 cards)
  // Total 13 melded cards!
  // 14th card: Ace of Hearts (valid closing card)
  const winningHandWithAce: Card[] = [
    makeCard('4', 'spade', 'c1'),
    makeCard('5', 'spade', 'c2'),
    makeCard('6', 'spade', 'c3'),
    makeCard('7', 'spade', 'c4'),
    makeCard('9', 'diamond', 'c5'),
    makeCard('10', 'diamond', 'c6'),
    makeCard('J', 'diamond', 'c7'),
    makeCard('Q', 'heart', 'c8'),
    makeCard('Q', 'club', 'c9'),
    makeCard('Q', 'diamond', 'c10'),
    makeCard('3', 'heart', 'c11'),
    makeCard('3', 'spade', 'c12'),
    makeCard('3', 'diamond', 'c13'),
    makeCard('A', 'heart', 'c14'), // Closing Ace!
  ];

  const canCloseAce = checkCanTutup(winningHandWithAce);
  assert.equal(canCloseAce.canClose, true);
  assert.equal(canCloseAce.closingCardCandidates.some((c) => c.rank === 'A'), true);

  // If the 14th card is a 2 instead of Ace/Joker, CANNOT close!
  const handWith2 = [...winningHandWithAce.slice(0, 13), makeCard('2', 'club', 'c14_alt')];
  const canClose2 = checkCanTutup(handWith2);
  assert.equal(canClose2.canClose, false);
});

test('Rule 5: Ace in A-2-3-4 scores 5 points, but Ace in J-Q-K-A scores 15 points', () => {
  const lowAceHand = [
    makeCard('A', 'spade'),
    makeCard('2', 'spade'),
    makeCard('3', 'spade'),
    makeCard('4', 'spade'),
  ];
  const lowScore = calculatePlayerScore(lowAceHand);
  // Ace (5) + 2(5) + 3(5) + 4(5) = 20 pts
  assert.equal(lowScore.totalPoints, 20);

  const highAceHand = [
    makeCard('J', 'heart'),
    makeCard('Q', 'heart'),
    makeCard('K', 'heart'),
    makeCard('A', 'heart'),
  ];
  const highScore = calculatePlayerScore(highAceHand);
  // J(10) + Q(10) + K(10) + A(15) = 45 pts!
  assert.equal(highScore.totalPoints, 45);
});

test('New Requirement: Closing bonus +150 for Ace and +250 for Joker', () => {
  const hand = [
    makeCard('5', 'heart'),
    makeCard('6', 'heart'),
    makeCard('7', 'heart'),
    makeCard('8', 'heart'),
  ];
  const closeAce = makeCard('A', 'spade');
  const closeJoker = makeCard('JOKER', 'joker');

  const scoreAce = calculatePlayerScore(hand, undefined, true, closeAce);
  assert.equal(scoreAce.closingBonus, 150);
  assert.equal(scoreAce.totalPoints, 20 + 150); // 20 + 150 = 170

  const scoreJoker = calculatePlayerScore(hand, undefined, true, closeJoker);
  assert.equal(scoreJoker.closingBonus, 250);
  assert.equal(scoreJoker.totalPoints, 20 + 250); // 20 + 250 = 270
});

test('New Requirement: Player can explicitly pick custom Dasar 4', () => {
  // Hand has TWO possible Dasar 4:
  // 1. Spades: 2♠, 3♠, 4♠, 5♠
  // 2. Hearts: 7♥, 8♥, 9♥, 10♥
  const c1 = makeCard('2', 'spade', 's2');
  const c2 = makeCard('3', 'spade', 's3');
  const c3 = makeCard('4', 'spade', 's4');
  const c4 = makeCard('5', 'spade', 's5');
  const c5 = makeCard('7', 'heart', 'h7');
  const c6 = makeCard('8', 'heart', 'h8');
  const c7 = makeCard('9', 'heart', 'h9');
  const c8 = makeCard('10', 'heart', 'h10');

  const hand = [c1, c2, c3, c4, c5, c6, c7, c8];

  // If user chooses Hearts as their Dasar 4:
  const result = evaluateBestMelds(hand, ['h7', 'h8', 'h9', 'h10']);
  assert.equal(result.hasDasar4, true);
  const chosenDasar = result.melds.find((m) => m.type === 'dasar4');
  assert.equal(chosenDasar?.cards.every((c) => c.suit === 'heart'), true);
});

test('New Requirement: 4 Jokers Jackpot awards 1000 points immediately', () => {
  const handWith4Jokers = [
    makeCard('JOKER', 'joker', 'j1'),
    makeCard('JOKER', 'joker', 'j2'),
    makeCard('JOKER', 'joker', 'j3'),
    makeCard('JOKER', 'joker', 'j4'),
    makeCard('2', 'spade', 's2'),
    makeCard('7', 'heart', 'h7'),
  ];

  assert.equal(check4Jokers(handWith4Jokers), true);

  const score = calculatePlayerScore(handWith4Jokers);
  assert.equal(score.totalPoints, 1000);
  assert.equal(score.meldPoints, 1000);
  assert.equal(score.deadwoodPoints, 0);

  const canClose = checkCanTutup(handWith4Jokers);
  assert.equal(canClose.canClose, true);
  assert.equal(canClose.is4JokerJackpot, true);
});

test('New Requirement: Closing card is not penalized as deadwood and directly awards highest card value', () => {
  // Hand with Dasar 4: 5♥, 6♥, 7♥, 8♥ (20 pts)
  // Plus closing card Ace of Spades (+150 pts)
  const closeAce = makeCard('A', 'spade', 'close_ace');
  const fullHand = [
    makeCard('5', 'heart', 'h5'),
    makeCard('6', 'heart', 'h6'),
    makeCard('7', 'heart', 'h7'),
    makeCard('8', 'heart', 'h8'),
    closeAce,
  ];

  // When evaluated as closing winner, closeAce should NOT be counted in deadwood
  const score = calculatePlayerScore(fullHand, undefined, true, closeAce);
  assert.equal(score.deadwoodPoints, 0);
  assert.equal(score.meldPoints, 20);
  assert.equal(score.closingBonus, 150);
  assert.equal(score.totalPoints, 170); // 20 + 150 = 170

  // Closing with Joker (+250 pts)
  const closeJoker = makeCard('JOKER', 'joker', 'close_joker');
  const fullHandWithJoker = [
    makeCard('5', 'heart', 'h5_2'),
    makeCard('6', 'heart', 'h6_2'),
    makeCard('7', 'heart', 'h7_2'),
    makeCard('8', 'heart', 'h8_2'),
    closeJoker,
  ];
  const scoreJoker = calculatePlayerScore(fullHandWithJoker, undefined, true, closeJoker);
  assert.equal(scoreJoker.deadwoodPoints, 0);
  assert.equal(scoreJoker.closingBonus, 250);
  assert.equal(scoreJoker.totalPoints, 270); // 20 + 250 = 270
});

test('New Requirement: findJokerSuggestions finds gap in Run and pair in Tris', () => {
  const joker = makeCard('JOKER', 'joker', 'jk1');
  // Hand with 5♥, 7♥ (gap at 6♥) and K♠, K♥ (pair for Tris)
  const hand = [
    joker,
    makeCard('5', 'heart', 'h5'),
    makeCard('7', 'heart', 'h7'),
    makeCard('K', 'spade', 'ks'),
    makeCard('K', 'heart', 'kh'),
  ];

  const suggestions = findJokerSuggestions(hand);
  assert.ok(suggestions.length >= 2, 'Should find at least 2 suggestions');

  // Check Run gap suggestion (5♥ - 6♥ - 7♥)
  const runGap = suggestions.find((s) => s.type === 'run' && s.title.includes('5-6-7'));
  assert.ok(runGap, 'Should find 5-6-7 run gap suggestion');
  assert.equal(runGap?.asCardDescription, '6♥');

  // Check Tris pair suggestion (K Tris)
  const trisK = suggestions.find((s) => s.type === 'tris' && s.title.includes('Tris Angka K'));
  assert.ok(trisK, 'Should find K Tris suggestion');
});

test('New Requirement: WINNING_SCORE is 1000 points', () => {
  assert.equal(WINNING_SCORE, 1000);
});



