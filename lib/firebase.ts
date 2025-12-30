import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('[Firebase] Initializing Firebase with config:', {
  apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : 'missing',
  authDomain: firebaseConfig.authDomain || 'missing',
  projectId: firebaseConfig.projectId || 'missing',
  storageBucket: firebaseConfig.storageBucket || 'missing',
});

// Initialize Firebase
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  console.log('[Firebase] App initialized successfully');
} catch (error) {
  console.error('[Firebase] Failed to initialize app:', error);
  throw error;
}

let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  auth = getAuth(app);
  console.log('[Firebase] Auth initialized successfully');
} catch (error) {
  console.error('[Firebase] Failed to initialize auth:', error);
  throw error;
}

try {
  db = getFirestore(app);
  console.log('[Firebase] Firestore initialized successfully');
} catch (error) {
  console.error('[Firebase] Failed to initialize firestore:', error);
  throw error;
}

try {
  storage = getStorage(app);
  console.log('[Firebase] Storage initialized successfully');
} catch (error) {
  console.error('[Firebase] Failed to initialize storage:', error);
  throw error;
}

export { app, auth, db, storage };
