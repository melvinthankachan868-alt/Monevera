import fs from 'fs';

async function testRouteSecurityMatrix() {
  const baseUrl = 'http://localhost:3000';
  console.log('=== ROUTE SECURITY & ACCESS CONTROL MATRIX ===\n');

  const tests: Array<{
    name: string;
    url: string;
    method: string;
    expected: number;
    headers?: Record<string, string>;
    body?: string;
  }> = [
    // Public routes that MUST work without auth
    { name: 'Public Health Check', url: `${baseUrl}/api/health`, method: 'GET', expected: 200, headers: {} },
    { name: 'Public Research Discover', url: `${baseUrl}/api/research/discover`, method: 'GET', expected: 200, headers: {} },
    { name: 'Public Research Search', url: `${baseUrl}/api/research/search?q=TCS`, method: 'GET', expected: 200, headers: {} },
    { name: 'Public Research Glossary', url: `${baseUrl}/api/research/glossary`, method: 'GET', expected: 200, headers: {} },
    { name: 'Public Invitations Config', url: `${baseUrl}/api/invitations/config`, method: 'GET', expected: 200, headers: {} },

    // Protected Route: /api/alerts/notify (requires strict auth via requireAuth)
    {
      name: 'Protected /api/alerts/notify (No Auth Header)',
      url: `${baseUrl}/api/alerts/notify`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: 'test@example.com' }),
    },
    {
      name: 'Protected /api/alerts/notify (Malformed Bearer token)',
      url: `${baseUrl}/api/alerts/notify`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer malformed_token_string' },
      body: JSON.stringify({ recipientEmail: 'test@example.com' }),
    },
    {
      name: 'Protected /api/alerts/notify (Invalid JWT with 3 parts)',
      url: `${baseUrl}/api/alerts/notify`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer header.payload.signature' },
      body: JSON.stringify({ recipientEmail: 'test@example.com' }),
    },
    {
      name: 'Protected /api/alerts/notify (Expired/Fake JWT)',
      url: `${baseUrl}/api/alerts/notify`,
      method: 'POST',
      expected: 401,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid_signature',
      },
      body: JSON.stringify({ recipientEmail: 'test@example.com' }),
    },

    // Protected Route: /api/gemini/chat
    {
      name: 'Protected /api/gemini/chat (No Auth Header)',
      url: `${baseUrl}/api/gemini/chat`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    },
    {
      name: 'Protected /api/gemini/chat (Invalid Bearer)',
      url: `${baseUrl}/api/gemini/chat`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer invalid_raw_token' },
      body: JSON.stringify({ message: 'Hello' }),
    },

    // Protected Route: /api/ocr/receipt
    {
      name: 'Protected /api/ocr/receipt (No Auth Header)',
      url: `${baseUrl}/api/ocr/receipt`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: 'data:image/png;base64,123' }),
    },
    {
      name: 'Protected /api/ocr/receipt (Invalid Bearer)',
      url: `${baseUrl}/api/ocr/receipt`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer invalid_raw_token' },
      body: JSON.stringify({ imageBase64: 'data:image/png;base64,123' }),
    },

    // Protected Route: /api/research/ask-mike
    {
      name: 'Protected /api/research/ask-mike (No Auth Header)',
      url: `${baseUrl}/api/research/ask-mike`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Tell me about TCS' }),
    },
    {
      name: 'Protected /api/research/ask-mike (Invalid Bearer)',
      url: `${baseUrl}/api/research/ask-mike`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer invalid_raw_token' },
      body: JSON.stringify({ query: 'Tell me about TCS' }),
    },

    // Protected Route: /api/groups/:groupId/invitations
    {
      name: 'Protected /api/groups/:groupId/invitations (No Auth Header)',
      url: `${baseUrl}/api/groups/grp_123/invitations`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newmember@example.com' }),
    },

    // Protected Route: /api/groups/:groupId/invitations/:invitationId/resend
    {
      name: 'Protected /api/groups/:groupId/invitations/:invId/resend (No Auth Header)',
      url: `${baseUrl}/api/groups/grp_123/invitations/inv_123/resend`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
    },

    // Protected Route: /api/groups/:groupId/invitations/:invitationId/revoke
    {
      name: 'Protected /api/groups/:groupId/invitations/:invId/revoke (No Auth Header)',
      url: `${baseUrl}/api/groups/grp_123/invitations/inv_123/revoke`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
    },

    // Protected Route: /api/group-invite/:token/accept (No Auth Header & Crash Resistance)
    {
      name: 'Protected /api/group-invite/:token/accept (No Auth Header)',
      url: `${baseUrl}/api/group-invite/token_xyz/accept`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userUid: 'spoofed_uid_attempt' }),
    },
    {
      name: 'Crash Resistance /api/group-invite/x/accept (Unauthenticated POST)',
      url: `${baseUrl}/api/group-invite/x/accept`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arbitrary: 'data' }),
    },

    // Protected Route: /api/invitations/send-email
    {
      name: 'Protected /api/invitations/send-email (No Auth Header)',
      url: `${baseUrl}/api/invitations/send-email`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'friend@example.com' }),
    },

    // Protected Route: /api/invitations/send-sms
    {
      name: 'Protected /api/invitations/send-sms (No Auth Header)',
      url: `${baseUrl}/api/invitations/send-sms`,
      method: 'POST',
      expected: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: '+919876543210' }),
    },
  ];

  let allPassed = true;
  const results = [];
  for (const t of tests) {
    try {
      const res = await fetch(t.url, {
        method: t.method,
        headers: t.headers,
        body: t.body,
      });
      const passed = res.status === t.expected;
      if (!passed) allPassed = false;
      results.push({
        Route: t.name,
        Expected: t.expected,
        Actual: res.status,
        Status: passed ? 'PASS' : 'FAIL',
      });
    } catch (err: any) {
      allPassed = false;
      results.push({
        Route: t.name,
        Expected: t.expected,
        Actual: err.message,
        Status: 'FAIL',
      });
    }
  }

  console.table(results);

  // Verify server is still alive after unauthenticated and malicious requests
  try {
    const healthCheck = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthCheck.json();
    console.log(`Server Health Status after tests: ${healthJson.status === 'ok' ? 'HEALTHY (PASS)' : 'UNHEALTHY (FAIL)'}`);
  } catch (err: any) {
    console.error('Server died after tests (FAIL):', err.message);
    allPassed = false;
  }

  if (!allPassed) {
    console.error('\n❌ One or more route security tests failed!');
    process.exit(1);
  } else {
    console.log(`\n✅ All ${tests.length} route security matrix tests passed successfully!`);
    process.exit(0);
  }
}

testRouteSecurityMatrix();
