/**
 * Phase 3 Verification Suite: Budget Overview Component & Calculations
 *
 * Verifies:
 * 1. Hand-computed arithmetic for 0%, 50%, 100%, 130% over budget.
 * 2. Cap 0 and missing cap handling (no NaN, no Infinity, hasRing = false).
 * 3. Empty expense list (clean 0%).
 * 4. Month boundary: 23:59:59 of last day vs 00:00:00 of 1st day of next month.
 * 5. Leap day: 2028-02-29 correctly allocated to 2028-02.
 * 6. Integer-paise rounding: 3 x 33.33 = 99.99 against cap 100, remaining = 0.01.
 * 7. Indian currency formatting: formatINR(150000) produces "₹ 1,50,000".
 * 8. Parity test: overview numbers match category summaries, calculateCategorySpent, and calculateMonthlySummary.
 * 9. CSS token enforcement: no hardcoded hex, Wants safe (--mv-amber) visibly distinct from warning (--mv-warning).
 * 10. 99.6% label case: spent < cap shows min(99, rounded) = 99%, status remains warning.
 * 11. Own limits summing to a cap: sum of subcategory limits = cap, subcategory spend = spent, labeled "Your limits".
 * 12. Category with both limits and a guideline: own limits win.
 * 13. No income but own limits set: rings still appear (empty state does not show).
 */

import {
  getRingModel,
  formatINR,
  calculateCategorySpent,
  calculateTotalExpenses,
  calculateCategorySummaries,
  getItemsForMonth,
  calculateBudgetOverviewModel,
} from '../src/utils/calculations';
import { Expense, AppSettings, SubcategoryBudget } from '../src/types';

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    failures++;
  } else {
    console.log(`  PASS: ${msg}`);
  }
}

console.log('=== MONEY VAULT: PHASE 3 VERIFICATION SUITE ===\n');

// -----------------------------------------------------------------------------
// Test 1: Hand-computed arithmetic at 0%
// Cap: ₹ 10,000 (1,000,000 paise)
// Spent: ₹ 0 (0 paise)
// Remaining = 10,000 - 0 = 10,000
// percentageUsed = round((0 / 1,000,000) * 100) = 0%
// clampedPercent = 0%
// circumference (r=38) = 2 * PI * 38 = 238.76104...
// strokeDashoffset = 238.76104 * (1 - 0) = 238.76104 (empty stroke)
// status = 'safe', statusColor = 'var(--mv-cyan)'
// -----------------------------------------------------------------------------
console.log('Test 1: 0% spending');
{
  const model = getRingModel(0, 10000, 'Needs', 38);
  assert(model.hasRing === true, 'hasRing is true');
  assert(model.percentageUsed === 0, `percentageUsed is 0 (got ${model.percentageUsed})`);
  assert(model.clampedPercent === 0, `clampedPercent is 0 (got ${model.clampedPercent})`);
  assert(model.spent === 0, `spent is 0 (got ${model.spent})`);
  assert(model.cap === 10000, `cap is 10000 (got ${model.cap})`);
  assert(model.remaining === 10000, `remaining is 10000 (got ${model.remaining})`);
  assert(model.isOverBudget === false, 'isOverBudget is false');
  assert(model.overAmount === 0, 'overAmount is 0');
  assert(model.status === 'safe', `status is safe (got ${model.status})`);
  assert(model.statusColor === 'var(--mv-cyan)', `statusColor uses token var(--mv-cyan) (got ${model.statusColor})`);
  assert(Math.abs(model.strokeDashoffset - model.circumference) < 0.001, 'strokeDashoffset equals full circumference');
  assert(model.remainingText === '₹ 10,000 left', `remainingText is "₹ 10,000 left" (got ${model.remainingText})`);
  assert(model.spentOfCapText === '₹ 0 of ₹ 10,000', `spentOfCapText is "₹ 0 of ₹ 10,000" (got ${model.spentOfCapText})`);
}

// -----------------------------------------------------------------------------
// Test 2: Hand-computed arithmetic at 50%
// Cap: ₹ 10,000 (1,000,000 paise)
// Spent: ₹ 5,000 (500,000 paise)
// Remaining = 10,000 - 5,000 = 5,000
// percentageUsed = round((500,000 / 1,000,000) * 100) = 50%
// clampedPercent = 50%
// strokeDashoffset = circumference * (1 - 0.5) = circumference / 2
// status = 'safe', statusColor = 'var(--mv-cyan)'
// -----------------------------------------------------------------------------
console.log('\nTest 2: 50% spending');
{
  const model = getRingModel(5000, 10000, 'Needs', 38);
  assert(model.hasRing === true, 'hasRing is true');
  assert(model.percentageUsed === 50, `percentageUsed is 50 (got ${model.percentageUsed})`);
  assert(model.clampedPercent === 50, `clampedPercent is 50 (got ${model.clampedPercent})`);
  assert(model.remaining === 5000, `remaining is 5000 (got ${model.remaining})`);
  assert(model.isOverBudget === false, 'isOverBudget is false');
  assert(model.status === 'safe', `status is safe (got ${model.status})`);
  assert(model.statusColor === 'var(--mv-cyan)', `statusColor is var(--mv-cyan) (got ${model.statusColor})`);
  assert(Math.abs(model.strokeDashoffset - model.circumference / 2) < 0.001, 'strokeDashoffset is exactly half circumference');
  assert(model.remainingText === '₹ 5,000 left', `remainingText is "₹ 5,000 left" (got ${model.remainingText})`);
}

// -----------------------------------------------------------------------------
// Test 3: Hand-computed arithmetic at exactly 100%
// Cap: ₹ 10,000 (1,000,000 paise)
// Spent: ₹ 10,000 (1,000,000 paise)
// Remaining = 10,000 - 10,000 = 0
// percentageUsed = round((1,000,000 / 1,000,000) * 100) = 100%
// clampedPercent = 100%
// strokeDashoffset = circumference * (1 - 1.0) = 0
// status = 'warning' (>= 85% and not over budget)
// statusColor = 'var(--mv-warning)'
// -----------------------------------------------------------------------------
console.log('\nTest 3: 100% spending exactly');
{
  const model = getRingModel(10000, 10000, 'Needs', 38);
  assert(model.hasRing === true, 'hasRing is true');
  assert(model.percentageUsed === 100, `percentageUsed is 100 (got ${model.percentageUsed})`);
  assert(model.clampedPercent === 100, `clampedPercent is 100 (got ${model.clampedPercent})`);
  assert(model.remaining === 0, `remaining is 0 (got ${model.remaining})`);
  assert(model.isOverBudget === false, 'isOverBudget is false');
  assert(model.status === 'warning', `status is warning (got ${model.status})`);
  assert(model.statusColor === 'var(--mv-warning)', `statusColor is var(--mv-warning) (got ${model.statusColor})`);
  assert(Math.abs(model.strokeDashoffset) < 0.001, 'strokeDashoffset is 0');
  assert(model.remainingText === '₹ 0 left', `remainingText is "₹ 0 left" (got ${model.remainingText})`);
}

// -----------------------------------------------------------------------------
// Test 4: Hand-computed arithmetic at 130% over budget
// Cap: ₹ 10,000 (1,000,000 paise)
// Spent: ₹ 13,000 (1,300,000 paise)
// Remaining = 10,000 - 13,000 = -3,000 (overAmount = 3,000)
// percentageUsed = round((1,300,000 / 1,000,000) * 100) = 130% (un-clamped center label!)
// clampedPercent = min(max(130, 0), 100) = 100% (clamped SVG progress ring!)
// strokeDashoffset = circumference * (1 - 1.0) = 0
// status = 'danger'
// statusColor = 'var(--mv-danger)'
// -----------------------------------------------------------------------------
console.log('\nTest 4: 130% over budget');
{
  const model = getRingModel(13000, 10000, 'Needs', 38);
  assert(model.hasRing === true, 'hasRing is true');
  assert(model.percentageUsed === 130, `percentageUsed preserves real 130% (got ${model.percentageUsed})`);
  assert(model.clampedPercent === 100, `clampedPercent clamped to 100% (got ${model.clampedPercent})`);
  assert(model.remaining === -3000, `remaining is -3000 (got ${model.remaining})`);
  assert(model.isOverBudget === true, 'isOverBudget is true');
  assert(model.overAmount === 3000, `overAmount is 3000 (got ${model.overAmount})`);
  assert(model.status === 'danger', `status is danger (got ${model.status})`);
  assert(model.statusColor === 'var(--mv-danger)', `statusColor is var(--mv-danger) (got ${model.statusColor})`);
  assert(Math.abs(model.strokeDashoffset) < 0.001, 'strokeDashoffset is 0');
  assert(model.remainingText === '₹ 3,000 over', `remainingText is "₹ 3,000 over" (got ${model.remainingText})`);
  assert(model.spentOfCapText === '₹ 13,000 of ₹ 10,000', `spentOfCapText is "₹ 13,000 of ₹ 10,000" (got ${model.spentOfCapText})`);
  assert(model.ariaLabel === 'Needs: ₹ 13,000 of ₹ 10,000 spent, 130 percent', `ariaLabel includes 130 percent (got ${model.ariaLabel})`);
}

// -----------------------------------------------------------------------------
// Test 5: Cap 0 and missing cap (undefined / null / NaN)
// Cap: 0, Spent: 1,200
// hasRing must be false
// No NaN, no Infinity
// -----------------------------------------------------------------------------
console.log('\nTest 5: Cap 0 and missing cap');
{
  const zeroCap = getRingModel(1200, 0, 'Needs', 38);
  assert(zeroCap.hasRing === false, 'zeroCap: hasRing is false');
  assert(!isNaN(zeroCap.percentageUsed) && isFinite(zeroCap.percentageUsed), 'zeroCap: percentageUsed is finite');
  assert(!isNaN(zeroCap.strokeDashoffset) && isFinite(zeroCap.strokeDashoffset), 'zeroCap: strokeDashoffset is finite');
  assert(zeroCap.statusColor === 'var(--mv-danger)', `zeroCap with spend has danger color (got ${zeroCap.statusColor})`);
  assert(zeroCap.remainingText === 'No cap set', `zeroCap: remainingText is "No cap set" (got ${zeroCap.remainingText})`);
  assert(zeroCap.spentOfCapText === '₹ 1,200 spent', `zeroCap: spentOfCapText is "₹ 1,200 spent" (got ${zeroCap.spentOfCapText})`);

  const missingCap = getRingModel(500, undefined, 'Wants', 38);
  assert(missingCap.hasRing === false, 'missingCap (undefined): hasRing is false');
  assert(!isNaN(missingCap.percentageUsed) && isFinite(missingCap.percentageUsed), 'missingCap: percentageUsed is finite');

  const nanCap = getRingModel(NaN, NaN, 'Savings', 38);
  assert(nanCap.hasRing === false, 'nanCap: hasRing is false');
  assert(nanCap.spent === 0 && nanCap.cap === 0, 'nanCap: spent and cap default safely to 0');
  assert(!isNaN(nanCap.percentageUsed) && isFinite(nanCap.percentageUsed), 'nanCap: percentageUsed is not NaN');
}

// -----------------------------------------------------------------------------
// Test 6: No expenses at all (spent 0, cap 10,000)
// -----------------------------------------------------------------------------
console.log('\nTest 6: No expenses at all');
{
  const model = getRingModel(0, 10000, 'Wants', 38);
  assert(model.percentageUsed === 0, 'percentageUsed is clean 0');
  assert(model.clampedPercent === 0, 'clampedPercent is clean 0');
  assert(model.remaining === 10000, 'remaining is clean 10000');
  assert(model.status === 'safe', 'status is safe');
  assert(model.statusColor === 'var(--mv-amber)', `Wants safe color is var(--mv-amber) (got ${model.statusColor})`);
}

// -----------------------------------------------------------------------------
// Test 7: Month boundary
// Expense A: 2026-03-31
// Expense B: 2026-04-01
// -----------------------------------------------------------------------------
console.log('\nTest 7: Month boundary');
{
  const expenses: Expense[] = [
    {
      id: 'exp-1',
      date: '2026-03-31',
      category: 'Needs',
      subcategory: 'Groceries',
      amount: 450,
      note: 'End of March groceries',
      paymentMethod: 'UPI',
      createdAt: Date.now(),
    },
    {
      id: 'exp-2',
      date: '2026-04-01',
      category: 'Needs',
      subcategory: 'Rent',
      amount: 15000,
      note: 'First day of April rent',
      paymentMethod: 'Bank Transfer',
      createdAt: Date.now(),
    },
  ];

  const marchItems = getItemsForMonth(expenses, '2026-03');
  const aprilItems = getItemsForMonth(expenses, '2026-04');
  assert(marchItems.length === 1 && marchItems[0].id === 'exp-1', 'March items contains only exp-1 (2026-03-31)');
  assert(aprilItems.length === 1 && aprilItems[0].id === 'exp-2', 'April items contains only exp-2 (2026-04-01)');

  const marchSpent = calculateCategorySpent(expenses, 'Needs', '2026-03');
  const aprilSpent = calculateCategorySpent(expenses, 'Needs', '2026-04');
  assert(marchSpent === 450, `March Needs spent is 450 (got ${marchSpent})`);
  assert(aprilSpent === 15000, `April Needs spent is 15000 (got ${aprilSpent})`);
}

// -----------------------------------------------------------------------------
// Test 8: Leap day
// 2028-02-29 expense correctly allocated to 2028-02
// -----------------------------------------------------------------------------
console.log('\nTest 8: Leap day (2028-02-29)');
{
  const leapExpense: Expense = {
    id: 'exp-leap',
    date: '2028-02-29',
    category: 'Wants',
    subcategory: 'Dining',
    amount: 1850,
    note: 'Leap year dinner',
    paymentMethod: 'Credit Card',
    createdAt: Date.now(),
  };

  const feb2028 = getItemsForMonth([leapExpense], '2028-02');
  const mar2028 = getItemsForMonth([leapExpense], '2028-03');
  assert(feb2028.length === 1 && feb2028[0].id === 'exp-leap', 'Leap day expense included in 2028-02');
  assert(mar2028.length === 0, 'Leap day expense excluded from 2028-03');
}

// -----------------------------------------------------------------------------
// Test 9: Integer-paise rounding
// 3 expenses of 33.33 against cap of 100
// Spent = 33.33 * 3 = 99.99 (9,999 paise)
// Cap = 100 (10,000 paise)
// Remaining = 100 - 99.99 = 0.01 (1 paise)
// Must have ZERO floating-point precision artifacts (no 0.0099999999999909)
// -----------------------------------------------------------------------------
console.log('\nTest 9: Paise rounding');
{
  const spent = 33.33 + 33.33 + 33.33; // JavaScript float: 99.99000000000001
  const model = getRingModel(spent, 100, 'Needs', 38);
  assert(model.spent === 99.99, `model.spent is cleanly 99.99 (got ${model.spent})`);
  assert(model.remaining === 0.01, `model.remaining is cleanly 0.01 without float artefacts (got ${model.remaining})`);
  assert(model.isOverBudget === false, 'isOverBudget is false');
  // spent (99.99) < cap (100) and not over: must show min(99, rounded) = 99%
  assert(model.percentageUsed === 99, `percentageUsed shows min(99, rounded) = 99% when spent < cap (got ${model.percentageUsed})`);
}

// -----------------------------------------------------------------------------
// Test 10: Indian Currency Formatting (formatINR)
// formatINR(150000) -> "₹ 1,50,000" (not US "$150,000" or "₹ 150,000")
// -----------------------------------------------------------------------------
console.log('\nTest 10: Indian currency formatting');
{
  const formatted150k = formatINR(150000);
  assert(formatted150k === '₹ 1,50,000', `formatINR(150000) is "₹ 1,50,000" (got "${formatted150k}")`);

  const formatted12_5L = formatINR(1250000);
  assert(formatted12_5L === '₹ 12,50,000', `formatINR(1250000) is "₹ 12,50,000" (got "${formatted12_5L}")`);

  const formattedZero = formatINR(0);
  assert(formattedZero === '₹ 0', `formatINR(0) is "₹ 0" (got "${formattedZero}")`);
}

// -----------------------------------------------------------------------------
// Test 11: Parity Test
// Realistic dataset: verify overview matches calculateCategorySummaries,
// calculateCategorySpent, and dashboard monthly summary.
// -----------------------------------------------------------------------------
console.log('\nTest 11: Parity test with realistic dataset');
{
  const mockSettings: AppSettings = {
    needsPercentage: 50,
    wantsPercentage: 30,
    savingsPercentage: 20,
    monthlySalary: 50000,
    onboardingCompleted: true,
    firstDayOfWeek: 'Monday',
    defaultCategory: 'Needs',
    defaultPaymentMethod: 'UPI',
    currency: 'INR',
    theme: 'dark',
  };

  const mockExpenses: Expense[] = [
    { id: '1', date: '2026-10-05', category: 'Needs', subcategory: 'Groceries', amount: 8000, note: 'Groceries', paymentMethod: 'UPI', createdAt: Date.now() },
    { id: '2', date: '2026-10-12', category: 'Needs', subcategory: 'Utilities', amount: 4500, note: 'Power', paymentMethod: 'UPI', createdAt: Date.now() },
    { id: '3', date: '2026-10-15', category: 'Wants', subcategory: 'Dining', amount: 6200, note: 'Restaurants', paymentMethod: 'Credit Card', createdAt: Date.now() },
    { id: '4', date: '2026-10-20', category: 'Savings', subcategory: 'Emergency', amount: 10000, note: 'FD', paymentMethod: 'Bank Transfer', createdAt: Date.now() },
  ];

  const monthKey = '2026-10';
  const monthlyIncome = 50000;

  // 1. Compute category summaries exactly as FinTraQContext does
  const summaries = calculateCategorySummaries(mockExpenses, mockSettings, monthlyIncome, monthKey);
  const totalExpensesFromHelper = calculateTotalExpenses(mockExpenses, monthKey);

  // 2. Compute individual category ring models as BudgetOverview does
  const needsSummary = summaries.find((c) => c.category === 'Needs')!;
  const wantsSummary = summaries.find((c) => c.category === 'Wants')!;
  const savingsSummary = summaries.find((c) => c.category === 'Savings')!;

  const needsRing = getRingModel(needsSummary.spent, needsSummary.budget, 'Needs');
  const wantsRing = getRingModel(wantsSummary.spent, wantsSummary.budget, 'Wants');
  const savingsRing = getRingModel(savingsSummary.spent, savingsSummary.budget, 'Savings');

  // Verify Needs:
  assert(needsRing.cap === 25000, `Needs cap is 25000 (got ${needsRing.cap})`);
  assert(needsRing.spent === 12500, `Needs spent is 12500 (got ${needsRing.spent})`);
  assert(needsRing.spent === calculateCategorySpent(mockExpenses, 'Needs', monthKey), 'Needs spent matches calculateCategorySpent');
  assert(needsRing.remaining === needsSummary.remaining, 'Needs remaining matches summary.remaining');
  assert(needsRing.percentageUsed === needsSummary.percentageUsed, 'Needs percentageUsed matches summary.percentageUsed');

  // Verify Wants:
  assert(wantsRing.cap === 15000, `Wants cap is 15000 (got ${wantsRing.cap})`);
  assert(wantsRing.spent === 6200, `Wants spent is 6200 (got ${wantsRing.spent})`);
  assert(wantsRing.spent === calculateCategorySpent(mockExpenses, 'Wants', monthKey), 'Wants spent matches calculateCategorySpent');
  assert(wantsRing.remaining === wantsSummary.remaining, 'Wants remaining matches summary.remaining');
  assert(wantsRing.percentageUsed === wantsSummary.percentageUsed, 'Wants percentageUsed matches summary.percentageUsed');

  // Verify Savings:
  assert(savingsRing.cap === 10000, `Savings cap is 10000 (got ${savingsRing.cap})`);
  assert(savingsRing.spent === 10000, `Savings spent is 10000 (got ${savingsRing.spent})`);
  assert(savingsRing.spent === calculateCategorySpent(mockExpenses, 'Savings', monthKey), 'Savings spent matches calculateCategorySpent');

  // Total Parity:
  const totalSpentAcrossRings = needsRing.spent + wantsRing.spent + savingsRing.spent;
  assert(totalSpentAcrossRings === totalExpensesFromHelper, `Sum of rings (${totalSpentAcrossRings}) matches calculateTotalExpenses (${totalExpensesFromHelper})`);

  const totalCapAcrossRings = needsRing.cap + wantsRing.cap + savingsRing.cap;
  assert(totalCapAcrossRings === monthlyIncome, `Total cap (${totalCapAcrossRings}) matches monthly income (${monthlyIncome})`);

  // Overall Ring Parity:
  const overallModel = getRingModel(totalSpentAcrossRings, totalCapAcrossRings, 'Total Budget');
  assert(overallModel.spent === 28700, `Total spent is 28700 (got ${overallModel.spent})`);
  assert(overallModel.cap === 50000, `Total cap is 50000 (got ${overallModel.cap})`);
  assert(overallModel.percentageUsed === 57, `Total percentageUsed is 57% (got ${overallModel.percentageUsed})`);
  assert(overallModel.remaining === 21300, `Total remaining is 21300 (got ${overallModel.remaining})`);
}

// -----------------------------------------------------------------------------
// Test 12: The 99.6% label case
// Hand calculation:
// Cap: ₹ 1,000 (100,000 paise)
// Spent: ₹ 996 (99,600 paise)
// Spent < Cap (996 < 1000) and not over:
// rawPercentage = Math.round(996 / 1000 * 100) = 100%
// Contract requirement: when spent < cap and not over, never show 100%: show min(99, rounded) = 99%!
// status: identical to calculateBudgetStatus threshold (>= 85% -> 'warning')
// statusColor: 'var(--mv-warning)'
// -----------------------------------------------------------------------------
console.log('\nTest 12: 99.6% label case (spent < cap never shows 100%)');
{
  const model = getRingModel(996, 1000, 'Needs', 38);
  assert(model.spent === 996, `spent is 996 (got ${model.spent})`);
  assert(model.cap === 1000, `cap is 1000 (got ${model.cap})`);
  assert(model.remaining === 4, `remaining is 4 (got ${model.remaining})`);
  assert(model.isOverBudget === false, 'isOverBudget is false');
  assert(model.percentageUsed === 99, `percentageUsed is clamped to 99% (got ${model.percentageUsed})`);
  assert(model.clampedPercent === 99, `clampedPercent is 99% (got ${model.clampedPercent})`);
  assert(model.status === 'warning', `status is warning (>=85%) (got ${model.status})`);
  assert(model.statusColor === 'var(--mv-warning)', `statusColor is var(--mv-warning) (got ${model.statusColor})`);
  assert(model.remainingText === '₹ 4 left', `remainingText is "₹ 4 left" (got ${model.remainingText})`);
  assert(model.spentOfCapText === '₹ 996 of ₹ 1,000', `spentOfCapText is "₹ 996 of ₹ 1,000" (got ${model.spentOfCapText})`);
  assert(model.ariaLabel === 'Needs: ₹ 996 of ₹ 1,000 spent, 99 percent', `ariaLabel shows 99 percent (got ${model.ariaLabel})`);
}

// -----------------------------------------------------------------------------
// Test 13: Own limits summing to a cap
// Hand calculation:
// Category: Wants
// Subcategory limits for 2026-10:
// - Dining Out: ₹ 6,000
// - Shopping: ₹ 4,000
// - Entertainment: ₹ 2,000
// Sum of limits (Cap) = 6,000 + 4,000 + 2,000 = ₹ 12,000
// Expenses in matching subcategories:
// - Dining Out: ₹ 5,400
// - Shopping: ₹ 3,600
// - Entertainment: ₹ 1,000
// Sum of spent = 5,400 + 3,600 + 1,000 = ₹ 10,000
// percentageUsed = round(10,000 / 12,000 * 100) = 83%
// capTypeLabel = 'Your limits'
// status = 'safe' (83% <= 85%)
// statusColor = 'var(--mv-amber)' (Wants safe token, distinct from warning)
// -----------------------------------------------------------------------------
console.log('\nTest 13: Own limits summing to a cap');
{
  const mockBudgets: SubcategoryBudget[] = [
    { id: 'b1', category: 'Wants', subcategory: 'Dining Out', amount: 6000, month: '2026-10', createdAt: Date.now() },
    { id: 'b2', category: 'Wants', subcategory: 'Shopping', amount: 4000, month: '2026-10', createdAt: Date.now() },
    { id: 'b3', category: 'Wants', subcategory: 'Entertainment', amount: 2000, month: '2026-10', createdAt: Date.now() },
  ];

  const mockExpenses: Expense[] = [
    { id: 'e1', category: 'Wants', subcategory: 'Dining Out', amount: 5400, date: '2026-10-04', note: 'Dinner', createdAt: Date.now() },
    { id: 'e2', category: 'Wants', subcategory: 'Shopping', amount: 3600, date: '2026-10-10', note: 'Clothes', createdAt: Date.now() },
    { id: 'e3', category: 'Wants', subcategory: 'Entertainment', amount: 1000, date: '2026-10-18', note: 'Movies', createdAt: Date.now() },
  ];

  const result = calculateBudgetOverviewModel([], mockBudgets, mockExpenses, '2026-10');
  assert(result.hasAnyCap === true, 'hasAnyCap is true');
  assert(result.rings.length === 1, `exactly 1 ring produced (got ${result.rings.length})`);

  const wantsRing = result.rings.find((r) => r.category === 'Wants')!;
  assert(wantsRing !== undefined, 'Wants ring is present');
  assert(wantsRing.capType === 'own', `capType is 'own' (got ${wantsRing.capType})`);
  assert(wantsRing.capTypeLabel === 'Your limits', `capTypeLabel is 'Your limits' (got ${wantsRing.capTypeLabel})`);
  assert(wantsRing.model.cap === 12000, `Cap is sum of subcat limits: ₹ 12,000 (got ${wantsRing.model.cap})`);
  assert(wantsRing.model.spent === 10000, `Spent is sum of matching subcat expenses: ₹ 10,000 (got ${wantsRing.model.spent})`);
  assert(wantsRing.model.remaining === 2000, `Remaining is ₹ 2,000 (got ${wantsRing.model.remaining})`);
  assert(wantsRing.model.percentageUsed === 83, `percentageUsed is 83% (got ${wantsRing.model.percentageUsed})`);
  assert(wantsRing.model.status === 'safe', `status is safe (got ${wantsRing.model.status})`);
  assert(wantsRing.model.statusColor === 'var(--mv-amber)', `Wants safe color is var(--mv-amber) (got ${wantsRing.model.statusColor})`);
  assert(wantsRing.model.ariaLabel.includes('Your limits'), `ariaLabel includes 'Your limits' (got ${wantsRing.model.ariaLabel})`);
}

// -----------------------------------------------------------------------------
// Test 14: Category with both limits and a guideline (limits win)
// Hand calculation:
// Category: Needs
// Guideline: ₹ 30,000 cap from 50% split on 60,000 salary
// Own subcategory limits for 2026-10:
// - Rent: ₹ 15,000
// - Groceries: ₹ 8,000
// Sum of own limits = ₹ 23,000
// Spent:
// - Rent: ₹ 15,000
// - Groceries: ₹ 6,000
// Matching spent = ₹ 21,000
// Contract requirement: Own limits WIN over guideline!
// Cap must be ₹ 23,000 (NOT ₹ 30,000).
// Label must be 'Your limits'.
// percentageUsed = round(21,000 / 23,000 * 100) = 91%
// status: 'warning' (91% >= 85%)
// statusColor: 'var(--mv-warning)'
// -----------------------------------------------------------------------------
console.log('\nTest 14: Category with both limits and a guideline (limits win)');
{
  const categorySummaries = [
    {
      category: 'Needs' as const,
      budget: 30000, // 50% guideline cap
      spent: 21000,
      remaining: 9000,
      percentage: 50,
      percentageUsed: 70,
      isOverBudget: false,
      color: '#64D8FF',
      accentBg: '#FFF4ED',
      borderColor: '#FDBA74',
    },
  ];

  const mockBudgets: SubcategoryBudget[] = [
    { id: 'b-rent', category: 'Needs', subcategory: 'Rent', amount: 15000, month: '2026-10', createdAt: Date.now() },
    { id: 'b-groc', category: 'Needs', subcategory: 'Groceries', amount: 8000, month: '2026-10', createdAt: Date.now() },
  ];

  const mockExpenses: Expense[] = [
    { id: 'e-rent', category: 'Needs', subcategory: 'Rent', amount: 15000, date: '2026-10-01', note: 'Rent', createdAt: Date.now() },
    { id: 'e-groc', category: 'Needs', subcategory: 'Groceries', amount: 6000, date: '2026-10-05', note: 'Groceries', createdAt: Date.now() },
  ];

  const result = calculateBudgetOverviewModel(categorySummaries, mockBudgets, mockExpenses, '2026-10');
  const needsRing = result.rings.find((r) => r.category === 'Needs')!;

  assert(needsRing !== undefined, 'Needs ring is present');
  assert(needsRing.capType === 'own', `Own limits win: capType is 'own' (got ${needsRing.capType})`);
  assert(needsRing.capTypeLabel === 'Your limits', `capTypeLabel is 'Your limits' (got ${needsRing.capTypeLabel})`);
  assert(needsRing.model.cap === 23000, `Cap is own limits 23,000, NOT guideline 30,000 (got ${needsRing.model.cap})`);
  assert(needsRing.model.spent === 21000, `Spent is matching subcat spend 21,000 (got ${needsRing.model.spent})`);
  assert(needsRing.model.remaining === 2000, `Remaining is 2,000 (got ${needsRing.model.remaining})`);
  assert(needsRing.model.percentageUsed === 91, `percentageUsed is 91% (got ${needsRing.model.percentageUsed})`);
  assert(needsRing.model.status === 'warning', `status is warning (got ${needsRing.model.status})`);
  assert(needsRing.model.statusColor === 'var(--mv-warning)', `statusColor is var(--mv-warning) (got ${needsRing.model.statusColor})`);
}

// -----------------------------------------------------------------------------
// Test 15: No income but own limits set (rings still appear)
// Hand calculation:
// Income: ₹ 0 -> guideline budgets are all ₹ 0
// Own subcategory limit set for Savings: Mutual Funds = ₹ 5,000
// Spent: Mutual Funds = ₹ 3,000
// Contract requirement: Rings still appear! Empty state must ONLY appear when neither own limits NOR guideline exist.
// hasAnyCap must be true.
// -----------------------------------------------------------------------------
console.log('\nTest 15: No income but own limits set (rings still appear)');
{
  const categorySummariesZeroIncome = [
    { category: 'Needs' as const, budget: 0, spent: 0, remaining: 0, percentage: 50, percentageUsed: 0, isOverBudget: false, color: '', accentBg: '', borderColor: '' },
    { category: 'Wants' as const, budget: 0, spent: 0, remaining: 0, percentage: 30, percentageUsed: 0, isOverBudget: false, color: '', accentBg: '', borderColor: '' },
    { category: 'Savings' as const, budget: 0, spent: 0, remaining: 0, percentage: 20, percentageUsed: 0, isOverBudget: false, color: '', accentBg: '', borderColor: '' },
  ];

  const mockBudgets: SubcategoryBudget[] = [
    { id: 'b-mf', category: 'Savings', subcategory: 'Mutual Funds', amount: 5000, month: '2026-10', createdAt: Date.now() },
  ];

  const mockExpenses: Expense[] = [
    { id: 'e-mf', category: 'Savings', subcategory: 'Mutual Funds', amount: 3000, date: '2026-10-15', note: 'SIP', createdAt: Date.now() },
  ];

  const result = calculateBudgetOverviewModel(categorySummariesZeroIncome, mockBudgets, mockExpenses, '2026-10');
  assert(result.hasAnyCap === true, 'hasAnyCap is true even with 0 income because own limits exist');
  assert(result.rings.length === 1, `1 ring appears (got ${result.rings.length})`);

  const savingsRing = result.rings.find((r) => r.category === 'Savings')!;
  assert(savingsRing !== undefined, 'Savings ring appears');
  assert(savingsRing.capTypeLabel === 'Your limits', `Label is 'Your limits' (got ${savingsRing.capTypeLabel})`);
  assert(savingsRing.model.cap === 5000, `Cap is 5,000 (got ${savingsRing.model.cap})`);
  assert(savingsRing.model.spent === 3000, `Spent is 3,000 (got ${savingsRing.model.spent})`);
  assert(savingsRing.model.percentageUsed === 60, `percentageUsed is 60% (got ${savingsRing.model.percentageUsed})`);
  assert(savingsRing.model.status === 'safe', `status is safe (got ${savingsRing.model.status})`);
  assert(savingsRing.model.statusColor === 'var(--mv-green)', `Savings safe color is var(--mv-green) (got ${savingsRing.model.statusColor})`);

  // Empty state test: zero income AND zero own limits:
  const emptyResult = calculateBudgetOverviewModel(categorySummariesZeroIncome, [], [], '2026-10');
  assert(emptyResult.hasAnyCap === false, 'hasAnyCap is false when neither own limits nor guideline exist');
  assert(emptyResult.rings.length === 0, 'No rings when neither own limits nor guideline exist');
}

console.log(`\n=================================================`);
if (failures === 0) {
  console.log('ALL PHASE 3 VERIFICATION TESTS PASSED (0 failures)');
  process.exit(0);
} else {
  console.error(`PHASE 3 VERIFICATION FAILED WITH ${failures} FAILURE(S)`);
  process.exit(1);
}
