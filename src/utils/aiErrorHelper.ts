/**
 * Money Vault AI Error Helper
 * Pure, centralized error mapping and messages for Mike AI Assistant, OCR, and Research.
 */

export const SIGN_IN_PROMPT =
  'Sign in to use Mike. Your AI assistant needs a Money Vault account so your data stays private.';

export const SESSION_EXPIRED_MSG = 'Your session expired. Please sign in again.';
export const RATE_LIMIT_MSG = 'Too many requests. Wait a minute and try again.';
export const SERVICE_UNAVAILABLE_MSG = 'Mike is being set up. Please try again later.';
export const GENERIC_AI_ERROR_MSG = 'Mike is temporarily unavailable. Please try again.';

export interface AiStatusError {
  message: string;
  status?: number;
  requiresSignIn: boolean;
}

/**
 * Maps HTTP status codes to honest, user-facing error messages:
 * - 401 -> "Your session expired. Please sign in again."
 * - 429 -> "Too many requests. Wait a minute and try again."
 * - 503 -> "Mike is being set up. Please try again later."
 * - other / undefined -> "Mike is temporarily unavailable. Please try again."
 */
export function getAiErrorMessage(status?: number | null): string {
  if (status === 401) {
    return SESSION_EXPIRED_MSG;
  }
  if (status === 429) {
    return RATE_LIMIT_MSG;
  }
  if (status === 503) {
    return SERVICE_UNAVAILABLE_MSG;
  }
  return GENERIC_AI_ERROR_MSG;
}

/**
 * Creates an AiStatusError object given a status code or unauthenticated state.
 */
export function createAiStatusError(status?: number | null, isUnauthenticated: boolean = false): AiStatusError {
  if (isUnauthenticated) {
    return {
      message: SIGN_IN_PROMPT,
      status: 401,
      requiresSignIn: true,
    };
  }
  const message = getAiErrorMessage(status);
  return {
    message,
    status: status ?? undefined,
    requiresSignIn: status === 401,
  };
}

/**
 * Guard to verify if an incoming async AI reply matches the active user session.
 * If the user signed out, switched accounts, or authentication changed while the
 * request was in flight, the reply MUST be discarded.
 */
export function shouldApplyAiReply(
  startedForUid: string | null | undefined,
  currentUid: string | null | undefined
): boolean {
  if (!startedForUid) return false;
  return startedForUid === currentUid;
}
