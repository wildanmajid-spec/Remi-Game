import test from 'node:test';
import assert from 'node:assert/strict';

// Helper simulating security rule invariants
function isValidRoomCode(id: string): boolean {
  return typeof id === 'string' && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

function validateRoomPayload(payload: any): { allowed: boolean; reason?: string } {
  if (!payload || typeof payload !== 'object') {
    return { allowed: false, reason: 'Payload must be an object' };
  }
  if (!isValidRoomCode(payload.roomCode)) {
    return { allowed: false, reason: 'Invalid roomCode id format' };
  }
  if (!payload.hostUid || typeof payload.hostUid !== 'string' || payload.hostUid.length > 128) {
    return { allowed: false, reason: 'Invalid or missing hostUid' };
  }
  if (!payload.gameState || typeof payload.gameState !== 'object') {
    return { allowed: false, reason: 'Missing gameState map' };
  }
  if (payload.roomCode !== payload.targetDocId) {
    return { allowed: false, reason: 'roomCode in document must match path' };
  }
  if (!payload.isVerifiedUser) {
    return { allowed: false, reason: 'User must be verified to write' };
  }
  return { allowed: true };
}

test('Dirty Dozen Test 1: Unauthenticated write is denied', () => {
  const result = validateRoomPayload({
    roomCode: 'REMI-4AB123',
    targetDocId: 'REMI-4AB123',
    hostUid: 'user_1',
    gameState: {},
    isVerifiedUser: false, // unauthenticated / unverified
  });
  assert.equal(result.allowed, false);
});

test('Dirty Dozen Test 2: Invalid room code id with path traversal is denied', () => {
  const result = validateRoomPayload({
    roomCode: '../admin_secret',
    targetDocId: '../admin_secret',
    hostUid: 'user_1',
    gameState: {},
    isVerifiedUser: true,
  });
  assert.equal(result.allowed, false);
});

test('Dirty Dozen Test 3: Path and payload roomCode mismatch is denied', () => {
  const result = validateRoomPayload({
    roomCode: 'ROOM_A',
    targetDocId: 'ROOM_B',
    hostUid: 'user_1',
    gameState: {},
    isVerifiedUser: true,
  });
  assert.equal(result.allowed, false);
});

test('Dirty Dozen Test 4: Missing gameState is denied', () => {
  const result = validateRoomPayload({
    roomCode: 'REMI-4AB123',
    targetDocId: 'REMI-4AB123',
    hostUid: 'user_1',
    isVerifiedUser: true,
  });
  assert.equal(result.allowed, false);
});

test('Dirty Dozen Test 5: Valid room payload passes validation', () => {
  const result = validateRoomPayload({
    roomCode: 'REMI-4AB123',
    targetDocId: 'REMI-4AB123',
    hostUid: 'user_1',
    gameState: { stage: 'playing', players: [] },
    isVerifiedUser: true,
  });
  assert.equal(result.allowed, true);
});
