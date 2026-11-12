import { initializeApp,getApps,getApp,FirebaseApp } from 'firebase/app';
import { getAuth,GoogleAuthProvider,Auth } from 'firebase/auth';
import { getFirestore,Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Single, deliberate Firebase client initialization path.
 * Guarantees zero accidental duplicate Firebase App or Auth instances.
 */
let app: FirebaseApp;
if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
    measurementId: firebaseConfig.measurementId,
  });
}

export { app };
export const auth: Auth = getAuth(app);

// Named Firestore database instance (CRITICAL: Mandated by project configuration)
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Standard Google OAuth Provider
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});
