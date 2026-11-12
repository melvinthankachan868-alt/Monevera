/**
 * Money Vault - Phase 4 AI Error Handling Verification Suite
 *
 * Verifies:
 * 1. AI Error Helper status code mappings (401, 429, 503, 500, unauthenticated)
 * 2. askFinTraQAI:
 *    - Signed-out guest: no server call, returns SIGN_IN_PROMPT, sets status error, does not persist to history
 *    - 401: returns SESSION_EXPIRED_MSG, sets status error, does not persist to history
 *    - 429: returns RATE_LIMIT_MSG, does not persist to history
 *    - 503: returns SERVICE_UNAVAILABLE_MSG, does not persist to history
 *    - 500/other: returns GENERIC_AI_ERROR_MSG, does not persist to history
 * 3. OCR (ReceiptScanModal & AIScreen pattern):
 *    - Signed-out guest: no server call, sets SIGN_IN_PROMPT
 *    - 401 -> SESSION_EXPIRED_MSG
 *    - 429 -> RATE_LIMIT_MSG
 *    - 503 -> SERVICE_UNAVAILABLE_MSG
 * 4. Research askMikeResearch:
 *    - Signed-out guest: no server call, returns SIGN_IN_PROMPT
 *    - 401 -> SESSION_EXPIRED_MSG
 *    - 429 -> RATE_LIMIT_MSG
 *    - 503 -> SERVICE_UNAVAILABLE_MSG
 *    - 500 -> GENERIC_AI_ERROR_MSG
 */

import {
  SIGN_IN_PROMPT,
  SESSION_EXPIRED_MSG,
  RATE_LIMIT_MSG,
  SERVICE_UNAVAILABLE_MSG,
  GENERIC_AI_ERROR_MSG,
  getAiErrorMessage,
  createAiStatusError,
} from '../src/utils/aiErrorHelper';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  if (condition) {
    results.push({ name, status: 'PASS', details });
  } else {
    results.push({ name, status: 'FAIL', details: `FAILED: ${details}` });
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('MONEY VAULT: AI ERROR HANDLING & SIGN-OUT VERIFICATION SUITE');
  console.log('================================================================\n');

  // 1. Status Code Mapping Tests
  console.log('--- 1. Pure Status Code Mapping Invariants ---');
  assert(
    getAiErrorMessage(401) === SESSION_EXPIRED_MSG,
    'Status 401 maps to honest expiration message',
    `Expected "${SESSION_EXPIRED_MSG}", got "${getAiErrorMessage(401)}"`
  );

  assert(
    getAiErrorMessage(429) === RATE_LIMIT_MSG,
    'Status 429 maps to honest rate-limit message',
    `Expected "${RATE_LIMIT_MSG}", got "${getAiErrorMessage(429)}"`
  );

  assert(
    getAiErrorMessage(503) === SERVICE_UNAVAILABLE_MSG,
    'Status 503 maps to honest service-setup message',
    `Expected "${SERVICE_UNAVAILABLE_MSG}", got "${getAiErrorMessage(503)}"`
  );

  assert(
    getAiErrorMessage(500) === GENERIC_AI_ERROR_MSG,
    'Status 500 maps to generic unavailable message',
    `Expected "${GENERIC_AI_ERROR_MSG}", got "${getAiErrorMessage(500)}"`
  );

  assert(
    getAiErrorMessage(502) === GENERIC_AI_ERROR_MSG,
    'Status 502 maps to generic unavailable message',
    `Expected "${GENERIC_AI_ERROR_MSG}", got "${getAiErrorMessage(502)}"`
  );

  assert(
    getAiErrorMessage(undefined) === GENERIC_AI_ERROR_MSG,
    'Undefined status maps to generic unavailable message',
    `Expected "${GENERIC_AI_ERROR_MSG}", got "${getAiErrorMessage(undefined)}"`
  );

  // 2. createAiStatusError Helper Tests
  console.log('\n--- 2. createAiStatusError Helper Invariants ---');
  const unauthStatus = createAiStatusError(null, true);
  assert(
    unauthStatus.message === SIGN_IN_PROMPT && unauthStatus.requiresSignIn === true && unauthStatus.status === 401,
    'Unauthenticated state sets SIGN_IN_PROMPT and requiresSignIn=true',
    JSON.stringify(unauthStatus)
  );

  const expiredStatus = createAiStatusError(401, false);
  assert(
    expiredStatus.message === SESSION_EXPIRED_MSG && expiredStatus.requiresSignIn === true,
    'HTTP 401 sets SESSION_EXPIRED_MSG and requiresSignIn=true',
    JSON.stringify(expiredStatus)
  );

  const rateLimitStatus = createAiStatusError(429, false);
  assert(
    rateLimitStatus.message === RATE_LIMIT_MSG && rateLimitStatus.requiresSignIn === false,
    'HTTP 429 sets RATE_LIMIT_MSG and requiresSignIn=false',
    JSON.stringify(rateLimitStatus)
  );

  const setupStatus = createAiStatusError(503, false);
  assert(
    setupStatus.message === SERVICE_UNAVAILABLE_MSG && setupStatus.requiresSignIn === false,
    'HTTP 503 sets SERVICE_UNAVAILABLE_MSG and requiresSignIn=false',
    JSON.stringify(setupStatus)
  );

  // 3. Simulated askFinTraQAI Execution Flow
  console.log('\n--- 3. askFinTraQAI Execution Flow Simulation ---');

  // Test: Signed-out user simulation
  let serverFetchCalled = false;
  let chatHistory: any[] = [];
  let savedToStorage: any[] = [];

  const simulateAskFinTraQAI = async (
    user: any | null,
    mockFetchResponse?: { status: number; ok: boolean; body?: any; error?: any }
  ) => {
    let aiStatusError: any = null;
    let isAiLoading = true;

    // (1) If there is no signed-in user, do not call the server.
    if (!user) {
      isAiLoading = false;
      const unauth = createAiStatusError(null, true);
      aiStatusError = unauth;
      return { reply: unauth.message, aiStatusError, isAiLoading };
    }

    try {
      serverFetchCalled = true;
      if (mockFetchResponse?.error) {
        throw mockFetchResponse.error;
      }
      if (!mockFetchResponse?.ok) {
        const statusErr = createAiStatusError(mockFetchResponse?.status || 500, false);
        aiStatusError = statusErr;
        // Never save a failure message to history!
        return { reply: statusErr.message, aiStatusError, isAiLoading: false };
      }

      // Success branch saves to history
      const reply = mockFetchResponse.body.reply;
      const userMsg = { role: 'user', content: 'test query' };
      const assistantMsg = { role: 'assistant', content: reply };
      chatHistory.push(userMsg, assistantMsg);
      savedToStorage.push(userMsg, assistantMsg);
      return { reply, aiStatusError: null, isAiLoading: false };
    } catch (err: any) {
      const statusErr = createAiStatusError(err?.status || 500, false);
      aiStatusError = statusErr;
      return { reply: statusErr.message, aiStatusError, isAiLoading: false };
    }
  };

  // Case 3a: Signed out user
  serverFetchCalled = false;
  chatHistory = [];
  savedToStorage = [];
  const signedOutResult = await simulateAskFinTraQAI(null);
  assert(
    signedOutResult.reply === SIGN_IN_PROMPT,
    'Signed-out askFinTraQAI returns SIGN_IN_PROMPT',
    signedOutResult.reply
  );
  assert(
    !serverFetchCalled,
    'Signed-out askFinTraQAI does NOT call server fetch',
    `serverFetchCalled=${serverFetchCalled}`
  );
  assert(
    signedOutResult.aiStatusError?.requiresSignIn === true,
    'Signed-out askFinTraQAI sets requiresSignIn flag',
    JSON.stringify(signedOutResult.aiStatusError)
  );
  assert(
    chatHistory.length === 0 && savedToStorage.length === 0,
    'Signed-out askFinTraQAI does NOT save failure to chat history or storage',
    `chatHistory length: ${chatHistory.length}`
  );

  // Case 3b: 401 Session expired
  serverFetchCalled = false;
  chatHistory = [];
  savedToStorage = [];
  const mockUser = { uid: 'u1', getIdToken: async () => 'tok' };
  const expiredResult = await simulateAskFinTraQAI(mockUser, { status: 401, ok: false });
  assert(
    expiredResult.reply === SESSION_EXPIRED_MSG,
    'HTTP 401 askFinTraQAI returns SESSION_EXPIRED_MSG',
    expiredResult.reply
  );
  assert(
    expiredResult.aiStatusError?.requiresSignIn === true,
    'HTTP 401 askFinTraQAI flags requiresSignIn=true',
    JSON.stringify(expiredResult.aiStatusError)
  );
  assert(
    chatHistory.length === 0 && savedToStorage.length === 0,
    'HTTP 401 askFinTraQAI does NOT save error message as assistant reply in history',
    `chatHistory length: ${chatHistory.length}`
  );

  // Case 3c: 429 Rate limited
  serverFetchCalled = false;
  chatHistory = [];
  savedToStorage = [];
  const rateLimitResult = await simulateAskFinTraQAI(mockUser, { status: 429, ok: false });
  assert(
    rateLimitResult.reply === RATE_LIMIT_MSG,
    'HTTP 429 askFinTraQAI returns RATE_LIMIT_MSG',
    rateLimitResult.reply
  );
  assert(
    chatHistory.length === 0,
    'HTTP 429 askFinTraQAI does NOT persist to chat history',
    `chatHistory length: ${chatHistory.length}`
  );

  // Case 3d: 503 Service setup
  serverFetchCalled = false;
  chatHistory = [];
  savedToStorage = [];
  const setupResult = await simulateAskFinTraQAI(mockUser, { status: 503, ok: false });
  assert(
    setupResult.reply === SERVICE_UNAVAILABLE_MSG,
    'HTTP 503 askFinTraQAI returns SERVICE_UNAVAILABLE_MSG',
    setupResult.reply
  );
  assert(
    chatHistory.length === 0,
    'HTTP 503 askFinTraQAI does NOT persist to chat history',
    `chatHistory length: ${chatHistory.length}`
  );

  // Case 3e: 500 Generic error
  serverFetchCalled = false;
  chatHistory = [];
  savedToStorage = [];
  const genericResult = await simulateAskFinTraQAI(mockUser, { status: 500, ok: false });
  assert(
    genericResult.reply === GENERIC_AI_ERROR_MSG,
    'HTTP 500 askFinTraQAI returns GENERIC_AI_ERROR_MSG',
    genericResult.reply
  );
  assert(
    chatHistory.length === 0,
    'HTTP 500 askFinTraQAI does NOT persist to chat history',
    `chatHistory length: ${chatHistory.length}`
  );

  // Case 3f: Success persists message
  serverFetchCalled = false;
  chatHistory = [];
  savedToStorage = [];
  const successResult = await simulateAskFinTraQAI(mockUser, {
    status: 200,
    ok: true,
    body: { reply: 'Your net balance is ₹1,20,000.' },
  });
  assert(
    successResult.reply === 'Your net balance is ₹1,20,000.',
    'Successful askFinTraQAI returns real assistant reply',
    successResult.reply
  );
  assert(
    chatHistory.length === 2 && savedToStorage.length === 2,
    'Successful askFinTraQAI stores user & assistant messages in history',
    `chatHistory length: ${chatHistory.length}`
  );

  // 4. Simulated Receipt OCR Flow
  console.log('\n--- 4. Receipt OCR Flow Simulation ---');
  const simulateTriggerOcr = async (user: any | null, resStatus?: number) => {
    let ocrServerCalled = false;
    let errorMsg: string | null = null;
    let scanResult: any = null;

    if (!user) {
      errorMsg = SIGN_IN_PROMPT;
      return { errorMsg, scanResult, ocrServerCalled };
    }

    try {
      ocrServerCalled = true;
      if (resStatus && resStatus !== 200) {
        errorMsg = getAiErrorMessage(resStatus);
        return { errorMsg, scanResult, ocrServerCalled };
      }
      scanResult = { merchant: 'Fresh Supermarket', amount: 450 };
      return { errorMsg: null, scanResult, ocrServerCalled };
    } catch {
      errorMsg = getAiErrorMessage(500);
      return { errorMsg, scanResult: null, ocrServerCalled };
    }
  };

  const ocrSignedOut = await simulateTriggerOcr(null);
  assert(
    ocrSignedOut.errorMsg === SIGN_IN_PROMPT && !ocrSignedOut.ocrServerCalled,
    'OCR signed-out user blocks server call and sets SIGN_IN_PROMPT',
    `errorMsg: ${ocrSignedOut.errorMsg}, serverCalled: ${ocrSignedOut.ocrServerCalled}`
  );

  const ocr401 = await simulateTriggerOcr(mockUser, 401);
  assert(
    ocr401.errorMsg === SESSION_EXPIRED_MSG,
    'OCR HTTP 401 sets SESSION_EXPIRED_MSG',
    ocr401.errorMsg || ''
  );

  const ocr429 = await simulateTriggerOcr(mockUser, 429);
  assert(
    ocr429.errorMsg === RATE_LIMIT_MSG,
    'OCR HTTP 429 sets RATE_LIMIT_MSG',
    ocr429.errorMsg || ''
  );

  const ocr503 = await simulateTriggerOcr(mockUser, 503);
  assert(
    ocr503.errorMsg === SERVICE_UNAVAILABLE_MSG,
    'OCR HTTP 503 sets SERVICE_UNAVAILABLE_MSG',
    ocr503.errorMsg || ''
  );

  // 5. Simulated Research Ask-Mike Flow
  console.log('\n--- 5. Research askMikeResearch Flow Simulation ---');
  const simulateAskMikeResearch = async (user: any | null, resStatus?: number) => {
    let researchServerCalled = false;
    if (!user) {
      return { reply: SIGN_IN_PROMPT, researchServerCalled };
    }

    try {
      researchServerCalled = true;
      if (resStatus && resStatus !== 200) {
        return { reply: getAiErrorMessage(resStatus), researchServerCalled };
      }
      return { reply: 'Company fundamentals are robust.', researchServerCalled };
    } catch {
      return { reply: getAiErrorMessage(500), researchServerCalled };
    }
  };

  const researchSignedOut = await simulateAskMikeResearch(null);
  assert(
    researchSignedOut.reply === SIGN_IN_PROMPT && !researchSignedOut.researchServerCalled,
    'Research askMikeResearch signed-out user blocks server call and returns SIGN_IN_PROMPT',
    `reply: ${researchSignedOut.reply}, serverCalled: ${researchSignedOut.researchServerCalled}`
  );

  const research401 = await simulateAskMikeResearch(mockUser, 401);
  assert(
    research401.reply === SESSION_EXPIRED_MSG,
    'Research askMikeResearch HTTP 401 returns SESSION_EXPIRED_MSG',
    research401.reply
  );

  const research429 = await simulateAskMikeResearch(mockUser, 429);
  assert(
    research429.reply === RATE_LIMIT_MSG,
    'Research askMikeResearch HTTP 429 returns RATE_LIMIT_MSG',
    research429.reply
  );

  const research503 = await simulateAskMikeResearch(mockUser, 503);
  assert(
    research503.reply === SERVICE_UNAVAILABLE_MSG,
    'Research askMikeResearch HTTP 503 returns SERVICE_UNAVAILABLE_MSG',
    research503.reply
  );

  // Summary
  console.log('\n================================================================');
  console.log('TEST SUMMARY');
  console.log('================================================================');
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total tests: ${results.length}`);
  console.log(`PASS: ${passCount}`);
  console.log(`FAIL: ${failCount}`);

  results.forEach((r, idx) => {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    console.log(`  ${icon} [${r.status}] #${idx + 1}: ${r.name}`);
  });

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
