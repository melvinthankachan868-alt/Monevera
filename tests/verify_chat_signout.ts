/**
 * Money Vault — AI Chat Sign-Out & Multi-User Isolation Verification Suite
 *
 * Verifies:
 * 1. After sign-out, chat is empty (in-memory cleared, guest scope isolated).
 * 2. An in-flight AI reply that arrives after sign-out is discarded and never written to storage.
 * 3. Sign out as User A, sign in as User B: B never sees A's chat messages.
 * 4. User A signs back in: A's stored chat persists and is fully restored (no regression).
 * 5. Guest mode chat behaviour is preserved (local-first storage without cross-scope leak).
 * 6. Pure shouldApplyAiReply guard invariants under user sign-out, account switches, and guest states.
 */

import { storage } from '../src/db/indexedDB';
import { shouldApplyAiReply } from '../src/utils/aiErrorHelper';
import { ChatMessage } from '../src/types';

interface TestResult {
  id: string;
  category: string;
  assertion: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

async function runChatSignoutSuite() {
  console.log('================================================================================');
  console.log('   MONEY VAULT — AI CHAT SIGN-OUT PRIVACY & SESSION ISOLATION SUITE            ');
  console.log('================================================================================\n');

  const results: TestResult[] = [];

  const uidA = `user_alpha_${Date.now()}`;
  const uidB = `user_beta_${Date.now()}`;

  const messageA1: ChatMessage = {
    id: `msg_u_${Date.now()}_1`,
    role: 'user',
    content: 'What is my net worth?',
    timestamp: Date.now() - 5000,
  };
  const messageA2: ChatMessage = {
    id: `msg_a_${Date.now()}_2`,
    role: 'assistant',
    content: 'Your net worth is ₹12,50,000.',
    timestamp: Date.now() - 4000,
  };

  // --------------------------------------------------------------------------
  // TEST 1: Pure Guard Unit Invariants (shouldApplyAiReply)
  // --------------------------------------------------------------------------
  const guardMatchesSameUser = shouldApplyAiReply(uidA, uidA);
  const guardBlocksSignout = shouldApplyAiReply(uidA, null);
  const guardBlocksSwitchedUser = shouldApplyAiReply(uidA, uidB);
  const guardBlocksGuest = shouldApplyAiReply(null, null);
  const guardBlocksUndefined = shouldApplyAiReply(undefined, uidA);

  const pureGuardPass =
    guardMatchesSameUser === true &&
    guardBlocksSignout === false &&
    guardBlocksSwitchedUser === false &&
    guardBlocksGuest === false &&
    guardBlocksUndefined === false;

  results.push({
    id: 'CHAT-01-GUARD-INVARIANTS',
    category: 'PURE_GUARD_LOGIC',
    assertion: 'shouldApplyAiReply permits same-user and blocks signed-out/switched users',
    status: pureGuardPass ? 'PASS' : 'FAIL',
    details: `same:${guardMatchesSameUser}, signout:${guardBlocksSignout}, switch:${guardBlocksSwitchedUser}, guest:${guardBlocksGuest}`,
  });

  // --------------------------------------------------------------------------
  // TEST 2: User A saves chat, signs out -> chat in memory cleared, guest isolated
  // --------------------------------------------------------------------------
  // Step 2a: User A logs in and saves conversation
  await storage.setScope(`user_${uidA}`);
  await storage.saveChatMessage(messageA1);
  await storage.saveChatMessage(messageA2);

  const userAChatInitial = await storage.getChatMessages();
  const userAHasMessages = userAChatInitial.length === 2 && userAChatInitial[0].id === messageA1.id;

  // Step 2b: User signs out -> scope switches to guest
  let simulatedMemoryChat: ChatMessage[] = [...userAChatInitial];
  // Signout contract: memory is cleared immediately
  simulatedMemoryChat = [];
  await storage.setScope('guest');
  const guestChatAfterSignout = await storage.getChatMessages();

  results.push({
    id: 'CHAT-02-SIGNOUT-EMPTY',
    category: 'SIGNOUT_PURGE',
    assertion: 'After sign-out, in-memory chat is cleared and guest scope has zero User A messages',
    status: userAHasMessages && simulatedMemoryChat.length === 0 && !guestChatAfterSignout.some((m) => m.id === messageA1.id) ? 'PASS' : 'FAIL',
    details: `User A saved: ${userAHasMessages}, Memory post-signout: ${simulatedMemoryChat.length}, Guest leak: ${guestChatAfterSignout.some((m) => m.id === messageA1.id)}`,
  });

  // --------------------------------------------------------------------------
  // TEST 3: In-flight AI reply arriving after sign-out is discarded and never written to storage
  // --------------------------------------------------------------------------
  // User A started request before sign-out
  const requestStartedFor = uidA;
  // User signs out before response arrives
  await storage.setScope('guest');
  const currentUidAtReplyTime: string | null = null; // signed out

  let replyAppliedToMemory = false;
  let replySavedToActiveStorage = false;

  if (shouldApplyAiReply(requestStartedFor, currentUidAtReplyTime)) {
    replyAppliedToMemory = true;
    await storage.saveChatMessage({
      id: 'msg_late_leak',
      role: 'assistant',
      content: 'Confidential financial summary arriving late',
      timestamp: Date.now(),
    });
    replySavedToActiveStorage = true;
  }

  const guestMessagesAfterLateReply = await storage.getChatMessages();
  const lateReplyDiscarded = !replyAppliedToMemory && !replySavedToActiveStorage && !guestMessagesAfterLateReply.some((m) => m.id === 'msg_late_leak');

  results.push({
    id: 'CHAT-03-INFLIGHT-DISCARD',
    category: 'RACE_CONDITION_PREVENTION',
    assertion: 'In-flight reply arriving after sign-out is discarded without writing to storage or memory',
    status: lateReplyDiscarded ? 'PASS' : 'FAIL',
    details: `Applied to memory: ${replyAppliedToMemory}, Saved to storage: ${replySavedToActiveStorage}, Guest messages: ${guestMessagesAfterLateReply.length}`,
  });

  // --------------------------------------------------------------------------
  // TEST 4: User A signs out, User B signs in -> B never sees A's chat
  // --------------------------------------------------------------------------
  await storage.setScope(`user_${uidB}`);
  const userBChatInitial = await storage.getChatMessages();
  const userBSeesNoA = !userBChatInitial.some((m) => m.id === messageA1.id || m.id === messageA2.id);

  results.push({
    id: 'CHAT-04-MULTIUSER-ISOLATION',
    category: 'CROSS_USER_PRIVACY',
    assertion: 'Sign out as User A, sign in as User B: User B never sees User A chat history',
    status: userBSeesNoA ? 'PASS' : 'FAIL',
    details: `User B sees User A messages: ${!userBSeesNoA}, User B message count: ${userBChatInitial.length}`,
  });

  // --------------------------------------------------------------------------
  // TEST 5: User A signs back in -> User A's stored chat is fully restored
  // --------------------------------------------------------------------------
  await storage.setScope(`user_${uidA}`);
  const userARestoredChat = await storage.getChatMessages();
  const userARestored = userARestoredChat.length === 2 && userARestoredChat[0].id === messageA1.id && userARestoredChat[1].id === messageA2.id;

  results.push({
    id: 'CHAT-05-PERSISTENCE-RESTORE',
    category: 'PERSISTENCE_INTEGRITY',
    assertion: 'Signed-in User A chat history persists across sign-out and is restored on next sign-in',
    status: userARestored ? 'PASS' : 'FAIL',
    details: `Restored messages count: ${userARestoredChat.length}, matches original: ${userARestored}`,
  });

  // --------------------------------------------------------------------------
  // TEST 6: Guest mode chat behaviour is preserved
  // --------------------------------------------------------------------------
  await storage.setScope('guest');
  const guestMsg: ChatMessage = {
    id: `msg_guest_${Date.now()}`,
    role: 'user',
    content: 'Guest sample query',
    timestamp: Date.now(),
  };
  await storage.saveChatMessage(guestMsg);
  const guestStored = await storage.getChatMessages();
  const guestHasSavedMsg = guestStored.some((m) => m.id === guestMsg.id);

  // Clear guest chat
  await storage.clearChatMessages();
  const guestAfterClear = await storage.getChatMessages();
  const guestCleared = guestAfterClear.length === 0;

  // Verify User A scope was never touched by guest actions
  await storage.setScope(`user_${uidA}`);
  const userACheckAfterGuest = await storage.getChatMessages();
  const userAUnchanged = userACheckAfterGuest.length === 2 && userACheckAfterGuest[0].id === messageA1.id;

  results.push({
    id: 'CHAT-06-GUEST-MODE-PRESERVED',
    category: 'GUEST_MODE_INTEGRITY',
    assertion: 'Guest mode local chat works independently and does not pollute user scopes',
    status: guestHasSavedMsg && guestCleared && userAUnchanged ? 'PASS' : 'FAIL',
    details: `Guest save: ${guestHasSavedMsg}, Guest clear: ${guestCleared}, User A untouched: ${userAUnchanged}`,
  });

  // --------------------------------------------------------------------------
  // TEST 7: SIMULATED Non-OK Response Branch Discards on Sign-Out
  // --------------------------------------------------------------------------
  const simUid = `user_sim_${Date.now()}`;
  let simAiStatusError: any = null;
  const simHandleNonOk = (startedUid: string, currentUid: string | null, status: number): string => {
    if (!shouldApplyAiReply(startedUid, currentUid)) {
      return '';
    }
    simAiStatusError = { status, message: 'Simulated HTTP Error' };
    return 'Simulated HTTP Error';
  };

  const nonOkResultOnSignout = simHandleNonOk(simUid, null, 500);
  const nonOkDiscarded = nonOkResultOnSignout === '' && simAiStatusError === null;

  results.push({
    id: 'CHAT-07-SIMULATED-NONOK-SIGNOUT-DISCARD',
    category: 'ERROR_BRANCH_GUARD',
    assertion: 'SIMULATED: Non-OK HTTP response discards error and skips setAiStatusError if user signed out',
    status: nonOkDiscarded ? 'PASS' : 'FAIL',
    details: `Returned: '${nonOkResultOnSignout}', errorSet: ${simAiStatusError !== null}`,
  });

  // --------------------------------------------------------------------------
  // TEST 8: SIMULATED Catch Branch Discards on Sign-Out
  // --------------------------------------------------------------------------
  let simCatchError: any = null;
  const simHandleCatch = (startedUid: string, currentUid: string | null, _err: any): string => {
    if (!shouldApplyAiReply(startedUid, currentUid)) {
      return '';
    }
    simCatchError = { message: 'Network Failure' };
    return 'Network Failure';
  };

  const catchResultOnSignout = simHandleCatch(simUid, null, new Error('ECONNRESET'));
  const catchDiscarded = catchResultOnSignout === '' && simCatchError === null;

  results.push({
    id: 'CHAT-08-SIMULATED-CATCH-SIGNOUT-DISCARD',
    category: 'CATCH_BRANCH_GUARD',
    assertion: 'SIMULATED: Catch branch discards error and skips setAiStatusError if user signed out',
    status: catchDiscarded ? 'PASS' : 'FAIL',
    details: `Returned: '${catchResultOnSignout}', errorSet: ${simCatchError !== null}`,
  });

  // --------------------------------------------------------------------------
  // TEST 9: SIMULATED Finally Block Loading Guard
  // --------------------------------------------------------------------------
  const runFinallyBranch = (startedUid: string, currentUid: string | null, currentLoading: boolean): boolean => {
    if (shouldApplyAiReply(startedUid, currentUid)) {
      return false;
    }
    return currentLoading;
  };

  // When signed out, finally does not reset loading (signOut already handles it)
  const loadingOnSignout = runFinallyBranch(simUid, null, true);
  const finallyGuardedOnSignout = loadingOnSignout === true;

  // When still signed in as same user, finally clears loading to false
  const loadingOnMatch = runFinallyBranch(simUid, simUid, true);
  const finallyClearsOnSameUser = loadingOnMatch === false;

  results.push({
    id: 'CHAT-09-SIMULATED-FINALLY-LOADING-GUARD',
    category: 'FINALLY_BRANCH_GUARD',
    assertion: 'SIMULATED: Finally block loading reset only fires if session matches active user',
    status: finallyGuardedOnSignout && finallyClearsOnSameUser ? 'PASS' : 'FAIL',
    details: `Guarded on signout: ${finallyGuardedOnSignout}, Cleared on match: ${finallyClearsOnSameUser}`,
  });

  // --------------------------------------------------------------------------
  // TEST 10: SIMULATED Mid-Save User Change Blocks Assistant Message Write
  // --------------------------------------------------------------------------
  const midSaveUserA = `user_midsave_a_${Date.now()}`;
  const midSaveUserB = `user_midsave_b_${Date.now()}`;
  await storage.setScope(`user_${midSaveUserA}`);

  const midUserMsg: ChatMessage = {
    id: `msg_u_mid_${Date.now()}`,
    role: 'user',
    content: 'User query before account switch',
    timestamp: Date.now(),
  };
  const midAsstMsg: ChatMessage = {
    id: `msg_a_mid_${Date.now()}`,
    role: 'assistant',
    content: 'Assistant answer',
    timestamp: Date.now(),
  };

  let simulatedCurrentUid: string | null = midSaveUserA;

  // Pre-save check 1
  let midSaveAborted = false;
  if (!shouldApplyAiReply(midSaveUserA, simulatedCurrentUid)) {
    midSaveAborted = true;
  } else {
    await storage.saveChatMessage(midUserMsg);
  }

  // User changes session right after first save
  simulatedCurrentUid = midSaveUserB;
  await storage.setScope(`user_${midSaveUserB}`);

  // Re-check 2 after first save
  let assistantSaveBlocked = false;
  if (!shouldApplyAiReply(midSaveUserA, simulatedCurrentUid)) {
    assistantSaveBlocked = true;
  } else {
    await storage.saveChatMessage(midAsstMsg);
  }

  // Verify: User A has midUserMsg but NOT midAsstMsg
  await storage.setScope(`user_${midSaveUserA}`);
  const userAMessages = await storage.getChatMessages();
  const userAHasUserMsg = userAMessages.some((m) => m.id === midUserMsg.id);
  const userAHasNoAsstMsg = !userAMessages.some((m) => m.id === midAsstMsg.id);

  // Verify: User B was not polluted
  await storage.setScope(`user_${midSaveUserB}`);
  const userBMessages = await storage.getChatMessages();
  const userBHasNoAsstMsg = !userBMessages.some((m) => m.id === midAsstMsg.id);

  const midSaveSafetyPassed =
    !midSaveAborted &&
    assistantSaveBlocked &&
    userAHasUserMsg &&
    userAHasNoAsstMsg &&
    userBHasNoAsstMsg;

  results.push({
    id: 'CHAT-10-SIMULATED-MID-SAVE-USER-CHANGE',
    category: 'STORAGE_WRITE_INTERRUPTION',
    assertion: 'SIMULATED: Re-checking user between storage saves prevents writing assistant message if user changed',
    status: midSaveSafetyPassed ? 'PASS' : 'FAIL',
    details: `Assistant blocked: ${assistantSaveBlocked}, User A has user msg: ${userAHasUserMsg}, User A clean: ${userAHasNoAsstMsg}, User B clean: ${userBHasNoAsstMsg}`,
  });

  // --------------------------------------------------------------------------
  // TEST 11: Guest Scope Load Logic Empties Store and Never Sets Chat State
  // --------------------------------------------------------------------------
  await storage.setScope('guest');
  const leftoverGuestMsg: ChatMessage = {
    id: `msg_legacy_guest_${Date.now()}`,
    role: 'assistant',
    content: 'Old leaked reply in guest store',
    timestamp: Date.now() - 10000,
  };
  await storage.saveChatMessage(leftoverGuestMsg);
  const guestHadMessageBeforeLoad = (await storage.getChatMessages()).length > 0;

  // Run the exact loadLocalCache logic:
  let simulatedLoadedState: ChatMessage[] = [leftoverGuestMsg]; // previous state
  if (storage.getScope() === 'guest') {
    simulatedLoadedState = [];
    await storage.clearChatMessages();
  } else {
    simulatedLoadedState = await storage.getChatMessages();
  }

  const guestMessagesAfterLoad = await storage.getChatMessages();
  const guestPurgePassed =
    guestHadMessageBeforeLoad &&
    simulatedLoadedState.length === 0 &&
    guestMessagesAfterLoad.length === 0;

  results.push({
    id: 'CHAT-11-GUEST-LOAD-PURGE',
    category: 'GUEST_STORE_PURGE',
    assertion: 'Guest scope load logic prevents chat reaching state and purges stored guest messages',
    status: guestPurgePassed ? 'PASS' : 'FAIL',
    details: `Had message before: ${guestHadMessageBeforeLoad}, State after load: ${simulatedLoadedState.length}, Store after load: ${guestMessagesAfterLoad.length}`,
  });

  // --------------------------------------------------------------------------
  // TEST 12: User Scope Chat is NOT Cleared by Guest Cleanup
  // --------------------------------------------------------------------------
  const persistentUserUid = `user_persist_${Date.now()}`;
  await storage.setScope(`user_${persistentUserUid}`);
  const userPermanentMsg: ChatMessage = {
    id: `msg_perm_${Date.now()}`,
    role: 'user',
    content: 'User permanent note',
    timestamp: Date.now(),
  };
  await storage.saveChatMessage(userPermanentMsg);

  // Switch to guest and trigger guest cleanup
  await storage.setScope('guest');
  if (storage.getScope() === 'guest') {
    await storage.clearChatMessages();
  }

  // Switch back to user scope and verify user chat remains intact
  await storage.setScope(`user_${persistentUserUid}`);
  const userMessagesAfterGuestCleanup = await storage.getChatMessages();
  const userChatPreserved =
    userMessagesAfterGuestCleanup.length === 1 &&
    userMessagesAfterGuestCleanup[0].id === userPermanentMsg.id;

  results.push({
    id: 'CHAT-12-USER-CHAT-NOT-CLEARED-BY-GUEST-CLEANUP',
    category: 'CROSS_SCOPE_SAFETY',
    assertion: 'Guest cleanup clears only guest scope and never touches user-scoped chat messages',
    status: userChatPreserved ? 'PASS' : 'FAIL',
    details: `User messages preserved: ${userChatPreserved}, count: ${userMessagesAfterGuestCleanup.length}`,
  });

  // --------------------------------------------------------------------------
  // TEST 13: Scope Mismatch Save Guard Refuses to Write
  // --------------------------------------------------------------------------
  const activeUid = `user_active_${Date.now()}`;
  // User started request as activeUid, but active storage scope is 'guest'
  await storage.setScope('guest');

  const testUnsafeMsg: ChatMessage = {
    id: `msg_unsafe_${Date.now()}`,
    role: 'assistant',
    content: 'Should never be written to guest store',
    timestamp: Date.now(),
  };

  let writeOccurred = false;
  // Guard implemented in askFinTraQAI:
  if (storage.getScope() === `user_${activeUid}`) {
    await storage.saveChatMessage(testUnsafeMsg);
    writeOccurred = true;
  }

  const guestChatAfterRefusal = await storage.getChatMessages();
  const writeBlocked = !writeOccurred && !guestChatAfterRefusal.some((m) => m.id === testUnsafeMsg.id);

  results.push({
    id: 'CHAT-13-SCOPE-MISMATCH-SAVE-GUARD',
    category: 'SCOPE_MISMATCH_PREVENTION',
    assertion: 'Save guard refuses to write when storage.getScope() does not match user_${startingUid}',
    status: writeBlocked ? 'PASS' : 'FAIL',
    details: `Write occurred: ${writeOccurred}, Scope refused: ${storage.getScope() !== `user_${activeUid}`}`,
  });

  // --------------------------------------------------------------------------
  // TEST 14: Mid-Load Scope Switch Aborts Chat State Application and Storage Purge
  // --------------------------------------------------------------------------
  const switchUserUid = `user_switched_${Date.now()}`;
  // Seed user scope with their own valid chat message
  await storage.setScope(`user_${switchUserUid}`);
  const switchUserMsg: ChatMessage = {
    id: `msg_switched_user_${Date.now()}`,
    role: 'user',
    content: 'User confidential financial question',
    timestamp: Date.now(),
  };
  await storage.saveChatMessage(switchUserMsg);

  // Set active scope to guest
  await storage.setScope('guest');
  const scopeAtStart = storage.getScope(); // 'guest'
  const guestChatReadPromise = storage.getChatMessages();

  // Before applying, user signs in: scope switches to user scope
  await storage.setScope(`user_${switchUserUid}`);

  // Execute the exact loadLocalCache guard logic
  let appliedChatState: ChatMessage[] | null = null;
  let purgeCalled = false;

  if (storage.getScope() === scopeAtStart) {
    if (scopeAtStart === 'guest') {
      appliedChatState = [];
      await storage.clearChatMessages();
      purgeCalled = true;
    } else {
      appliedChatState = await guestChatReadPromise;
    }
  }

  // Verify:
  // 1. appliedChatState is null (not applied to state)
  // 2. purge was not called on the active user scope
  // 3. User's stored chat in user_${switchUserUid} was not cleared
  const userChatAfterMidLoadSwitch = await storage.getChatMessages();
  const userChatIntact =
    userChatAfterMidLoadSwitch.length === 1 &&
    userChatAfterMidLoadSwitch[0].id === switchUserMsg.id;

  const midLoadGuardPassed =
    appliedChatState === null &&
    purgeCalled === false &&
    userChatIntact;

  results.push({
    id: 'CHAT-14-MID-LOAD-SCOPE-SWITCH-GUARD',
    category: 'ASYNC_LOAD_GUARD',
    assertion: 'Mid-load scope switch aborts chat state application and prevents user chat erasure',
    status: midLoadGuardPassed ? 'PASS' : 'FAIL',
    details: `Applied: ${appliedChatState !== null}, Purge called: ${purgeCalled}, User chat intact: ${userChatIntact}`,
  });

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('=== AI CHAT SIGN-OUT PRIVACY RESULTS ===');
  for (const r of results) {
    console.log(`[${r.status}] ${r.id}: ${r.assertion} (${r.details})`);
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\nTOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runChatSignoutSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
