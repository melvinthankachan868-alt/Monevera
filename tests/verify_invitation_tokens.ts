import './setup_test_harness';
process.env.TEST_HARNESS = 'true';

/**
 * Money Vault - Invitation Delivery & URL Configuration Test Suite
 *
 * Verifies:
 * 1. sendEmailInvitation, sendSmsInvitation, resendGroupInvitation, revokeGroupInvitation
 *    strictly fail if called without an authentication token (both at TS compile-time and runtime).
 * 2. In production (NODE_ENV=production), require APP_URL to be set and not localhost.
 * 3. In production, if APP_URL is missing or localhost, invitation routes return 503 with generic message and log.
 * 4. In production, invitation link generation NEVER falls back to request headers.
 * 5. Spoofed X-Forwarded-Host NEVER appears in a generated invitation link.
 * 6. Invitation link format is strictly /group-invite/<token>.
 */

import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { InvitationDeliveryProvider } from '../src/services/invitationDeliveryProvider';
import { GroupInvitation } from '../src/types';
process.env.TEST_HARNESS = 'true';
import { app, memoryGroups, memoryInvitations, buildInvitationUrl, getBaseUrl, setAdminDbForTesting } from '../server';

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

function createMockFirestore() {
  const mockDb = {
    collection(colName: string) {
      if (colName === 'groups') {
        return {
          doc(groupId: string) {
            return {
              async get() {
                const grp = memoryGroups.get(groupId);
                return {
                  exists: Boolean(grp),
                  data: () => grp,
                };
              },
              async set(data: any) {
                memoryGroups.set(groupId, data);
              },
              async update(partial: any) {
                const existing = memoryGroups.get(groupId) || {};
                memoryGroups.set(groupId, { ...existing, ...partial });
              },
              collection(subCol: string) {
                if (subCol === 'invitations') {
                  return {
                    doc(invId: string) {
                      return {
                        async get() {
                          const inv = memoryInvitations.get(invId);
                          return {
                            exists: Boolean(inv),
                            data: () => inv,
                          };
                        },
                        async set(data: any) {
                          memoryInvitations.set(invId, data);
                        },
                      };
                    },
                    where(_field: string, _op: string, val: any) {
                      return {
                        where() {
                          return this;
                        },
                        async get() {
                          const all = Array.from(memoryInvitations.values()).filter(
                            (i: any) => i.groupId === groupId && i.recipientIdentifier === val
                          );
                          return {
                            docs: all.map((d: any) => ({ data: () => d })),
                          };
                        },
                      };
                    },
                  };
                }
                if (subCol === 'activity') {
                  return {
                    doc(_actId: string) {
                      return {
                        async set(_data: any) {},
                      };
                    },
                  };
                }
                throw new Error(`Unhandled subcollection: ${subCol}`);
              },
            };
          },
        };
      }
      if (colName === 'groupInvitations') {
        return {
          doc(token: string) {
            return {
              async get() {
                const inv = memoryInvitations.get(token);
                return {
                  exists: Boolean(inv),
                  data: () => inv,
                };
              },
              async set(data: any) {
                memoryInvitations.set(token, data);
              },
            };
          },
        };
      }
      throw new Error(`Unhandled collection: ${colName}`);
    },
  };

  return mockDb;
}

console.log('================================================================================');
console.log('   MONEY VAULT — INVITATION TOKENS, APP_URL & ROUTE SECURITY SUITE             ');
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
    await (InvitationDeliveryProvider.sendEmailInvitation as any)(dummyInvitation, 'invitee@example.com');
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
    await (InvitationDeliveryProvider.sendSmsInvitation as any)(dummyInvitation, '+919876543210');
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
  // TEST 5: resendGroupInvitation called without token MUST throw / fail
  // ===========================================================================
  let resendNoTokenThrew = false;
  let resendNoTokenError = '';
  try {
    await (InvitationDeliveryProvider.resendGroupInvitation as any)('grp_alpha', 'inv_test_token_01');
  } catch (err: any) {
    resendNoTokenThrew = true;
    resendNoTokenError = err?.message || String(err);
  }

  assertTest(
    'INV-TOKEN-05',
    'Invitation Auth Token Enforcement',
    'resendGroupInvitation without token rejects with authentication required error',
    'Error: Authentication token is required',
    resendNoTokenError,
    resendNoTokenThrew && resendNoTokenError.includes('Authentication token is required')
  );

  // ===========================================================================
  // TEST 6: revokeGroupInvitation called without token MUST throw / fail
  // ===========================================================================
  let revokeNoTokenThrew = false;
  let revokeNoTokenError = '';
  try {
    await (InvitationDeliveryProvider.revokeGroupInvitation as any)('grp_alpha', 'inv_test_token_01');
  } catch (err: any) {
    revokeNoTokenThrew = true;
    revokeNoTokenError = err?.message || String(err);
  }

  assertTest(
    'INV-TOKEN-06',
    'Invitation Auth Token Enforcement',
    'revokeGroupInvitation without token rejects with authentication required error',
    'Error: Authentication token is required',
    revokeNoTokenError,
    revokeNoTokenThrew && revokeNoTokenError.includes('Authentication token is required')
  );

  // ===========================================================================
  // TEST 7: In production, server refuses to build link when APP_URL is localhost
  // ===========================================================================
  const originalAppUrl = process.env.APP_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    process.env.NODE_ENV = 'production';
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
      'APP_URL Enforcement in Production',
      'In production, buildInvitationUrl refuses when APP_URL is http://localhost:3000',
      'SERVICE_UNAVAILABLE',
      localhostError,
      localhostThrew && localhostError.includes('SERVICE_UNAVAILABLE')
    );
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.APP_URL = originalAppUrl;
  }

  // ===========================================================================
  // TEST 8: In production, server refuses to build link when APP_URL is unset
  // ===========================================================================
  try {
    process.env.NODE_ENV = 'production';
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
      'APP_URL Enforcement in Production',
      'In production, buildInvitationUrl refuses when APP_URL is missing',
      'SERVICE_UNAVAILABLE',
      unsetError,
      unsetThrew && unsetError.includes('SERVICE_UNAVAILABLE')
    );
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.APP_URL = originalAppUrl;
  }

  // ===========================================================================
  // TEST 9: In production (NODE_ENV=production), NEVER fall back to request headers
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
  // TEST 10: When APP_URL is a valid non-localhost domain, link builds cleanly with /group-invite/
  // ===========================================================================
  try {
    process.env.APP_URL = 'https://vault.moneyvault.app';
    const builtUrl = buildInvitationUrl('safe_token_456');

    assertTest(
      'APP-URL-04',
      'Valid Invitation URL Construction',
      'Server builds valid invitation URL using /group-invite/<token> (not /#invite=)',
      'https://vault.moneyvault.app/group-invite/safe_token_456',
      builtUrl,
      builtUrl === 'https://vault.moneyvault.app/group-invite/safe_token_456'
    );
  } finally {
    process.env.APP_URL = originalAppUrl;
  }

  // ===========================================================================
  // ROUTE TESTS: Express in-process tests for production 503 & header spoofing
  // ===========================================================================
  // Set up mock Firestore to support route operations
  const mockDb = createMockFirestore();
  setAdminDbForTesting(mockDb as any);

  // Stub verifyIdToken for route authentication
  const auth = getAuth();
  auth.verifyIdToken = async (idToken: string) => {
    if (idToken.startsWith('owner_token')) {
      return {
        uid: 'owner-alice-uid',
        email: 'alice@example.com',
        name: 'Alice Owner',
        email_verified: true,
        aud: firebaseConfig.projectId,
      } as any;
    }
    throw new Error('Invalid token');
  };

  // Seed group and invitation in memory
  const testGroupId = 'grp_prod_test';
  const testInvId = 'inv_prod_test';
  const testToken = 'token_prod_test';

  memoryGroups.set(testGroupId, {
    id: testGroupId,
    name: 'Production Workspace',
    ownerId: 'owner-alice-uid',
    ownerName: 'Alice Owner',
    currency: 'INR',
    members: [{ id: 'owner-alice-uid', uid: 'owner-alice-uid', name: 'Alice Owner', role: 'owner', status: 'joined' }],
    memberUids: ['owner-alice-uid'],
  });

  const testInv = {
    id: testInvId,
    token: testToken,
    groupId: testGroupId,
    groupName: 'Production Workspace',
    invitedByUid: 'owner-alice-uid',
    invitedByName: 'Alice Owner',
    recipientIdentifier: 'friend@example.com',
    recipientEmail: 'friend@example.com',
    recipientName: 'Friend',
    recipientType: 'email',
    role: 'member',
    status: 'pending',
    expiresAt: Date.now() + 86400000,
  };
  memoryInvitations.set(testInvId, testInv);
  memoryInvitations.set(testToken, testInv);

  const testSmsInvId = 'inv_prod_test_sms';
  const testSmsToken = 'token_prod_test_sms';
  const testSmsInv = {
    id: testSmsInvId,
    token: testSmsToken,
    groupId: testGroupId,
    groupName: 'Production Workspace',
    invitedByUid: 'owner-alice-uid',
    invitedByName: 'Alice Owner',
    recipientIdentifier: '+919876543210',
    recipientPhone: '+919876543210',
    recipientName: 'Phone Friend',
    recipientType: 'phone',
    role: 'member',
    status: 'pending',
    expiresAt: Date.now() + 86400000,
  };
  memoryInvitations.set(testSmsInvId, testSmsInv);
  memoryInvitations.set(testSmsToken, testSmsInv);

  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const ownerBearer = 'Bearer owner_token.payload.signature';

  try {
    // Enable production mode and remove APP_URL
    process.env.NODE_ENV = 'production';
    delete process.env.APP_URL;

    // 11. POST /api/groups/:groupId/invitations in production without APP_URL returns 503
    const createRes = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations`, {
      method: 'POST',
      headers: {
        Authorization: ownerBearer,
        'Content-Type': 'application/json',
        'X-Forwarded-Host': 'evil-spoofed.com',
      },
      body: JSON.stringify({ email: 'newcolleague@example.com' }),
    });
    const createData = await createRes.json();
    assertTest(
      'ROUTE-503-01',
      'Production Route Availability',
      'POST /api/groups/:groupId/invitations in production with no APP_URL returns 503',
      503,
      createRes.status,
      createRes.status === 503 && createData.error === 'SERVICE_UNAVAILABLE'
    );

    // 12. POST /api/groups/:groupId/invitations/:invitationId/resend in production without APP_URL returns 503
    const resendRes = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations/${testInvId}/resend`, {
      method: 'POST',
      headers: {
        Authorization: ownerBearer,
        'Content-Type': 'application/json',
        'X-Forwarded-Host': 'evil-spoofed.com',
      },
    });
    const resendData = await resendRes.json();
    assertTest(
      'ROUTE-503-02',
      'Production Route Availability',
      'POST /api/groups/:groupId/invitations/:id/resend in production with no APP_URL returns 503',
      503,
      resendRes.status,
      resendRes.status === 503 && resendData.error === 'SERVICE_UNAVAILABLE'
    );

    // 13. POST /api/invitations/send-email in production without APP_URL returns 503
    const sendEmailRes = await fetch(`${baseUrl}/api/invitations/send-email`, {
      method: 'POST',
      headers: {
        Authorization: ownerBearer,
        'Content-Type': 'application/json',
        'X-Forwarded-Host': 'evil-spoofed.com',
      },
      body: JSON.stringify({ groupId: testGroupId, invitationId: testInvId }),
    });
    const sendEmailData = await sendEmailRes.json();
    assertTest(
      'ROUTE-503-03',
      'Production Route Availability',
      'POST /api/invitations/send-email in production with no APP_URL returns 503',
      503,
      sendEmailRes.status,
      sendEmailRes.status === 503 && sendEmailData.error === 'SERVICE_UNAVAILABLE'
    );

    // 14. POST /api/invitations/send-sms in production without APP_URL returns 503
    const sendSmsRes = await fetch(`${baseUrl}/api/invitations/send-sms`, {
      method: 'POST',
      headers: {
        Authorization: ownerBearer,
        'Content-Type': 'application/json',
        'X-Forwarded-Host': 'evil-spoofed.com',
      },
      body: JSON.stringify({ groupId: testGroupId, invitationId: testSmsInvId }),
    });
    const sendSmsData = await sendSmsRes.json();
    assertTest(
      'ROUTE-503-04',
      'Production Route Availability',
      'POST /api/invitations/send-sms in production with no APP_URL returns 503',
      503,
      sendSmsRes.status,
      sendSmsRes.status === 503 && sendSmsData.error === 'SERVICE_UNAVAILABLE'
    );

    // 15. Header spoofing protection: when APP_URL is configured, spoofed X-Forwarded-Host NEVER appears in link
    process.env.APP_URL = 'https://vault.moneyvault.app';
    const cleanCreateRes = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations`, {
      method: 'POST',
      headers: {
        Authorization: ownerBearer,
        'Content-Type': 'application/json',
        'X-Forwarded-Host': 'evil-spoofed.com',
        Host: 'evil-host.com',
      },
      body: JSON.stringify({ email: 'honest-user@example.com' }),
    });
    const cleanCreateData = await cleanCreateRes.json();
    const generatedUrl = cleanCreateData.inviteUrl || '';
    assertTest(
      'ROUTE-HOST-SPOOF',
      'Header Spoofing Prevention',
      'Spoofed X-Forwarded-Host / Host header is NEVER reflected in generated invitation link',
      'Starts with https://vault.moneyvault.app/group-invite/ and does not contain evil',
      generatedUrl,
      generatedUrl.startsWith('https://vault.moneyvault.app/group-invite/') &&
        !generatedUrl.includes('evil-spoofed.com') &&
        !generatedUrl.includes('evil-host.com')
    );
  } finally {
    server.close();
    process.env.NODE_ENV = originalNodeEnv;
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
