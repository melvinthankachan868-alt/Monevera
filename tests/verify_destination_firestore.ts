import fs from 'fs';

async function runDestinationFirestoreVerification() {
  console.log('================================================================');
  console.log('   MONEY VAULT — DESTINATION FIRESTORE READ/WRITE VERIFICATION  ');
  console.log('================================================================\n');

  const cfg = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  console.log('Target Project:', cfg.projectId);
  console.log('Target Database:', cfg.firestoreDatabaseId);

  // 1. Sign up a temporary test user in the destination project
  const testEmail = `firestore_test_${Date.now()}@moneyvault.internal`;
  const testPassword = 'TestPassword123!';

  console.log('\n[Step 1] Creating temporary test user in destination project...');
  const resSignUp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      returnSecureToken: true,
    }),
  });

  const authData = await resSignUp.json();
  if (!resSignUp.ok || !authData.idToken) {
    console.error('Failed to sign up test user:', authData);
    process.exit(1);
  }

  const { idToken, localId: uid } = authData;
  console.log(`Test user registered successfully. UID: ${uid}`);

  // 2. Test authenticated write to user's scoped document in destination Firestore
  console.log('\n[Step 2] Testing Authenticated Firestore Write...');
  const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents`;
  
  // Test Document: /users/{uid}/profile
  const writeRes = await fetch(`${firestoreBaseUrl}/users?documentId=${uid}&key=${cfg.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        uid: { stringValue: uid },
        email: { stringValue: testEmail },
        displayName: { stringValue: 'Test Migrated User' },
        createdAt: { stringValue: new Date().toISOString() },
        updatedAt: { stringValue: new Date().toISOString() },
      },
    }),
  });

  const writeResult = await writeRes.json().catch(() => ({}));
  console.log(`Authenticated Write Status: HTTP ${writeRes.status}`);
  if (writeRes.ok) {
    console.log('Firestore Document successfully written!');
  } else {
    console.log('Write response:', JSON.stringify(writeResult));
  }

  // 3. Test Authenticated Firestore Read
  console.log('\n[Step 3] Testing Authenticated Firestore Read...');
  const readRes = await fetch(`${firestoreBaseUrl}/users/${uid}?key=${cfg.apiKey}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const readData = await readRes.json().catch(() => ({}));
  console.log(`Authenticated Read Status: HTTP ${readRes.status}`);
  const readSuccess = readRes.ok && readData.fields?.email?.stringValue === testEmail;
  console.log('Read verification:', readSuccess ? 'PASS' : 'FAIL');

  // 4. Test Cross-Tenant Unauthorized Read (Negative Security Check)
  console.log('\n[Step 4] Testing Cross-Tenant Security Isolation (Attempting to read without auth)...');
  const unauthRes = await fetch(`${firestoreBaseUrl}/users/${uid}?key=${cfg.apiKey}`);
  console.log(`Unauthenticated Read Status: HTTP ${unauthRes.status} (Expected 403)`);

  const securityIsolationPassed = unauthRes.status === 403;
  console.log('Security Isolation:', securityIsolationPassed ? 'PASS' : 'FAIL');

  // Clean up: delete test user via Identity Toolkit
  try {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${cfg.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch {}

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log('Destination Auth:               PASS (200 OK)');
  console.log('Destination Firestore Write:    ' + (writeRes.ok ? 'PASS' : 'FAIL'));
  console.log('Destination Firestore Read:     ' + (readSuccess ? 'PASS' : 'FAIL'));
  console.log('Zero-Trust Security Isolation:  ' + (securityIsolationPassed ? 'PASS' : 'FAIL'));

  if (!writeRes.ok || !readSuccess || !securityIsolationPassed) {
    process.exit(1);
  }
}

runDestinationFirestoreVerification().catch((err) => {
  console.error('Destination Firestore verification failed:', err);
  process.exit(1);
});
