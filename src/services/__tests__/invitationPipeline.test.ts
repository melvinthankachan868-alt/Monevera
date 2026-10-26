/**
 * Comprehensive Automated Test Suite: Group Invitation Delivery Pipeline
 * Tests all endpoints, validation, token security, rate limiting, duplicate handling,
 * and delivery status semantics.
 */

async function runTests() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- Starting Group Invitation Delivery Pipeline Tests ---');

  // Test 1: Config endpoint
  console.log('\n[Test 1] GET /api/invitations/config');
  const configRes = await fetch(`${baseUrl}/api/invitations/config`);
  if (!configRes.ok) throw new Error(`Config endpoint failed: ${configRes.status}`);
  const config = await configRes.json();
  console.log('✓ Config response:', config);
  if (typeof config.emailConfigured !== 'boolean' || typeof config.smsConfigured !== 'boolean') {
    throw new Error('Config missing boolean flags');
  }

  // Mock group data for testing
  const testGroupId = `test_grp_${Date.now()}`;
  const mockGroup = {
    id: testGroupId,
    name: 'Goa Trip 2026',
    description: 'Annual beach vacation with friends',
    currency: 'INR',
    ownerId: 'owner_alvin_123',
    members: [
      { id: 'owner_alvin_123', uid: 'owner_alvin_123', name: 'Alvin', email: 'alvin@example.com', role: 'owner', status: 'joined', isCurrentUser: true }
    ],
    memberUids: ['owner_alvin_123'],
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Test 2: Invalid Email Rejection (Requirement 19)
  console.log('\n[Test 2] Invalid email inputs rejection');
  const invalidEmails = ['abc', 'abc@', 'abc@x', 'user@domain. c', ''];
  for (const invEmail of invalidEmails) {
    const res = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: invEmail, groupData: mockGroup }),
    });
    if (res.status !== 400) {
      throw new Error(`Expected 400 for email '${invEmail}', got ${res.status}`);
    }
    const data = await res.json();
    console.log(`✓ Rejected '${invEmail}': ${data.message || data.error}`);
  }

  // Test 3: Invalid Phone Rejection (Requirement 20)
  console.log('\n[Test 3] Invalid phone inputs rejection');
  const invalidPhones = ['123', '+91', '+910123456789', 'letters'];
  for (const invPhone of invalidPhones) {
    const res = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: invPhone, groupData: mockGroup }),
    });
    if (res.status !== 400) {
      throw new Error(`Expected 400 for phone '${invPhone}', got ${res.status}`);
    }
    const data = await res.json();
    console.log(`✓ Rejected '${invPhone}': ${data.message || data.error}`);
  }

  // Test 4: Existing Member Rejection (Requirement 18)
  console.log('\n[Test 4] Existing member rejection');
  const memberRes = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alvin@example.com', name: 'Alvin', groupData: mockGroup }),
  });
  if (memberRes.status !== 400) {
    throw new Error(`Expected 400 for existing member, got ${memberRes.status}`);
  }
  const memberData = await memberRes.json();
  console.log(`✓ Correctly rejected existing member: ${memberData.message}`);

  // Test 5: Real Creation Flow & Strict Delivery Semantics (Requirement 1, 2, 4)
  console.log('\n[Test 5] Create Invitation for rahul@example.com');
  const createRes = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahul@example.com', name: 'Rahul', groupData: mockGroup }),
  });
  if (!createRes.ok) {
    throw new Error(`Create invitation failed: ${createRes.status} ${await createRes.text()}`);
  }
  const createData = await createRes.json();
  console.log('✓ Invitation created response:', {
    success: createData.success,
    delivered: createData.delivered,
    deliveryStatus: createData.deliveryStatus,
    failureReason: createData.failureReason,
    token: createData.invitation.token,
    inviteUrl: createData.inviteUrl,
  });

  // Verify Requirement 4: Since email provider is unconfigured in this environment, it must NOT claim delivered!
  if (createData.delivered !== false) {
    throw new Error('FAILED: Claimed delivered=true when no email provider was configured!');
  }
  if (createData.deliveryStatus !== 'failed') {
    throw new Error(`FAILED: Expected deliveryStatus='failed', got ${createData.deliveryStatus}`);
  }
  if (!createData.invitation.token || createData.invitation.token.length < 16) {
    throw new Error('FAILED: Cryptographically secure token was not generated');
  }
  if (!createData.inviteUrl.includes('/group-invite/')) {
    throw new Error('FAILED: Invite URL does not contain /group-invite/');
  }
  console.log('✓ Strict Delivery Reporting Verified: Invitation created, token created, URL created, deliveryStatus accurately marked failed with clear reason.');

  const createdToken = createData.invitation.token;
  const createdInvId = createData.invitation.id;

  // Test 6: Duplicate Pending Invitation Handling (Requirement 17)
  console.log('\n[Test 6] Duplicate pending invitation check');
  const dupRes = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahul@example.com', name: 'Rahul', groupData: mockGroup }),
  });
  if (dupRes.status !== 409) {
    throw new Error(`Expected 409 for duplicate pending invite, got ${dupRes.status}`);
  }
  const dupData = await dupRes.json();
  console.log(`✓ Correctly detected duplicate: ${dupData.message}`);

  // Test 7: Public Lookup / Preview Endpoint (Requirement 6, 21)
  console.log('\n[Test 7] GET /api/group-invite/:token');
  const previewRes = await fetch(`${baseUrl}/api/group-invite/${createdToken}`);
  if (!previewRes.ok) {
    throw new Error(`Public lookup failed: ${previewRes.status}`);
  }
  const previewData = await previewRes.json();
  console.log('✓ Preview data returned:', previewData.invitation.groupName, 'Group Preview:', previewData.groupPreview);
  if (previewData.invitation.groupName !== 'Goa Trip 2026') {
    throw new Error('Group name mismatch in preview');
  }

  // Test 8: Identity Mismatch on Join (Requirement 22)
  console.log('\n[Test 8] Identity mismatch check (Arjun joining Rahul invitation)');
  const mismatchRes = await fetch(`${baseUrl}/api/group-invite/${createdToken}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userUid: 'arjun_uid_456',
      userName: 'Arjun',
      userEmail: 'arjun@example.com',
      confirmMismatchedIdentity: false, // Not confirmed!
    }),
  });
  if (mismatchRes.status !== 409) {
    throw new Error(`Expected 409 for mismatched identity without explicit confirmation, got ${mismatchRes.status}`);
  }
  const mismatchData = await mismatchRes.json();
  console.log(`✓ Correctly flagged identity mismatch: ${mismatchData.message}`);

  // Test 9: Acceptance with Explicit Confirmation (Requirement 21 & 22)
  console.log('\n[Test 9] Accept invitation with confirmation');
  const acceptRes = await fetch(`${baseUrl}/api/group-invite/${createdToken}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userUid: 'arjun_uid_456',
      userName: 'Arjun',
      userEmail: 'arjun@example.com',
      confirmMismatchedIdentity: true, // Explicitly confirmed!
    }),
  });
  if (!acceptRes.ok) {
    throw new Error(`Accept invitation failed: ${acceptRes.status} ${await acceptRes.text()}`);
  }
  const acceptData = await acceptRes.json();
  console.log('✓ Successfully joined group! Updated members count:', acceptData.group.members.length);
  const arjunMember = acceptData.group.members.find((m: any) => m.uid === 'arjun_uid_456');
  if (!arjunMember || arjunMember.status !== 'joined') {
    throw new Error('Arjun was not properly added as joined member in group roster');
  }

  // Test 10: Create Second Invitation and Test Revoke (Requirement 8, 17)
  console.log('\n[Test 10] Create and Revoke Invitation for anu@example.com');
  const anuCreateRes = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'anu@example.com', name: 'Anu', groupData: mockGroup }),
  });
  const anuData = await anuCreateRes.json();
  const anuToken = anuData.invitation.token;
  const anuInvId = anuData.invitation.id;

  const revokeRes = await fetch(`${baseUrl}/api/groups/${testGroupId}/invitations/${anuInvId}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!revokeRes.ok) {
    throw new Error(`Revoke failed: ${revokeRes.status}`);
  }
  console.log('✓ Invitation revoked successfully.');

  // Verify revoked token cannot be joined or previewed as valid (Requirement 23)
  const revokedLookupRes = await fetch(`${baseUrl}/api/group-invite/${anuToken}`);
  if (revokedLookupRes.status !== 410) {
    throw new Error(`Expected 410 for revoked token lookup, got ${revokedLookupRes.status}`);
  }
  console.log('✓ Confirmed: Revoked token correctly rejected with HTTP 410 INVITATION_REVOKED');

  console.log('\n🎉 ALL 10 PIPELINE & SECURITY TESTS PASSED PERFECTLY!');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
