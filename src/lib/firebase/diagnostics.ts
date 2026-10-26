import { auth, db } from './client';
import { firebaseConfig } from './config';

export interface FirebaseDiagnosticsResult {
  timestamp: string;
  projectCoordinates: {
    projectId: string;
    authDomain: string;
    firestoreDatabaseId: string;
  };
  clientInstances: {
    authInitialized: boolean;
    firestoreInitialized: boolean;
    currentUserUid: string | null;
  };
  runtimeEnvironment: {
    hostname: string;
    origin: string;
    isCloudRunPreviewDomain: boolean;
    authorizedDomainsGuidance: string;
  };
  liveBackendProbes: {
    registrationStatus: 'SUCCESS' | 'OPERATION_NOT_ALLOWED' | 'UNVERIFIED' | 'ERROR';
    registrationHttp: number;
    loginStatus: 'SUCCESS' | 'EMAIL_NOT_FOUND' | 'PASSWORD_LOGIN_DISABLED' | 'UNVERIFIED' | 'ERROR';
    loginHttp: number;
    details: string;
  };
}

/**
 * Executes a non-destructive configuration and backend readiness diagnostic.
 * Never leaks API keys, passwords, or tokens.
 * Never infers password-provider enablement from createAuthUri alone.
 */
export async function runFirebaseDiagnostics(): Promise<FirebaseDiagnosticsResult> {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'server';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'server';
  const isCloudRunPreviewDomain = hostname.includes('run.app');

  const clientInstances = {
    authInitialized: Boolean(auth),
    firestoreInitialized: Boolean(db),
    currentUserUid: auth.currentUser ? auth.currentUser.uid : null,
  };

  const projectCoordinates = {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  };

  const runtimeEnvironment = {
    hostname,
    origin,
    isCloudRunPreviewDomain,
    authorizedDomainsGuidance: isCloudRunPreviewDomain
      ? `Cloud Run domain '${hostname}' must be present in Firebase Console → Authentication → Settings → Authorized domains.`
      : `Host '${hostname}' must be verified in Firebase Console Authorized domains.`,
  };

  let registrationStatus: FirebaseDiagnosticsResult['liveBackendProbes']['registrationStatus'] = 'UNVERIFIED';
  let registrationHttp = 0;
  let loginStatus: FirebaseDiagnosticsResult['liveBackendProbes']['loginStatus'] = 'UNVERIFIED';
  let loginHttp = 0;
  let details = '';

  try {
    // 1. Live probe: accounts:signInWithPassword with disposable probe email
    const signInEndpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`;
    const resSignIn = await fetch(signInEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'probe_diagnostic_check@moneyvault.internal',
        password: 'DiagnosticProbePassword123!',
        returnSecureToken: true,
      }),
    });
    loginHttp = resSignIn.status;
    const signInData = await resSignIn.json().catch(() => ({}));
    const rawSignInCode = signInData?.error?.message;

    if (resSignIn.status === 200) {
      loginStatus = 'SUCCESS';
    } else if (rawSignInCode === 'EMAIL_NOT_FOUND') {
      loginStatus = 'EMAIL_NOT_FOUND'; // Confirms provider is active
    } else if (rawSignInCode === 'PASSWORD_LOGIN_DISABLED') {
      loginStatus = 'PASSWORD_LOGIN_DISABLED';
    } else {
      loginStatus = 'ERROR';
    }

    // 2. Live probe: accounts:signUp with disposable test email
    const signUpEndpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`;
    const resSignUp = await fetch(signUpEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `probe_${Date.now()}@moneyvault.internal`,
        password: 'DiagnosticProbePassword123!',
        returnSecureToken: true,
      }),
    });
    registrationHttp = resSignUp.status;
    const signUpData = await resSignUp.json().catch(() => ({}));
    const rawSignUpCode = signUpData?.error?.message;

    if (resSignUp.status === 200) {
      registrationStatus = 'SUCCESS';
    } else if (rawSignUpCode?.includes('OPERATION_NOT_ALLOWED')) {
      registrationStatus = 'OPERATION_NOT_ALLOWED';
    } else {
      registrationStatus = 'ERROR';
    }

    details = `SignUp: ${rawSignUpCode || resSignUp.statusText} | SignIn: ${rawSignInCode || resSignIn.statusText}`;
  } catch (err: any) {
    details = `Network probe exception: ${err.message}`;
  }

  const result: FirebaseDiagnosticsResult = {
    timestamp: new Date().toISOString(),
    projectCoordinates,
    clientInstances,
    runtimeEnvironment,
    liveBackendProbes: {
      registrationStatus,
      registrationHttp,
      loginStatus,
      loginHttp,
      details,
    },
  };

  return result;
}
