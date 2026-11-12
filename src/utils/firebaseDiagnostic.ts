import { auth,db } from '../lib/firebase/client';
import { firebaseConfig } from '../lib/firebase/config';
import { runFirebaseDiagnostics,FirebaseDiagnosticsResult } from '../lib/firebase/diagnostics';

export type { FirebaseDiagnosticsResult };

export interface FirebaseDiagnosticReport {
  timestamp: string;
  projectId: string;
  authDomain: string;
  firestoreDatabaseId: string;
  authInstance: {
    appName: string;
    currentUser: {
      uid: string;
      email: string | null;
      isAnonymous: boolean;
    } | null;
    isInitialized: boolean;
  };
  firestoreInstance: {
    appName: string;
    databaseId: string;
    isInitialized: boolean;
  };
  runtimeEnvironment: {
    configuredAuthDomain: string;
    runtimeHostname: string;
    runtimeOrigin: string;
    isFirebaseHostedDomain: boolean;
    isCloudRunPreviewDomain: boolean;
    authorizedDomainsNote: string;
  };
  passwordProviderProbe: {
    signUpProbe: {
      httpStatus: number;
      errorCode: string | null;
      details: string;
    };
    signInProbe: {
      httpStatus: number;
      errorCode: string | null;
      details: string;
    };
    statusSummary: 'ENABLED' | 'PASSWORD_LOGIN_DISABLED' | 'OPERATION_NOT_ALLOWED' | 'UNVERIFIED';
    methodologyNote: string;
  };
}

/**
 * Diagnostic utility to verify Firebase project configuration,
 * runtime host environment, and live backend Identity Toolkit provider state.
 */
export async function verifyFirebaseConfig(): Promise<FirebaseDiagnosticReport> {
  const result = await runFirebaseDiagnostics();
  const hostname = result.runtimeEnvironment.hostname;
  const origin = result.runtimeEnvironment.origin;
  const isFirebaseHostedDomain = hostname.endsWith('.firebaseapp.com') || hostname.endsWith('.web.app');

  let statusSummary: FirebaseDiagnosticReport['passwordProviderProbe']['statusSummary'] = 'UNVERIFIED';
  if (result.liveBackendProbes.registrationStatus === 'SUCCESS' || result.liveBackendProbes.loginStatus === 'EMAIL_NOT_FOUND') {
    statusSummary = 'ENABLED';
  } else if (result.liveBackendProbes.loginStatus === 'PASSWORD_LOGIN_DISABLED') {
    statusSummary = 'PASSWORD_LOGIN_DISABLED';
  } else if (result.liveBackendProbes.registrationStatus === 'OPERATION_NOT_ALLOWED') {
    statusSummary = 'OPERATION_NOT_ALLOWED';
  }

  const report: FirebaseDiagnosticReport = {
    timestamp: result.timestamp,
    projectId: result.projectCoordinates.projectId,
    authDomain: result.projectCoordinates.authDomain,
    firestoreDatabaseId: result.projectCoordinates.firestoreDatabaseId,
    authInstance: {
      appName: auth.app.name,
      currentUser: auth.currentUser
        ? {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            isAnonymous: auth.currentUser.isAnonymous,
          }
        : null,
      isInitialized: result.clientInstances.authInitialized,
    },
    firestoreInstance: {
      appName: db.app.name,
      databaseId: (db as any)._databaseId?.database || firebaseConfig.firestoreDatabaseId,
      isInitialized: result.clientInstances.firestoreInitialized,
    },
    runtimeEnvironment: {
      configuredAuthDomain: result.projectCoordinates.authDomain,
      runtimeHostname: hostname,
      runtimeOrigin: origin,
      isFirebaseHostedDomain,
      isCloudRunPreviewDomain: result.runtimeEnvironment.isCloudRunPreviewDomain,
      authorizedDomainsNote: result.runtimeEnvironment.authorizedDomainsGuidance,
    },
    passwordProviderProbe: {
      signUpProbe: {
        httpStatus: result.liveBackendProbes.registrationHttp,
        errorCode: result.liveBackendProbes.registrationStatus,
        details: result.liveBackendProbes.details,
      },
      signInProbe: {
        httpStatus: result.liveBackendProbes.loginHttp,
        errorCode: result.liveBackendProbes.loginStatus,
        details: result.liveBackendProbes.details,
      },
      statusSummary,
      methodologyNote:
        'Determined by direct accounts:signUp and accounts:signInWithPassword execution. Does not rely on createAuthUri or hostname comparison.',
    },
  };

  // Attach to window for direct browser debug console access
  if (typeof window !== 'undefined') {
    (window as any).__verifyFirebaseConfig = verifyFirebaseConfig;
    (window as any).__lastFirebaseDiagnosticReport = report;
  }

  return report;
}

export function generateSanitizedSupportDossier(report: FirebaseDiagnosticReport): string {
  return [
    '=== SANITIZED FIREBASE AUTHENTICATION DOSSIER ===',
    `Timestamp:                 ${report.timestamp}`,
    `Target Project ID:         ${report.projectId}`,
    `Configured Auth Domain:    ${report.authDomain}`,
    `Named Firestore DB:        ${report.firestoreDatabaseId}`,
    `Runtime Hostname:          ${report.runtimeEnvironment.runtimeHostname}`,
    `Runtime Origin:            ${report.runtimeEnvironment.runtimeOrigin}`,
    `Sign-Up Probe Status:      HTTP ${report.passwordProviderProbe.signUpProbe.httpStatus} (${report.passwordProviderProbe.signUpProbe.errorCode})`,
    `Sign-In Probe Status:      HTTP ${report.passwordProviderProbe.signInProbe.httpStatus} (${report.passwordProviderProbe.signInProbe.errorCode})`,
    `Provider Summary:          ${report.passwordProviderProbe.statusSummary}`,
    `Methodology:               ${report.passwordProviderProbe.methodologyNote}`,
    '=================================================',
  ].join('\n');
}
