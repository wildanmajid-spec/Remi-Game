# Remi Indonesia - Firestore Security Specification

## 1. Data Invariants
1. Room paths `/rooms/{roomCode}` must have matching `roomCode` in document data.
2. Room IDs must be alphanumeric and hyphenated (e.g., `REMI-4AB123`) under 128 characters.
3. Unauthenticated writes must be strictly denied. Writes require a valid verified user (`request.auth.token.email_verified == true`).
4. Room creation requires the creator to be the `hostUid` (`request.resource.data.hostUid == request.auth.uid`).
5. Only connected players or host can update game state.
6. Deletion of a room is restricted to the room host.
7. Unbounded list queries are blocked (`allow list: if false`). Access is by direct room code (`get` and `onSnapshot`).
8. Connection test path `/test/connection` is read-only.

## 2. The Dirty Dozen Payloads (Target: PERMISSION_DENIED)
1. **Unauthenticated Read**: Attempting to read a room without auth token -> Denied.
2. **Unauthenticated Write**: Creating a room with `request.auth == null` -> Denied.
3. **Unverified Email**: Creating a room with unverified email account -> Denied.
4. **Host Spoofing**: User A creates a room setting `hostUid` to User B's UID -> Denied.
5. **Path Mismatch**: Creating `/rooms/ROOM_A` with `roomCode: "ROOM_B"` -> Denied.
6. **ID Injection / Poisoning**: Attempting to write to `/rooms/..%2Fadmin` or string > 128 chars -> Denied.
7. **Blanket Collection Query (List Scraping)**: Attempting `collection(db, 'rooms')` list query -> Denied.
8. **Host Deletion Theft**: Non-host player User B attempting to delete User A's room -> Denied.
9. **Corrupt Payload**: Attempting to create room without required `gameState` -> Denied.
10. **Global Catch-all Probe**: Attempting to read `/system_configs/keys` -> Denied.
11. **Impersonated Delete**: Anonymous or guest token attempting to delete active game -> Denied.
12. **Oversized Junk Injection**: Injecting megabyte payload strings into room state -> Denied.
