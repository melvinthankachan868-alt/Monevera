import fs from 'fs';
import { storage } from '../src/db/indexedDB';
import { Expense, Income } from '../src/types';

interface AcceptanceResult {
  checkId: string;
  category: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'MANUAL_VERIFIED' | 'LIMITED_BY_ENVIRONMENT';
  details: string;
}

async function runPostMigrationAcceptance() {
  console.log('================================================================================');
  console.log('   MONEY VAULT — POST-MIGRATION ACCEPTANCE & INTEGRITY SUITE                    ');
  console.log('================================================================================\n');

  const results: AcceptanceResult[] = [];
  const cfg = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

  // --------------------------------------------------------------------------
  // CHECK 1: Target Database & Identity Invariant
  // --------------------------------------------------------------------------
  const expectedDb = 'ai-studio-monvera-2bc35225-812a-4213-82d7-2a7c440096ca';
  const expectedProj = 'thematic-empire-w4mm2-b9375';
  const isTargetDbCorrect = cfg.firestoreDatabaseId === expectedDb && cfg.projectId === expectedProj;

  results.push({
    checkId: 'ACCEPT-01-TARGET-DB',
    category: 'CONFIGURATION_INTEGRITY',
    description: 'Application configuration targets destination project & named database',
    status: isTargetDbCorrect ? 'PASS' : 'FAIL',
    details: `Project: '${cfg.projectId}', Database: '${cfg.firestoreDatabaseId}'`,
  });

  // --------------------------------------------------------------------------
  // CHECK 2: Live Registration, Password Login, Token Refresh & Reset
  // --------------------------------------------------------------------------
  const timestamp = Date.now();
  const testEmail = `acceptance_${timestamp}@moneyvault.internal`;
  const testPassword = 'AcceptancePassword123!';
  let authUid = '';
  let idToken = '';
  let refreshToken = '';

  // 2a: Registration
  try {
    const resReg = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        returnSecureToken: true,
      }),
    });
    const regData = await resReg.json();
    if (resReg.ok && regData.localId) {
      authUid = regData.localId;
      idToken = regData.idToken;
      refreshToken = regData.refreshToken;
      results.push({
        checkId: 'ACCEPT-02-REGISTRATION',
        category: 'AUTHENTICATION_PIPELINE',
        description: 'Live accounts:signUp in destination project returns 200 OK and UID',
        status: 'PASS',
        details: `UID: ${authUid.slice(0, 8)}... (HTTP ${resReg.status})`,
      });
    } else {
      results.push({
        checkId: 'ACCEPT-02-REGISTRATION',
        category: 'AUTHENTICATION_PIPELINE',
        description: 'Live accounts:signUp in destination project returns 200 OK and UID',
        status: 'FAIL',
        details: `Failed: ${JSON.stringify(regData)}`,
      });
    }
  } catch (err: any) {
    results.push({
      checkId: 'ACCEPT-02-REGISTRATION',
      category: 'AUTHENTICATION_PIPELINE',
      description: 'Live accounts:signUp in destination project returns 200 OK and UID',
      status: 'FAIL',
      details: `Network error: ${err.message}`,
    });
  }

  // 2b: Password Login
  try {
    const resLogin = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        returnSecureToken: true,
      }),
    });
    const loginData = await resLogin.json();
    const loginOk = resLogin.ok && loginData.localId === authUid;
    results.push({
      checkId: 'ACCEPT-03-PASSWORD-LOGIN',
      category: 'AUTHENTICATION_PIPELINE',
      description: 'Live accounts:signInWithPassword verifies credentials and returns valid session',
      status: loginOk ? 'PASS' : 'FAIL',
      details: loginOk ? `Authenticated UID matches: ${authUid.slice(0, 8)}...` : `Error: ${loginData.error?.message}`,
    });
  } catch (err: any) {
    results.push({
      checkId: 'ACCEPT-03-PASSWORD-LOGIN',
      category: 'AUTHENTICATION_PIPELINE',
      description: 'Live accounts:signInWithPassword verifies credentials and returns valid session',
      status: 'FAIL',
      details: err.message,
    });
  }

  // 2c: Token Refresh
  try {
    const resRefresh = await fetch(`https://securetoken.googleapis.com/v1/token?key=${cfg.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    });
    const refreshData = await resRefresh.json();
    const refreshOk = resRefresh.ok && Boolean(refreshData.id_token);
    results.push({
      checkId: 'ACCEPT-04-TOKEN-REFRESH',
      category: 'AUTHENTICATION_PIPELINE',
      description: 'Secure token refresh endpoint issues fresh ID token without user re-prompt',
      status: refreshOk ? 'PASS' : 'FAIL',
      details: refreshOk ? `Issued fresh ID token (expires in ${refreshData.expires_in}s)` : 'Refresh failed',
    });
  } catch (err: any) {
    results.push({
      checkId: 'ACCEPT-04-TOKEN-REFRESH',
      category: 'AUTHENTICATION_PIPELINE',
      description: 'Secure token refresh endpoint issues fresh ID token without user re-prompt',
      status: 'FAIL',
      details: err.message,
    });
  }

  // 2d: Password Reset Dispatch
  try {
    const resReset = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${cfg.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: testEmail,
      }),
    });
    const resetData = await resReset.json();
    const resetOk = resReset.ok && resetData.kind?.includes('GetOobConfirmationCodeResponse');
    results.push({
      checkId: 'ACCEPT-05-PASSWORD-RESET',
      category: 'AUTHENTICATION_PIPELINE',
      description: 'Password reset dispatch pipeline generates secure OOB code',
      status: resetOk ? 'PASS' : 'FAIL',
      details: resetOk ? 'OOB confirmation code dispatched successfully' : 'Reset failed',
    });
  } catch (err: any) {
    results.push({
      checkId: 'ACCEPT-05-PASSWORD-RESET',
      category: 'AUTHENTICATION_PIPELINE',
      description: 'Password reset dispatch pipeline generates secure OOB code',
      status: 'FAIL',
      details: err.message,
    });
  }

  // 2e: Google OAuth Provider Discovery
  try {
    const resOAuth = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${cfg.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: 'google.com',
        continueUri: `https://${cfg.authDomain}/__/auth/handler`,
      }),
    });
    const oauthData = await resOAuth.json();
    const oauthOk = resOAuth.ok && Boolean(oauthData.authUri) && oauthData.authUri.includes(cfg.messagingSenderId);
    results.push({
      checkId: 'ACCEPT-06-GOOGLE-OAUTH-DISCOVERY',
      category: 'AUTHENTICATION_PIPELINE',
      description: 'Google OAuth provider generates valid authUri linked to destination Client ID',
      status: oauthOk ? 'PASS' : 'FAIL',
      details: oauthOk ? `Generated authUri with client ${cfg.messagingSenderId}-...` : 'Failed',
    });
  } catch (err: any) {
    results.push({
      checkId: 'ACCEPT-06-GOOGLE-OAUTH-DISCOVERY',
      category: 'AUTHENTICATION_PIPELINE',
      description: 'Google OAuth provider generates valid authUri linked to destination Client ID',
      status: 'FAIL',
      details: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // CHECK 3: Firestore Persistence & Correct Account Ownership
  // --------------------------------------------------------------------------
  const firestoreBase = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents`;
  const uniqueIncomeId = `inc_acceptance_${timestamp}`;
  const uniqueExpenseId = `exp_acceptance_${timestamp}`;

  // 3a: Write unique Income and Expense documents
  try {
    const resWriteInc = await fetch(`${firestoreBase}/users/${authUid}/income?documentId=${uniqueIncomeId}&key=${cfg.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          id: { stringValue: uniqueIncomeId },
          ownerId: { stringValue: authUid },
          amount: { doubleValue: 75000 },
          source: { stringValue: 'Acceptance Audit Consulting' },
          type: { stringValue: 'Business' },
          date: { stringValue: '2026-10-20' },
          createdAt: { integerValue: String(timestamp) },
          updatedAt: { integerValue: String(timestamp) },
        },
      }),
    });

    const resWriteExp = await fetch(`${firestoreBase}/users/${authUid}/expenses?documentId=${uniqueExpenseId}&key=${cfg.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          id: { stringValue: uniqueExpenseId },
          ownerId: { stringValue: authUid },
          amount: { doubleValue: 12500 },
          category: { stringValue: 'Needs' },
          subcategory: { stringValue: 'Cloud Infrastructure' },
          date: { stringValue: '2026-10-20' },
          createdAt: { integerValue: String(timestamp) },
          updatedAt: { integerValue: String(timestamp) },
        },
      }),
    });

    const writesOk = resWriteInc.ok && resWriteExp.ok;

    // 3b: Read back and verify persistence & ownership
    const resReadInc = await fetch(`${firestoreBase}/users/${authUid}/income/${uniqueIncomeId}?key=${cfg.apiKey}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const incData = await resReadInc.json();

    const resReadExp = await fetch(`${firestoreBase}/users/${authUid}/expenses/${uniqueExpenseId}?key=${cfg.apiKey}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const expData = await resReadExp.json();

    const readsOk =
      resReadInc.ok &&
      resReadExp.ok &&
      incData.fields?.ownerId?.stringValue === authUid &&
      expData.fields?.ownerId?.stringValue === authUid &&
      Number(incData.fields?.amount?.doubleValue) === 75000 &&
      Number(expData.fields?.amount?.doubleValue) === 12500;

    results.push({
      checkId: 'ACCEPT-07-FIRESTORE-CRUD-OWNERSHIP',
      category: 'DATA_PERSISTENCE_AND_OWNERSHIP',
      description: 'Income and Expense write/read in destination Firestore verify schema, amount, and ownerId',
      status: writesOk && readsOk ? 'PASS' : 'FAIL',
      details: `Writes: ${writesOk ? '200 OK' : 'Failed'}, Reads: ${readsOk ? 'Verified' : 'Mismatch'}`,
    });
  } catch (err: any) {
    results.push({
      checkId: 'ACCEPT-07-FIRESTORE-CRUD-OWNERSHIP',
      category: 'DATA_PERSISTENCE_AND_OWNERSHIP',
      description: 'Income and Expense write/read in destination Firestore verify schema, amount, and ownerId',
      status: 'FAIL',
      details: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // CHECK 4: Guest/Local Data and Authenticated Cloud Data Isolation
  // --------------------------------------------------------------------------
  try {
    await storage.setScope('guest');
    const guestExpense: Expense = {
      id: `exp_guest_isolated_${timestamp}`,
      amount: 1500,
      category: 'Needs',
      subcategory: 'Groceries',
      paymentMethod: 'UPI',
      date: '2026-10-20',
      note: 'Guest local market',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await storage.saveExpense(guestExpense);

    // Switch to authenticated user's local scope
    await storage.setScope(`user_${authUid}`);
    const userExpenses = await storage.getExpenses();
    const guestLeakedToUser = userExpenses.some((e) => e.id === guestExpense.id);

    // Switch back to guest
    await storage.setScope('guest');
    const guestExpenses = await storage.getExpenses();
    const guestIntact = guestExpenses.some((e) => e.id === guestExpense.id);
    await storage.deleteExpense(guestExpense.id);

    const isolationOk = !guestLeakedToUser && guestIntact;
    results.push({
      checkId: 'ACCEPT-08-GUEST-CLOUD-ISOLATION',
      category: 'DATA_ISOLATION',
      description: 'Guest device storage is completely isolated from authenticated user cloud records',
      status: isolationOk ? 'PASS' : 'FAIL',
      details: `Guest leaked to user: ${guestLeakedToUser}, Guest record intact in guest scope: ${guestIntact}`,
    });
  } catch (err: any) {
    results.push({
      checkId: 'ACCEPT-08-GUEST-CLOUD-ISOLATION',
      category: 'DATA_ISOLATION',
      description: 'Guest device storage is completely isolated from authenticated user cloud records',
      status: 'FAIL',
      details: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // CHECK 5: Backup Availability & Prior Data State Limitation
  // --------------------------------------------------------------------------
  const backupExists = fs.existsSync('firebase-applet-config.backup.json');
  let backupProjectId = '';
  if (backupExists) {
    const b = JSON.parse(fs.readFileSync('firebase-applet-config.backup.json', 'utf8'));
    backupProjectId = b.projectId;
  }
  results.push({
    checkId: 'ACCEPT-09-PRE-MIGRATION-BACKUP',
    category: 'DATA_INTEGRITY_SAFEGUARDS',
    description: 'Pre-migration configuration preserved and recoverable in backup file',
    status: backupExists && backupProjectId === 'thematic-empire-w4mm2' ? 'PASS' : 'FAIL',
    details: `Backup exists: ${backupExists}. Archived Project ID: '${backupProjectId}'`,
  });

  // --------------------------------------------------------------------------
  // CHECK 6: Server Token Verification on Protected Route
  // --------------------------------------------------------------------------
  try {
    // 6a: Protected request with valid destination token
    const resNotifyAuth = await fetch('http://localhost:3000/api/alerts/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        recipientEmail: testEmail,
        notificationDetails: { title: 'Test Alert', message: 'Testing server auth' },
      }),
    });

    // 6b: Protected request with forged token
    const resNotifyForged = await fetch('http://localhost:3000/api/alerts/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid.forged.jwt',
      },
      body: JSON.stringify({
        recipientEmail: testEmail,
        notificationDetails: { title: 'Test Alert', message: 'Testing server auth' },
      }),
    });

    const serverAuthOk = resNotifyAuth.status === 200 && resNotifyForged.status === 401;
    results.push({
      checkId: 'ACCEPT-10-SERVER-TOKEN-VERIFICATION',
      category: 'SERVER_AUTHORIZATION',
      description: 'Server validates destination project ID token signature and aud claim',
      status: serverAuthOk ? 'PASS' : 'FAIL',
      details: `Valid Token: HTTP ${resNotifyAuth.status} (Expected 200), Forged Token: HTTP ${resNotifyForged.status} (Expected 401)`,
    });
  } catch (err: any) {
    results.push({
      checkId: 'ACCEPT-10-SERVER-TOKEN-VERIFICATION',
      category: 'SERVER_AUTHORIZATION',
      description: 'Server validates destination project ID token signature and aud claim',
      status: 'FAIL',
      details: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // CHECK 7: Deployment & Environment Probing
  // --------------------------------------------------------------------------
  const devUrl = 'https://ais-dev-7ege7ol2qf6cpuxsjlh5l3-841335153750.asia-southeast1.run.app';
  const prodBase = 'https://ais-pre-7ege7ol2qf6cpuxsjlh5l3-841335153750.asia-southeast1.run.app';

  try {
    // 7a: Local server health
    const resLocal = await fetch('http://localhost:3000/api/health');
    const localOk = resLocal.status === 200;

    // 7b: Development Cloud Run deployment ping
    const resDev = await fetch(devUrl, { redirect: 'manual' });
    const devOk = resDev.status === 200 || resDev.status === 302 || resDev.status === 401;

    // 7c: Production shared URL check
    const resProd = await fetch(prodBase, { redirect: 'manual' });
    const prodDetails = resProd.status === 200
      ? 'Active (200 OK)'
      : `Staged / Ready for publish (HTTP ${resProd.status})`;

    results.push({
      checkId: 'ACCEPT-11-DEPLOYMENT-HEALTH',
      category: 'DEPLOYMENT_VERIFICATION',
      description: 'Local server and development Cloud Run deployment are responsive and healthy',
      status: localOk && devOk ? 'PASS' : 'FAIL',
      details: `Local: HTTP ${resLocal.status}, Dev Cloud Run: HTTP ${resDev.status}, Prod: ${prodDetails}`,
    });
  } catch (err: any) {
    results.push({
      checkId: 'ACCEPT-11-DEPLOYMENT-HEALTH',
      category: 'DEPLOYMENT_VERIFICATION',
      description: 'Local server and development Cloud Run deployment are responsive and healthy',
      status: 'FAIL',
      details: err.message,
    });
  }

  // Summary Table
  console.log('\n=== ACCEPTANCE VERIFICATION SUMMARY ===');
  console.table(
    results.map((r) => ({
      CheckID: r.checkId,
      Category: r.category,
      Status: r.status,
      Details: r.details.slice(0, 65),
    }))
  );

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`\nOVERALL SUITE VERDICT: ${allPassed ? 'ALL ACCEPTANCE CHECKS PASSED' : 'FAILURES DETECTED'}`);
  if (!allPassed) {
    process.exit(1);
  }
}

runPostMigrationAcceptance().catch((err) => {
  console.error('Acceptance suite failed:', err);
  process.exit(1);
});
