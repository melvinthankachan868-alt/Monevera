/**
 * Money Vault - Invitation Delivery & URL Configuration Test Suite
 *
 * Verifies:
 * 1. sendEmailInvitation & sendSmsInvitation strictly fail if called without an authentication token.
 * 2. Server refuses to build invitation links unless APP_URL is set to a non-localhost value.
 * 3. Server never falls back to request headers in production.
 */

import { InvitationDeliveryProvider } from '../src/services/invitationDeliveryProvider';
import { GroupInvitation } from '../src/types';
import { buildInvitationUrl, getBaseUrl } from '../server';

interface TestResult {
  id: string;
  category: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const results: TestResult[] = [];

function assertTest(id: string, category: string, name: string, expected: any, actual: any, passed: boolean) {
  results.push({
    id,
    category,
    name,
    expected: String(expected),
    actual: String(actual),
    passed,
  });
}

console.log('================================================================================');
console.log('   MONEY VAULT — INVITATION TOKENS & APP_URL SECURITY SUITE                     ');
console.log('================================================================================\n');

async function runTests() {
  const dummyInvitation: GroupInvitation = {
    id: 'inv_test_token_01',
    groupId: 'grp_alpha',
    groupName: 'Alpha Group',
    currency: 'INR',
    token: 'tok_random_secure_123',
    invitedByUid: 'usr_owner_alpha',
    invitedByName: 'Owner Alice',
    recipientIdentifier: 'invitee@example.com',
    recipientType: 'email',
    recipientEmail: 'invitee@example.com',
    role: 'member',
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000,
    status: 'pending',
    deliveryStatus: 'pending',
  };

  // ===========================================================================
  // TEST 1: sendEmailInvitation called without token MUST throw / fail
  // ===========================================================================
  let emailNoTokenThrew = false;
  let emailNoTokenError = '';
  try {
    // Calling without authToken argument
    await InvitationDeliveryProvider.sendEmailInvitation(dummyInvitation, 'invitee@example.com');
  } catch (err: any) {
    emailNoTokenThrew = true;
    emailNoTokenError = err?.message || String(err);
  }

  assertTest(
    'INV-TOKEN-01',
    'Invitation Auth Token Enforcement',
    'sendEmailInvitation without token rejects with authentication required error',
    'Error: Authentication token is required',
    emailNoTokenError,
    emailNoTokenThrew && emailNoTokenError.includes('Authentication token is required')
  );

  // ===========================================================================
  // TEST 2: sendEmailInvitation called with empty token string MUST throw / fail
  // ===========================================================================
  let emailEmptyTokenThrew = false;
  let emailEmptyTokenError = '';
  try {
    await InvitationDeliveryProvider.sendEmailInvitation(dummyInvitation, 'invitee@example.com', undefined, '   ');
  } catch (err: any) {
    emailEmptyTokenThrew = true;
    emailEmptyTokenError = err?.message || String(err);
  }

  assertTest(
    'INV-TOKEN-02',
    'Invitation Auth Token Enforcement',
    'sendEmailInvitation with empty/whitespace token string rejects',
    'Error: Authentication token is required',
    emailEmptyTokenError,
    emailEmptyTokenThrew && emailEmptyTokenError.includes('Authentication token is required')
  );

  // ===========================================================================
  // TEST 3: sendSmsInvitation called without token MUST throw / fail
  // ===========================================================================
  let smsNoTokenThrew = false;
  let smsNoTokenError = '';
  try {
    // Calling without authToken argument
    await InvitationDeliveryProvider.sendSmsInvitation(dummyInvitation, '+919876543210');
  } catch (err: any) {
    smsNoTokenThrew = true;
    smsNoTokenError = err?.message || String(err);
  }

  assertTest(
    'INV-TOKEN-03',
    'Invitation Auth Token Enforcement',
    'sendSmsInvitation without token rejects with authentication required error',
    'Error: Authentication token is required',
    smsNoTokenError,
    smsNoTokenThrew && smsNoTokenError.includes('Authentication token is required')
  );

  // ===========================================================================
  // TEST 4: sendSmsInvitation called with empty token string MUST throw / fail
  // ===========================================================================
  let smsEmptyTokenThrew = false;
  let smsEmptyTokenError = '';
  try {
    await InvitationDeliveryProvider.sendSmsInvitation(dummyInvitation, '+919876543210', '  ');
  } catch (err: any) {
    smsEmptyTokenThrew = true;
    smsEmptyTokenError = err?.message || String(err);
  }

  assertTest(
    'INV-TOKEN-04',
    'Invitation Auth Token Enforcement',
    'sendSmsInvitation with empty/whitespace token string rejects',
    'Error: Authentication token is required',
    smsEmptyTokenError,
    smsEmptyTokenThrew && smsEmptyTokenError.includes('Authentication token is required')
  );

  // ===========================================================================
  // TEST 5: Server refuses to build invitation link when APP_URL is localhost
  // ===========================================================================
  const originalAppUrl = process.env.APP_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    process.env.APP_URL = 'http://localhost:3000';
    let localhostThrew = false;
    let localhostError = '';
    try {
      buildInvitationUrl('token_abc_123');
    } catch (err: any) {
      localhostThrew = true;
      localhostError = err?.message || String(err);
    }

    assertTest(
      'APP-URL-01',
      'APP_URL Enforcement',
      'Server refuses to build invitation link when APP_URL is http://localhost:3000',
      'Refuses with non-localhost error',
      localhostError,
      localhostThrew && localhostError.includes('non-localhost')
    );
  } finally {
    process.env.APP_URL = originalAppUrl;
  }

  // ===========================================================================
  // TEST 6: Server refuses to build invitation link when APP_URL is unset
  // ===========================================================================
  try {
    delete process.env.APP_URL;
    let unsetThrew = false;
    let unsetError = '';
    try {
      buildInvitationUrl('token_abc_123');
    } catch (err: any) {
      unsetThrew = true;
      unsetError = err?.message || String(err);
    }

    assertTest(
      'APP-URL-02',
      'APP_URL Enforcement',
      'Server refuses to build invitation link when APP_URL is missing',
      'Refuses with non-localhost error',
      unsetError,
      unsetThrew && unsetError.includes('non-localhost')
    );
  } finally {
    process.env.APP_URL = originalAppUrl;
  }

  // ===========================================================================
  // TEST 7: In production (NODE_ENV=production), NEVER fall back to request headers
  // ===========================================================================
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.APP_URL;

    const mockReq = {
      headers: {
        'x-forwarded-host': 'attacker-controlled.site',
        'x-forwarded-proto': 'https',
      },
      get: (h: string) => (h === 'host' ? 'attacker-controlled.site' : undefined),
    } as any;

    const resolvedUrl = getBaseUrl(mockReq);
    assertTest(
      'APP-URL-03',
      'Production Header Isolation',
      'In production, getBaseUrl NEVER falls back to request headers (x-forwarded-host or host)',
      '',
      resolvedUrl,
      resolvedUrl === ''
    );
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.APP_URL = originalAppUrl;
  }

  // ===========================================================================
  // TEST 8: When APP_URL is a valid non-localhost domain, link builds cleanly
  // ===========================================================================
  try {
    process.env.APP_URL = 'https://vault.moneyvault.app';
    const builtUrl = buildInvitationUrl('safe_token_456');

    assertTest(
      'APP-URL-04',
      'Valid Invitation URL Construction',
      'Server builds valid invitation URL when APP_URL is non-localhost domain',
      'https://vault.moneyvault.app/group-invite/safe_token_456',
      builtUrl,
      builtUrl === 'https://vault.moneyvault.app/group-invite/safe_token_456'
    );
  } finally {
    process.env.APP_URL = originalAppUrl;
  }

  // Print results summary
  console.log('=== TEST RESULTS ===');
  console.table(results.map(r => ({
    ID: r.id,
    Category: r.category,
    Test: r.name,
    Status: r.passed ? 'PASS' : 'FAIL',
  })));

  const allPassed = results.every(r => r.passed);
  console.log(`\nTOTAL INVITATION & APP_URL TESTS: ${results.length}`);
  console.log(`PASSED: ${results.filter(r => r.passed).length}`);
  console.log(`FAILED: ${results.filter(r => !r.passed).length}`);

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in invitation test runner:', err);
  process.exit(1);
});
