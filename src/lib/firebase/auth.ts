import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  onAuthStateChanged,
  User,
  Unsubscribe,
} from 'firebase/auth';
import { auth, googleAuthProvider } from './client';
import { handleAuthError } from './authErrors';

/**
 * Clean, production-grade Firebase Authentication Services.
 */

// Basic email regex pattern for client pre-validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email & Password Registration
 * Enforces pre-call validation, handles provider restrictions, and updates user profile.
 */
export async function signUpWithEmail(email: string, pass: string, displayName?: string): Promise<User> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  if (!pass || pass.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (displayName && displayName.trim() && cred.user) {
      try {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      } catch (profileErr) {
        console.warn('Profile name update notice:', profileErr);
      }
    }
    return cred.user;
  } catch (error) {
    handleAuthError(error, 'signUp', { emailDomain: cleanEmail.split('@')[1] });
    throw error;
  }
}

/**
 * Email & Password Sign-In
 * Enforces pre-call validation and authenticates directly against Firebase.
 */
export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  if (!pass) {
    throw new Error('Please enter your password.');
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return cred.user;
  } catch (error) {
    handleAuthError(error, 'signIn', { emailDomain: cleanEmail.split('@')[1] });
    throw error;
  }
}

/**
 * Google Sign-In with Popup
 * Gracefully handles popup closure, unauthorized domains, and popup blocking fallbacks.
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    return result.user;
  } catch (error: any) {
    // If user deliberately closed the popup or clicked outside, do not treat as a system error
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('cancelled-popup-request')
    ) {
      return null;
    }

    handleAuthError(error, 'signInWithGoogle');

    // If popup is blocked by browser policy or within iframe context, attempt redirect flow
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/operation-not-supported-in-this-environment' ||
      error?.message?.includes('popup-blocked')
    ) {
      console.warn('Popup blocked, attempting signInWithRedirect fallback...');
      try {
        await signInWithRedirect(auth, googleAuthProvider);
        return null;
      } catch (redirectErr) {
        handleAuthError(redirectErr, 'signInWithRedirect');
        throw redirectErr;
      }
    }

    throw error;
  }
}

/**
 * Check and process any pending redirect authentication results.
 */
export async function checkRedirectAuthResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (error) {
    handleAuthError(error, 'checkRedirectAuthResult');
    return null;
  }
}

/**
 * Dispatch Password Reset Email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  try {
    await fbSendPasswordResetEmail(auth, cleanEmail);
  } catch (error) {
    handleAuthError(error, 'sendPasswordReset', { emailDomain: cleanEmail.split('@')[1] });
    throw error;
  }
}

/**
 * User Sign-Out
 */
export async function signOutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (error) {
    handleAuthError(error, 'signOut');
    throw error;
  }
}

/**
 * Auth State Change Listener
 */
export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
