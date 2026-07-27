import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

export function firebaseReady(): boolean {
  return isFirebaseConfigured;
}

function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase is not configured. Paste your project credentials into src/lib/firebaseConfig.ts (see README).',
    );
  }
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getDb(): Firestore {
  if (!db) db = getFirestore(ensureApp());
  return db;
}

export function getStorageRef(): FirebaseStorage {
  if (!storage) storage = getStorage(ensureApp());
  return storage;
}

/**
 * Signs in anonymously so Firestore/Storage security rules can require auth.
 * Safe to call repeatedly; a no-op when Firebase is not yet configured.
 */
export async function ensureSignedIn(): Promise<void> {
  if (!isFirebaseConfigured) return;
  if (!auth) auth = getAuth(ensureApp());
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}
