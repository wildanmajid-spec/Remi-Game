import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { GameState, ChatMessage } from './game/types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID (CRITICAL: Required for AI Studio Firestore)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Operation Types for error diagnosis
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Throws structured Firestore error for diagnostics
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate connection to Firestore at boot time
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently offline or unreachable.');
    }
    return false;
  }
}

/**
 * Sign in using Google popup
 */
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    console.error('Google Sign In failed:', err);
    throw err;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Persist/Sync GameState to Firebase Firestore Room
 */
export async function syncGameStateToFirebase(
  roomCode: string,
  state: GameState,
  actionDescription?: string
): Promise<void> {
  if (!roomCode) return;
  const path = `rooms/${roomCode}`;
  try {
    const docRef = doc(db, 'rooms', roomCode);
    const hostUid = state.hostUid || auth.currentUser?.uid || 'unknown_host';
    const playerUids = state.players
      .filter((p) => p.isOccupied && p.uid)
      .map((p) => p.uid as string);

    // Deep clone and clean undefined values
    const cleanedState = JSON.parse(JSON.stringify(state));

    await setDoc(
      docRef,
      {
        roomCode,
        hostUid,
        playerUids,
        gameState: cleanedState,
        lastAction: actionDescription || state.lastAction || 'Perubahan meja',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Real-time listener for room changes across devices
 */
export function subscribeToFirebaseRoom(
  roomCode: string,
  onRemoteUpdate: (remoteState: GameState, lastAction?: string) => void,
  onError?: (error: Error) => void
): () => void {
  const path = `rooms/${roomCode}`;
  const docRef = doc(db, 'rooms', roomCode);

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.gameState) {
          onRemoteUpdate(data.gameState as GameState, data.lastAction as string);
        }
      }
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return unsubscribe;
}

/**
 * Fetch initial room data from Firestore
 */
export async function fetchFirebaseRoom(roomCode: string): Promise<GameState | null> {
  const path = `rooms/${roomCode}`;
  try {
    const docRef = doc(db, 'rooms', roomCode);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data?.gameState as GameState) || null;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Send real-time chat message to Firebase Firestore room
 */
export async function sendRoomChatMessage(
  roomCode: string,
  message: ChatMessage
): Promise<void> {
  if (!roomCode) return;
  const path = `rooms/${roomCode}`;
  try {
    const docRef = doc(db, 'rooms', roomCode);
    await setDoc(
      docRef,
      {
        gameState: {
          chatMessages: arrayUnion(message),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}


