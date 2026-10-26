import firebaseConfig from '../firebase-applet-config.json';

async function verifyOAuth() {
  console.log('=== FIREBASE OAUTH & DOMAIN VERIFICATION ===');
  console.log('Configured Project ID:', firebaseConfig.projectId);
  console.log('Configured Auth Domain:', firebaseConfig.authDomain);
  console.log('Configured App ID:', firebaseConfig.appId);
  console.log('Configured OAuth Client ID:', firebaseConfig.oAuthClientId);

  const prodHostname = 'ais-pre-7ege7ol2qf6cpuxsjlh5l3-841335153750.asia-southeast1.run.app';
  const devHostname = 'ais-dev-7ege7ol2qf6cpuxsjlh5l3-841335153750.asia-southeast1.run.app';
  const unauthorizedHostname = 'malicious-phishing-domain.com';

  console.log('\nProduction Hostname:', prodHostname);
  console.log('Development Hostname:', devHostname);

  // Test Firebase Auth Identity Toolkit endpoint for createAuthUri with continueUri
  const apiKey = firebaseConfig.apiKey;
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`;

  async function checkDomain(domain: string) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: 'google.com',
          continueUri: `https://${domain}/__/auth/handler`,
        }),
      });
      const data = await res.json();
      return { status: res.status, data };
    } catch (err: any) {
      return { status: 0, error: err.message };
    }
  }

  console.log(`\n[OAuth Test 1] Testing Default Firebase Auth Domain (${firebaseConfig.authDomain})...`);
  const resDefault = await checkDomain(firebaseConfig.authDomain);
  console.log('Status:', resDefault.status, 'Response:', resDefault.data?.authUri ? 'authUri generated successfully' : resDefault.data);

  console.log('\n[OAuth Test 2] Testing Production Hostname (ais-pre-7ege7ol2qf6cpuxsjlh5l3-841335153750.asia-southeast1.run.app)...');
  const resProd = await checkDomain(prodHostname);
  console.log('Status:', resProd.status, 'Response:', resProd.data?.authUri ? 'authUri generated successfully' : resProd.data);

  console.log('\n[OAuth Test 3] Testing Unauthorized Hostname (malicious-phishing-domain.com)...');
  const resUnauth = await checkDomain(unauthorizedHostname);
  console.log('Status:', resUnauth.status, 'Response:', resUnauth.data?.authUri ? 'authUri generated' : resUnauth.data);

  // Verify that unauthorized domain returns error or is blocked
  const isProdAuthorized = Boolean(resProd.data?.authUri);
  const isDefaultAuthorized = Boolean(resDefault.data?.authUri);
  const isUnauthBlocked = !resUnauth.data?.authUri || resUnauth.data?.error?.message?.includes('UNAUTHORIZED_DOMAIN');

  console.log('\nSummary:');
  console.log('  Default Domain Authorized:', isDefaultAuthorized ? 'YES' : 'NO');
  console.log('  Production Host Authorized in IdentityToolkit:', isProdAuthorized ? 'YES' : 'NO (Pending Console Whitelist)');
  console.log('  Unauthorized Domain Rejected:', isUnauthBlocked ? 'YES' : 'NO');
}

verifyOAuth().catch(console.error);
