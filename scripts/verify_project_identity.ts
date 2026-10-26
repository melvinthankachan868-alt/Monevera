import fs from 'fs';

async function runProjectIdentityInvestigation() {
  console.log('================================================================');
  console.log('   MONEY VAULT — FIREBASE PROJECT IDENTITY INVESTIGATION        ');
  console.log('================================================================\n');

  const configPath = 'firebase-applet-config.json';
  if (!fs.existsSync(configPath)) {
    console.error('Missing config file');
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  console.log('[1. Configured Identity in AI Studio]');
  console.log('  • Project ID:           ', cfg.projectId);
  console.log('  • Project Number (App): ', cfg.appId?.split(':')[1] || 'Unknown');
  console.log('  • Web App ID:           ', cfg.appId);
  console.log('  • Auth Domain:          ', cfg.authDomain);
  console.log('  • Firestore Database:   ', cfg.firestoreDatabaseId);
  console.log('  • Storage Bucket:       ', cfg.storageBucket);
  console.log('  • Messaging Sender ID:  ', cfg.messagingSenderId);
  console.log('  • OAuth Client ID:      ', cfg.oAuthClientId ? `${cfg.oAuthClientId.slice(0, 15)}...apps.googleusercontent.com` : 'None');
  console.log('  • Web API Key Prefix:   ', cfg.apiKey ? `${cfg.apiKey.slice(0, 8)}... (len ${cfg.apiKey.length})` : 'None');

  console.log('\n[2. Console Project in User Screenshot]');
  console.log('  • Project ID:           ', 'thematic-empire-w4mm2-b9375');
  console.log('  • Project Number:       ', '843132008040');

  console.log('\n[3. Cross-Project Probes & Connectivity Evidence]');
  
  // Probe 3a: Configured project Identity Toolkit connectivity
  try {
    const resIdp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${cfg.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: 'google.com',
        continueUri: `https://${cfg.authDomain}/__/auth/handler`,
      }),
    });
    const idpData = await resIdp.json().catch(() => ({}));
    console.log(`  • Configured Project (${cfg.projectId}) Identity Toolkit Reachability: HTTP ${resIdp.status} (Client ID: ${idpData.authUri?.includes('704664510075') ? 'Matches 704664510075' : 'Unknown'})`);
  } catch (err: any) {
    console.log(`  • Configured Project Identity Toolkit: Error (${err.message})`);
  }

  // Probe 3b: Configured named database existence vs non-existent database
  try {
    const resNamedDb = await fetch(`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/test?key=${cfg.apiKey}`);
    const namedDbData = await resNamedDb.json().catch(() => ({}));
    console.log(`  • Configured Named DB (${cfg.firestoreDatabaseId}): HTTP ${resNamedDb.status} -> ${namedDbData.error?.status || 'OK'}`);

    const resFakeDb = await fetch(`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/non-existent-probe-db/documents/test?key=${cfg.apiKey}`);
    const fakeDbData = await resFakeDb.json().catch(() => ({}));
    console.log(`  • Negative Control (non-existent-probe-db): HTTP ${resFakeDb.status} -> ${fakeDbData.error?.status || 'OK'}`);
  } catch (err: any) {
    console.log(`  • Firestore probe error: ${err.message}`);
  }

  // Probe 3c: Attempt to access Console screenshot project with configured key
  try {
    const resConsoleProj = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${cfg.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: 'google.com',
        continueUri: `https://thematic-empire-w4mm2-b9375.firebaseapp.com/__/auth/handler`,
      }),
    });
    const consoleProjData = await resConsoleProj.json().catch(() => ({}));
    console.log(`  • Console Screenshot Auth Domain probe: HTTP ${resConsoleProj.status} (authUri clientId matches: ${consoleProjData.authUri?.includes('704664510075') ? 'Project 704664510075 key' : 'Unknown'})`);
  } catch (err: any) {
    console.log(`  • Console project probe error: ${err.message}`);
  }
}

runProjectIdentityInvestigation().catch(console.error);
