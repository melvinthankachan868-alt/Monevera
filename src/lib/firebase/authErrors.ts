import { FirebaseError } from 'firebase/app';
import { firebaseConfig } from './config';

export type AuthErrorCategory =
  | 'CONFIGURATION_ERROR'
  | 'CREDENTIAL_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'NETWORK_ERROR'
  | 'POPUP_FLOW_ERROR'
  | 'SECURITY_TOKEN_ERROR'
  | 'UNKNOWN_AUTH_ERROR';

export interface SanitizedAuthErrorInfo {
  operation: string;
  category: AuthErrorCategory;
  errorCode: string;
  errorMessage: string;
  targetProjectId: string;
  authDomain: string;
  hostname: string;
  isOnline: boolean;
  timestamp: string;
  userFacingMessage: string;
}

/**
 * Strips raw passwords, API keys, tokens, secrets, or hashes from any object or string.
 */
export function sanitizeLogValue(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    return val
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/(password|token|secret|key|hash)=[^&\s]+/gi, '$1=[REDACTED]');
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeLogValue);
  }
  if (typeof val === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (/password|token|secret|credential|auth|hash/i.test(k)) {
        cleaned[k] = '[REDACTED]';
      } else {
        cleaned[k] = sanitizeLogValue(v);
      }
    }
    return cleaned;
  }
  return val;
}

/**
 * Categorizes Firebase Authentication error codes into structured categories.
 */
export function categorizeAuthError(code: string): AuthErrorCategory {
  switch (code) {
    case 'auth/operation-not-allowed':
    case 'auth/unauthorized-domain':
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized':
    case 'auth/project-not-found':
    case 'auth/configuration-not-found':
      return 'CONFIGURATION_ERROR';

    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
    case 'auth/email-already-in-use':
    case 'auth/weak-password':
    case 'auth/user-disabled':
    case 'auth/account-exists-with-different-credential':
      return 'CREDENTIAL_ERROR';

    case 'auth/too-many-requests':
      return 'RATE_LIMIT_ERROR';

    case 'auth/network-request-failed':
      return 'NETWORK_ERROR';

    case 'auth/popup-blocked':
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'POPUP_FLOW_ERROR';

    case 'auth/user-token-expired':
    case 'auth/requires-recent-login':
    case 'auth/id-token-expired':
    case 'auth/id-token-revoked':
      return 'SECURITY_TOKEN_ERROR';

    default:
      return 'UNKNOWN_AUTH_ERROR';
  }
}

/**
 * Generates an accurate, actionable user-facing message based on the error code and runtime origin.
 */
export function getUserFacingAuthMessage(code: string, hostname: string, operation?: string): string {
  switch (code) {
    case 'auth/operation-not-allowed':
      return operation === 'signUp'
        ? `Account creation via email/password is currently rejected by Firebase (auth/operation-not-allowed). Please check provider enablement in project ${firebaseConfig.projectId}.`
        : `Email and password authentication was rejected by Firebase (auth/operation-not-allowed). Please check provider enablement in project ${firebaseConfig.projectId}.`;

    case 'auth/unauthorized-domain':
      return `This domain (${hostname}) is not authorized for OAuth in Firebase. Ensure '${hostname}' is registered in Firebase Console → Authentication → Settings → Authorized domains.`;

    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';

    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials and try again.';

    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';

    case 'auth/invalid-email':
      return 'Please enter a valid email address (e.g. name@domain.com).';

    case 'auth/too-many-requests':
      return 'Access temporarily suspended due to too many failed attempts. Please try again later or reset your password.';

    case 'auth/network-request-failed':
      return 'Network connection failure. Please check your internet connection.';

    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in cancelled. Please try again.';

    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';

    default:
      return 'Authentication could not be completed. Please try again.';
  }
}

/**
 * Centralized, sanitized error handler for all Firebase Auth operations.
 */
export function handleAuthError(
  error: unknown,
  operation: string,
  context?: Record<string, any>
): SanitizedAuthErrorInfo {
  const isFirebaseError = error instanceof FirebaseError;
  const rawCode = isFirebaseError ? error.code : (error as any)?.code || 'auth/unknown';
  const rawMessage = isFirebaseError ? error.message : (error as any)?.message || String(error);

  const category = categorizeAuthError(rawCode);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'server-environment';
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const userFacingMessage = getUserFacingAuthMessage(rawCode, hostname, operation);

  const info: SanitizedAuthErrorInfo = {
    operation,
    category,
    errorCode: rawCode,
    errorMessage: sanitizeLogValue(rawMessage),
    targetProjectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hostname,
    isOnline,
    timestamp: new Date().toISOString(),
    userFacingMessage,
  };

  // Safe logging: Never logs passwords or tokens
  console.warn(`[Firebase Auth: ${operation}] [${category}] ${rawCode}: ${info.userFacingMessage}`);
  return info;
}
