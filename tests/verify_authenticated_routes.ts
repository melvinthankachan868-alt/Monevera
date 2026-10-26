process.env.TEST_HARNESS = 'true';

import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { app, memoryGroups, memoryInvitations, setAdminDbForTesting } from '../server';

interface TestRecord {
  category: string;
  testCase: string;
  expectedStatus: number;
  actualStatus: number;
  assertionPassed: boolean;
  notes: string;
}

function createMockFirestore() {
  let simulateReadFailure = false;

  const mockDb = {
    setSimulateFailure(fail: boolean) {
      simulateReadFailure = fail;
    },
    collection(colName: string) {
      if (colName === 'groups') {
        return {
          doc(groupId: string) {
            return {
              async get() {
                if (simulateReadFailure) {
                  throw new Error('Simulated Firestore connection error');
                }
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
                          if (simulateReadFailure) {
                            throw new Error('Simulated Firestore connection error');
                          }
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
                    where(field: string, op: string, val: any) {
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
                if (simulateReadFailure) {
                  throw new Error('Simulated Firestore connection error');
                }
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

async function runAuthenticatedRouteTests() {
  console.log('================================================================================');
  console.log('   MONEY VAULT — AUTHENTICATED TEST HARNESS (STUBBED verifyIdToken)            ');
  console.log('================================================================================\n');

  // Stub verifyIdToken to test owner, non-owner, spoofing, and rate-limits without live tokens
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
    if (idToken.startsWith('non_owner_token')) {
      return {
        uid: 'non-owner-eve-uid',
        email: 'eve@example.com',
        name: 'Eve Intruder',
        email_verified: true,
        aud: firebaseConfig.projectId,
      } as any;
    }
    if (idToken.startsWith('attacker_token')) {
      return {
        uid: 'attacker-bob-uid',
        email: 'bob@example.com',
        name: 'Bob Attacker',
        email_verified: true,
        aud: firebaseConfig.projectId,
      } as any;
    }
    if (idToken.startsWith('spammer_token')) {
      return {
        uid: 'spammer-uid',
        email: 'spammer@example.com',
        aud: firebaseConfig.projectId,
      } as any;
    }
    throw new Error('Invalid or revoked token');
  };

  // Wire up the mock Firestore to test all Firestore-backed logic
  const mockDb = createMockFirestore();
  setAdminDbForTesting(mockDb as any);

  // Start in-process server on ephemeral random port
  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const ownerBearer = 'Bearer owner_token.payload.signature';
  const nonOwnerBearer = 'Bearer non_owner_token.payload.signature';
  const attackerBearer = 'Bearer attacker_token.payload.signature';
  const spammerBearer = 'Bearer spammer_token.payload.signature';

  // Seed test fixtures in memory
  const testGroupId = 'grp_test_alpha';
  const testInvId = 'inv_test_alpha';
  const testToken = 'token_test_alpha';
  const mismatchInvId = 'inv_test_mismatch';

  memoryGroups.set(testGroupId, {
    id: testGroupId,
    name: 'Alpha Trip',
    ownerId: 'owner-alice-uid',
    ownerName: 'Alice Owner',
    currency: 'INR',
    members: [
      { id: 'owner-alice-uid', uid: 'owner-alice-uid', name: 'Alice Owner', role: 'owner', status: 'joined' },
    ],
    memberUids: ['owner-alice-uid'],
  });

  const invRecord = {
    id: testInvId,
    token: testToken,
    groupId: testGroupId,
    groupName: 'Alpha Trip',
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
  memoryInvitations.set(testInvId, invRecord);
  memoryInvitations.set(testToken, invRecord);

  // Mismatch invitation fixture
  const mismatchRecord = {
    id: mismatchInvId,
    token: 'token_mismatch',
    groupId: 'grp_other_beta',
    groupName: 'Beta Trip',
    invitedByUid: 'owner-alice-uid',
    recipientIdentifier: 'other@example.com',
    recipientEmail: 'other@example.com',
    recipientType: 'email',
    role: 'member',
    status: 'pending',
    expiresAt: Date.now() + 86400000,
  };
  memoryInvitations.set(mismatchInvId, mismatchRecord);

  const results: TestRecord[] = [];

  // ==================== 1. Non-Owner Rejection Cases ====================
  // 1a. Non-owner calls resend -> 403
  const res1 = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations/${testInvId}/resend`, {
    method: 'POST',
    headers: { Authorization: nonOwnerBearer, 'Content-Type': 'application/json' },
  });
  results.push({
    category: 'AUTHZ_NON_OWNER',
    testCase: 'Non-owner rejected on resend invitation',
    expectedStatus: 403,
    actualStatus: res1.status,
    assertionPassed: res1.status === 403,
    notes: 'HTTP 403 FORBIDDEN received',
  });

  // 1b. Non-owner calls revoke -> 403
  const res2 = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations/${testInvId}/revoke`, {
    method: 'POST',
    headers: { Authorization: nonOwnerBearer, 'Content-Type': 'application/json' },
  });
  results.push({
    category: 'AUTHZ_NON_OWNER',
    testCase: 'Non-owner rejected on revoke invitation',
    expectedStatus: 403,
    actualStatus: res2.status,
    assertionPassed: res2.status === 403,
    notes: 'HTTP 403 FORBIDDEN received',
  });

  // 1c. Non-owner calls create invitation -> 403
  const res3 = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations`, {
    method: 'POST',
    headers: { Authorization: nonOwnerBearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'intruder_guest@example.com' }),
  });
  results.push({
    category: 'AUTHZ_NON_OWNER',
    testCase: 'Non-owner rejected on create invitation',
    expectedStatus: 403,
    actualStatus: res3.status,
    assertionPassed: res3.status === 403,
    notes: 'HTTP 403 FORBIDDEN received',
  });

  // 1d. Non-owner calls send-email -> 403
  const res4 = await fetch(`${baseUrl}/api/invitations/send-email`, {
    method: 'POST',
    headers: { Authorization: nonOwnerBearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId: testGroupId, invitationId: testInvId }),
  });
  results.push({
    category: 'AUTHZ_NON_OWNER',
    testCase: 'Non-owner rejected on send-email',
    expectedStatus: 403,
    actualStatus: res4.status,
    assertionPassed: res4.status === 403,
    notes: 'HTTP 403 FORBIDDEN received',
  });

  // 1e. Non-owner calls send-sms -> 403
  const res5 = await fetch(`${baseUrl}/api/invitations/send-sms`, {
    method: 'POST',
    headers: { Authorization: nonOwnerBearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId: testGroupId, invitationId: testInvId }),
  });
  results.push({
    category: 'AUTHZ_NON_OWNER',
    testCase: 'Non-owner rejected on send-sms',
    expectedStatus: 403,
    actualStatus: res5.status,
    assertionPassed: res5.status === 403,
    notes: 'HTTP 403 FORBIDDEN received',
  });

  // ==================== 2. Missing Group & Group Mismatch Checks ====================
  // 2a. Missing group on resend -> 404
  const res6 = await fetch(`${baseUrl}/api/groups/grp_nonexistent/invitations/${testInvId}/resend`, {
    method: 'POST',
    headers: { Authorization: ownerBearer, 'Content-Type': 'application/json' },
  });
  results.push({
    category: 'GROUP_INTEGRITY',
    testCase: 'Missing group returns 404 on resend',
    expectedStatus: 404,
    actualStatus: res6.status,
    assertionPassed: res6.status === 404,
    notes: 'HTTP 404 GROUP_NOT_FOUND',
  });

  // 2b. Missing group on revoke -> 404
  const res7 = await fetch(`${baseUrl}/api/groups/grp_nonexistent/invitations/${testInvId}/revoke`, {
    method: 'POST',
    headers: { Authorization: ownerBearer, 'Content-Type': 'application/json' },
  });
  results.push({
    category: 'GROUP_INTEGRITY',
    testCase: 'Missing group returns 404 on revoke',
    expectedStatus: 404,
    actualStatus: res7.status,
    assertionPassed: res7.status === 404,
    notes: 'HTTP 404 GROUP_NOT_FOUND',
  });

  // 2c. Group mismatch on resend (invitation.groupId !== req.params.groupId) -> 400
  const res8 = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations/${mismatchInvId}/resend`, {
    method: 'POST',
    headers: { Authorization: ownerBearer, 'Content-Type': 'application/json' },
  });
  results.push({
    category: 'GROUP_INTEGRITY',
    testCase: 'Group mismatch returns 400 on resend',
    expectedStatus: 400,
    actualStatus: res8.status,
    assertionPassed: res8.status === 400,
    notes: 'HTTP 400 GROUP_MISMATCH',
  });

  // 2d. Group mismatch on revoke (invitation.groupId !== req.params.groupId) -> 400
  const res9 = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations/${mismatchInvId}/revoke`, {
    method: 'POST',
    headers: { Authorization: ownerBearer, 'Content-Type': 'application/json' },
  });
  results.push({
    category: 'GROUP_INTEGRITY',
    testCase: 'Group mismatch returns 400 on revoke',
    expectedStatus: 400,
    actualStatus: res9.status,
    assertionPassed: res9.status === 400,
    notes: 'HTTP 400 GROUP_MISMATCH',
  });

  // ==================== 3. Firestore Read Failure (503 check) ====================
  // Simulate database error during read
  mockDb.setSimulateFailure(true);
  const resFailResend = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations/${testInvId}/resend`, {
    method: 'POST',
    headers: { Authorization: ownerBearer, 'Content-Type': 'application/json' },
  });
  results.push({
    category: 'ERROR_RESILIENCE',
    testCase: 'Firestore read failure returns 503 on resend (never skips check)',
    expectedStatus: 503,
    actualStatus: resFailResend.status,
    assertionPassed: resFailResend.status === 503,
    notes: 'HTTP 503 DATABASE_ERROR received',
  });

  const resFailRevoke = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations/${testInvId}/revoke`, {
    method: 'POST',
    headers: { Authorization: ownerBearer, 'Content-Type': 'application/json' },
  });
  results.push({
    category: 'ERROR_RESILIENCE',
    testCase: 'Firestore read failure returns 503 on revoke (never skips check)',
    expectedStatus: 503,
    actualStatus: resFailRevoke.status,
    assertionPassed: resFailRevoke.status === 503,
    notes: 'HTTP 503 DATABASE_ERROR received',
  });
  mockDb.setSimulateFailure(false);

  // ==================== 4. Owner Access Success ====================
  // 4a. Owner authorized on resend -> 200
  const res10 = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations/${testInvId}/resend`, {
    method: 'POST',
    headers: { Authorization: ownerBearer, 'Content-Type': 'application/json' },
  });
  const data10 = await res10.json();
  results.push({
    category: 'AUTHZ_OWNER',
    testCase: 'Owner authorized to resend invitation',
    expectedStatus: 200,
    actualStatus: res10.status,
    assertionPassed: res10.status === 200 && data10.success === true,
    notes: 'Owner succeeded with HTTP 200',
  });

  // 4b. Owner authorized on revoke -> 200
  const res11 = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations/${testInvId}/revoke`, {
    method: 'POST',
    headers: { Authorization: ownerBearer, 'Content-Type': 'application/json' },
  });
  const data11 = await res11.json();
  results.push({
    category: 'AUTHZ_OWNER',
    testCase: 'Owner authorized to revoke invitation',
    expectedStatus: 200,
    actualStatus: res11.status,
    assertionPassed: res11.status === 200 && data11.success === true,
    notes: 'Owner succeeded with HTTP 200',
  });

  // ==================== 5. Spoofed-Body-UID in Accept Route ====================
  const acceptInvId = 'inv_test_accept';
  const acceptToken = 'token_test_accept';
  const acceptRecord = {
    id: acceptInvId,
    token: acceptToken,
    groupId: testGroupId,
    groupName: 'Alpha Trip',
    invitedByUid: 'owner-alice-uid',
    recipientIdentifier: 'bob@example.com',
    recipientEmail: 'bob@example.com',
    recipientType: 'email',
    role: 'member',
    status: 'pending',
    expiresAt: Date.now() + 86400000,
  };
  memoryInvitations.set(acceptInvId, acceptRecord);
  memoryInvitations.set(acceptToken, acceptRecord);

  // Attacker token is for 'attacker-bob-uid', but body passes userUid='victim-charlie-uid'
  const res12 = await fetch(`${baseUrl}/api/group-invite/${acceptToken}/accept`, {
    method: 'POST',
    headers: { Authorization: attackerBearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userUid: 'victim-charlie-uid',
      userName: 'Charlie Victim',
      userEmail: 'charlie@victim.invalid',
    }),
  });
  const updatedGroup = memoryGroups.get(testGroupId);
  const joinedMembers = updatedGroup?.members || [];
  const charlieJoined = joinedMembers.some((m: any) => m.uid === 'victim-charlie-uid');
  const bobJoined = joinedMembers.some((m: any) => m.uid === 'attacker-bob-uid');
  const spoofingPrevented = !charlieJoined && bobJoined;

  results.push({
    category: 'IDENTITY_SPOOFING_GUARD',
    testCase: 'Accept route ignores body userUid and binds verified JWT UID',
    expectedStatus: 200,
    actualStatus: res12.status,
    assertionPassed: res12.status === 200 && spoofingPrevented,
    notes: `Bob joined: ${bobJoined}, Charlie spoofed: ${charlieJoined}`,
  });

  // ==================== 6. Rate Limiting 429 Case ====================
  let saw429 = false;
  let requestsCount = 0;
  for (let i = 0; i < 15; i++) {
    requestsCount++;
    const res = await fetch(`${baseUrl}/api/invitations/send-email`, {
      method: 'POST',
      headers: { Authorization: spammerBearer, 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: testGroupId, invitationId: testInvId }),
    });
    if (res.status === 429) {
      saw429 = true;
      break;
    }
  }

  results.push({
    category: 'RATE_LIMITING',
    testCase: 'Rate limiter enforces 429 on exceeding threshold',
    expectedStatus: 429,
    actualStatus: saw429 ? 429 : 200,
    assertionPassed: saw429,
    notes: `Triggered 429 at request #${requestsCount}`,
  });

  // Close ephemeral server
  server.close();

  console.log('=== TEST HARNESS RESULTS ===');
  console.table(
    results.map((r, i) => ({
      Index: i + 1,
      Category: r.category,
      TestCase: r.testCase,
      Expected: r.expectedStatus,
      Actual: r.actualStatus,
      Status: r.assertionPassed ? 'PASS' : 'FAIL',
      Notes: r.notes,
    }))
  );

  const allPassed = results.every((r) => r.assertionPassed);
  if (!allPassed) {
    console.error(`\n❌ Authenticated route test harness FAILED!`);
    process.exit(1);
  } else {
    console.log(`\n✅ All ${results.length} authenticated test harness assertions PASSED!`);
    process.exit(0);
  }
}

runAuthenticatedRouteTests();
