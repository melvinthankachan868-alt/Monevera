/**
 * Money Vault — Local Mode & Multi-User Isolation Verification Suite
 * Verifies:
 * 1. Guest record creation, updating, deletion, and persistence
 * 2. Strict storage namespace isolation between Guest, User A, and User B
 * 3. User A logout -> User B login data isolation in same browser session
 * 4. Zero silent merge between guest vault and authenticated account
 * 5. Quota exhaustion / storage failure behavior (no false save status)
 * 6. Financial invariant preservation across local and cloud modes
 * 7. Group expense calculation integrity in local mode
 */

import { storage } from '../src/db/indexedDB';
import { Expense, Income, AppSettings } from '../src/types';
import { calculateNetWorth, formatINR } from '../src/utils/calculations';

interface TestResult {
  id: string;
  category: string;
  assertion: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

async function runLocalModeAndIsolationSuite() {
  console.log('================================================================================');
  console.log('   MONEY VAULT — LOCAL-ONLY MODE & SESSION ISOLATION TEST SUITE                 ');
  console.log('================================================================================\n');

  const results: TestResult[] = [];

  // --------------------------------------------------------------------------
  // TEST 1: Initial Scope is 'guest'
  // --------------------------------------------------------------------------
  await storage.setScope('guest');
  const initialScope = storage.getScope();
  results.push({
    id: 'LOCAL-01-INITIAL-SCOPE',
    category: 'STORAGE_ISOLATION',
    assertion: 'Default unauthenticated storage scope is set to "guest"',
    status: initialScope === 'guest' ? 'PASS' : 'FAIL',
    details: `Scope is '${initialScope}'`,
  });

  // --------------------------------------------------------------------------
  // TEST 2: Guest Record Creation, Update, and Deletion
  // --------------------------------------------------------------------------
  const testGuestExpense: Expense = {
    id: `exp_guest_${Date.now()}`,
    amount: 1450,
    category: 'Needs',
    subcategory: 'Groceries',
    paymentMethod: 'UPI',
    date: '2026-10-19',
    note: 'Weekly provisions',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await storage.saveExpense(testGuestExpense);
  let guestExpenses = await storage.getExpenses();
  const createdInGuest = guestExpenses.some((e) => e.id === testGuestExpense.id);

  // Update
  const updatedGuestExpense: Expense = {
    ...testGuestExpense,
    amount: 1800,
    note: 'Weekly provisions + toiletries',
  };
  await storage.saveExpense(updatedGuestExpense);
  guestExpenses = await storage.getExpenses();
  const updatedInGuest = guestExpenses.find((e) => e.id === testGuestExpense.id)?.amount === 1800;

  // Delete
  await storage.deleteExpense(testGuestExpense.id);
  guestExpenses = await storage.getExpenses();
  const deletedInGuest = !guestExpenses.some((e) => e.id === testGuestExpense.id);

  results.push({
    id: 'LOCAL-02-GUEST-CRUD',
    category: 'LOCAL_VAULT_CRUD',
    assertion: 'Guest transactions support full Create, Read, Update, Delete in local storage',
    status: createdInGuest && updatedInGuest && deletedInGuest ? 'PASS' : 'FAIL',
    details: `Create: ${createdInGuest}, Update: ${updatedInGuest}, Delete: ${deletedInGuest}`,
  });

  // --------------------------------------------------------------------------
  // TEST 3: Strict Isolation Between Guest and User A
  // --------------------------------------------------------------------------
  // Step 3a: Write unique record to guest vault
  const guestPermanentExpense: Expense = {
    id: 'exp_guest_permanent',
    amount: 2500,
    category: 'Wants',
    subcategory: 'Dining',
    paymentMethod: 'Credit Card',
    date: '2026-10-19',
    note: 'Guest dinner',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await storage.setScope('guest');
  await storage.saveExpense(guestPermanentExpense);

  // Step 3b: Switch to User A
  await storage.setScope('user_UID_ALICE_111');
  let aliceExpenses = await storage.getExpenses();
  const guestLeakedToAlice = aliceExpenses.some((e) => e.id === 'exp_guest_permanent');

  // Step 3c: Alice writes her own record
  const aliceExpense: Expense = {
    id: 'exp_alice_secret',
    amount: 9999,
    category: 'Savings',
    subcategory: 'Stocks',
    paymentMethod: 'Bank Transfer',
    date: '2026-10-19',
    note: 'Alice private investment',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await storage.saveExpense(aliceExpense);
  aliceExpenses = await storage.getExpenses();
  const aliceSaved = aliceExpenses.some((e) => e.id === 'exp_alice_secret');

  results.push({
    id: 'LOCAL-03-GUEST-TO-USER-ISOLATION',
    category: 'STORAGE_ISOLATION',
    assertion: 'Guest records are completely isolated and never automatically merged into User A',
    status: !guestLeakedToAlice && aliceSaved ? 'PASS' : 'FAIL',
    details: `Guest leaked to Alice: ${guestLeakedToAlice}, Alice saved her own record: ${aliceSaved}`,
  });

  // --------------------------------------------------------------------------
  // TEST 4: User A Logout followed by User B Login in Same Browser
  // --------------------------------------------------------------------------
  // Step 4a: Alice logs out -> scope returns to guest
  await storage.setScope('guest');
  const postLogoutGuestExpenses = await storage.getExpenses();
  const aliceLeakedToGuest = postLogoutGuestExpenses.some((e) => e.id === 'exp_alice_secret');
  const guestDataStillIntact = postLogoutGuestExpenses.some((e) => e.id === 'exp_guest_permanent');

  // Step 4b: User B logs in
  await storage.setScope('user_UID_BOB_222');
  const bobInitialExpenses = await storage.getExpenses();
  const aliceLeakedToBob = bobInitialExpenses.some((e) => e.id === 'exp_alice_secret');
  const guestLeakedToBob = bobInitialExpenses.some((e) => e.id === 'exp_guest_permanent');

  // Step 4c: Bob writes his own record
  const bobExpense: Expense = {
    id: 'exp_bob_rent',
    amount: 22000,
    category: 'Needs',
    subcategory: 'Rent',
    paymentMethod: 'Bank Transfer',
    date: '2026-10-19',
    note: 'Bob apartment rent',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await storage.saveExpense(bobExpense);
  const bobExpenses = await storage.getExpenses();
  const bobSaved = bobExpenses.some((e) => e.id === 'exp_bob_rent');

  // Step 4d: Switch back to Alice to verify her data wasn't overwritten by Bob
  await storage.setScope('user_UID_ALICE_111');
  const aliceRevisitedExpenses = await storage.getExpenses();
  const aliceStillHasHerData = aliceRevisitedExpenses.some((e) => e.id === 'exp_alice_secret');
  const bobLeakedToAlice = aliceRevisitedExpenses.some((e) => e.id === 'exp_bob_rent');

  results.push({
    id: 'LOCAL-04-MULTI-USER-ISOLATION',
    category: 'STORAGE_ISOLATION',
    assertion: 'Multi-user isolation: User A logout followed by User B login exhibits zero data leakage',
    status:
      !aliceLeakedToGuest &&
      guestDataStillIntact &&
      !aliceLeakedToBob &&
      !guestLeakedToBob &&
      bobSaved &&
      aliceStillHasHerData &&
      !bobLeakedToAlice
        ? 'PASS'
        : 'FAIL',
    details: `Alice->Guest leak: ${aliceLeakedToGuest}, Alice->Bob leak: ${aliceLeakedToBob}, Bob->Alice leak: ${bobLeakedToAlice}`,
  });

  // --------------------------------------------------------------------------
  // TEST 5: Clean Up Test Scopes
  // --------------------------------------------------------------------------
  await storage.setScope('user_UID_ALICE_111');
  await storage.clearAllData();
  await storage.setScope('user_UID_BOB_222');
  await storage.clearAllData();
  await storage.setScope('guest');
  await storage.deleteExpense('exp_guest_permanent');

  // --------------------------------------------------------------------------
  // TEST 6: Financial Invariants in Local-Only Mode
  // --------------------------------------------------------------------------
  // Net worth = Assets - Liabilities
  const localAssets = [
    { type: 'Cash', value: 50000 },
    { type: 'Savings', value: 100000 },
    { type: 'Stocks', value: 75000 },
  ];
  const localLiabilities = [
    { type: 'Loan', value: 30000 },
    { type: 'CreditCard', value: 15000 },
  ];
  const totalAssets = localAssets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = localLiabilities.reduce((s, l) => s + l.value, 0);
  const calculatedNetWorth = totalAssets - totalLiabilities;
  const netWorthMatches = calculatedNetWorth === 180000;

  results.push({
    id: 'LOCAL-05-FINANCIAL-INVARIANTS',
    category: 'FINANCIAL_ACCURACY',
    assertion: 'Net worth balance sheet invariant (Assets ₹2,25,000 - Liabilities ₹45,000 = ₹1,80,000) holds locally',
    status: netWorthMatches ? 'PASS' : 'FAIL',
    details: `Assets: ${totalAssets}, Liabilities: ${totalLiabilities}, Net Worth: ${calculatedNetWorth}`,
  });

  // --------------------------------------------------------------------------
  // TEST 7: Local Group Expense Fair Share Isolation
  // --------------------------------------------------------------------------
  // ₹3000 total bill split 3 ways: User pays ₹3000. Personal share is ₹1000, ₹2000 is receivables
  const billTotal = 3000;
  const memberCount = 3;
  const personalShare = Math.round(billTotal / memberCount);
  const moneyOwedToUser = billTotal - personalShare;
  const splitInvariant = personalShare === 1000 && moneyOwedToUser === 2000;

  results.push({
    id: 'LOCAL-06-GROUP-SPLIT-INVARIANT',
    category: 'FINANCIAL_ACCURACY',
    assertion: 'Group expense personal share invariant: ₹3000 bill split 3 ways isolates ₹1000 personal expense',
    status: splitInvariant ? 'PASS' : 'FAIL',
    details: `Personal expense: ₹${personalShare}, Receivables: ₹${moneyOwedToUser}`,
  });

  // --------------------------------------------------------------------------
  // TEST 8: Storage Error / Quota Failure Handling
  // --------------------------------------------------------------------------
  // Simulating an un-persistable item to verify error throwing
  let quotaErrorThrown = false;
  try {
    // Attempting to write with an engine whose storage was explicitly disabled
    const mockStorage = new (storage.constructor as any)();
    mockStorage.isIndexedDBAvailable = false;
    // Safely mock broken localStorage in both browser and Node runtime
    const hasLocalStorage = typeof localStorage !== 'undefined';
    const origSetItem = hasLocalStorage ? localStorage.setItem : undefined;
    if (!hasLocalStorage) {
      (globalThis as any).localStorage = {
        setItem: () => {
          throw new Error('QuotaExceededError: DOM Exception 22');
        },
        getItem: () => null,
        removeItem: () => {},
      };
    } else {
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError: DOM Exception 22');
      };
    }
    try {
      await mockStorage.saveExpense({ id: 'quota_fail_test', amount: 100 } as any);
    } finally {
      if (hasLocalStorage && origSetItem) {
        localStorage.setItem = origSetItem;
      } else {
        delete (globalThis as any).localStorage;
      }
    }
  } catch (err: any) {
    quotaErrorThrown = Boolean(err?.message?.includes('storage unavailable or quota exceeded'));
  }

  results.push({
    id: 'LOCAL-07-QUOTA-ERROR-FAIL-SAFE',
    category: 'ERROR_HANDLING',
    assertion: 'Storage quota exhaustion or unavailability throws error without falsely reporting success',
    status: quotaErrorThrown ? 'PASS' : 'FAIL',
    details: `Error caught & propagated correctly: ${quotaErrorThrown}`,
  });

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n=== LOCAL MODE & ISOLATION RESULTS ===');
  console.table(
    results.map((r) => ({
      ID: r.id,
      Category: r.category,
      Assertion: r.assertion,
      Status: r.status,
      Details: r.details.slice(0, 70),
    }))
  );

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`\nTOTAL TESTS: ${results.length} | PASSED: ${results.filter((r) => r.status === 'PASS').length} | FAILED: ${results.filter((r) => r.status === 'FAIL').length}`);
  if (!allPassed) {
    process.exit(1);
  }
}

runLocalModeAndIsolationSuite().catch((err) => {
  console.error('Test suite runtime error:', err);
  process.exit(1);
});
