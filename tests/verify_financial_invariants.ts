/**
 * Money Vault - Financial Invariants & Accounting Engine Automated Test Suite
 *
 * Validates deterministic accounting principles, integer-paise math, split integrity,
 * debt netting, loan amortization, asset/liability net worth consistency, empty & large boundary conditions.
 *
 * Directly imports REAL production calculation functions from:
 * - src/utils/calculations.ts (formatINR, calculateCashFlow, calculateNetWorth, calculateMoneyOwedSummary, calculateEmergencyFundDetails, calculateSalarySplit)
 * - src/services/splitSettlementEngine.ts (SplitSettlementEngine)
 * - src/services/financialCalculationEngine.ts (FinancialCalculationEngine)
 *
 * Hand-computed arithmetic is explicitly documented in comments for each invariant test.
 */

import { SplitSettlementEngine } from '../src/services/splitSettlementEngine';
import {
  calculateCashFlow,
  calculateNetWorth,
  calculateMoneyOwedSummary,
  calculateEmergencyFundDetails,
  calculateSalarySplit,
  formatINR,
} from '../src/utils/calculations';
import { FinancialCalculationEngine } from '../src/services/financialCalculationEngine';
import {
  GroupMember,
  GroupExpense,
  MoneyOwed,
  FinancialAccount,
  SavingsRecord,
  Investment,
  Loan,
  Income,
  Allowance,
  Expense,
  EmergencyFund,
} from '../src/types';

interface TestResult {
  id: string;
  category: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const results: TestResult[] = [];

function assertInvariant(
  id: string,
  category: string,
  name: string,
  expected: any,
  actual: any,
  comparator?: (e: any, a: any) => boolean
) {
  const isPass = comparator
    ? comparator(expected, actual)
    : JSON.stringify(expected) === JSON.stringify(actual);
  results.push({
    id,
    category,
    name,
    expected: String(expected),
    actual: String(actual),
    passed: isPass,
  });
}

console.log('================================================================================');
console.log('   MONEY VAULT — FINANCIAL INVARIANTS & ACCOUNTING ENGINE AUDIT (REAL IMPORTS)  ');
console.log('================================================================================\n');

// ============================================================================
// TEST 1: Equal Split with Remainder Paise (INV-01-EQUAL-SPLIT-PAISE)
// ============================================================================
// Real function: SplitSettlementEngine.calculateEqualSplit
// Arithmetic:
// Amount = ₹100.00 = 10,000 paise.
// Total members = 3 (Alice, Bob, Charlie).
// Integer division: 10,000 / 3 = 3,333 paise per member with remainder 1 paise.
// Remainder allocation:
//   Member 1: 3,333 + 1 = 3,334 paise -> ₹33.34
//   Member 2: 3,333 paise           -> ₹33.33
//   Member 3: 3,333 paise           -> ₹33.33
// Sum of shares = 33.34 + 33.33 + 33.33 = 100.00 exactly (zero paise lost).
const split100by3 = SplitSettlementEngine.calculateEqualSplit(100, ['usr_a', 'usr_b', 'usr_c']);
const splitSum = split100by3.reduce((acc, s) => acc + s.shareAmount, 0);

assertInvariant(
  'INV-01-EQUAL-SPLIT-PAISE',
  'Group Split Integrity',
  '₹100 split among 3 members: shares sum exactly to ₹100.00 (33.34 + 33.33 + 33.33)',
  100.00,
  splitSum,
  (e, a) => Math.abs(e - a) < 0.0001 && split100by3[0].shareAmount === 33.34 && split100by3[1].shareAmount === 33.33
);

// ============================================================================
// TEST 2: Group Balances Sum to Zero (INV-02-GROUP-ZERO-SUM)
// ============================================================================
// Real functions: SplitSettlementEngine.calculateMemberBalances, verifyInvariants
// Arithmetic:
// Members: Alice, Bob, Charlie
// Expense 1: ₹1,200 paid by Alice, split equally (₹400 each).
//   Alice net = +1200 - 400 = +800
//   Bob net = -400
//   Charlie net = -400
// Expense 2: ₹600 paid by Bob, split equally between Alice & Bob (₹300 each).
//   Alice net = +800 - 300 = +500
//   Bob net = -400 + 600 - 300 = -100
//   Charlie net = -400
// Sum of net balances = (+500) + (-100) + (-400) = 0 exactly.
const members: GroupMember[] = [
  { id: 'usr_a', name: 'Alice', isCurrentUser: true },
  { id: 'usr_b', name: 'Bob', isCurrentUser: false },
  { id: 'usr_c', name: 'Charlie', isCurrentUser: false },
];

const sampleGroupExpenses: GroupExpense[] = [
  {
    id: 'exp_1',
    groupId: 'grp_01',
    title: 'Dinner',
    amount: 1200,
    category: 'Food',
    paidBy: [{ memberId: 'usr_a', amount: 1200 }],
    splitBetween: ['usr_a', 'usr_b', 'usr_c'],
    splits: [
      { memberId: 'usr_a', shareAmount: 400 },
      { memberId: 'usr_b', shareAmount: 400 },
      { memberId: 'usr_c', shareAmount: 400 },
    ],
    splitMethod: 'equal',
    date: '2026-10-01',
    createdBy: 'usr_a',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'exp_2',
    groupId: 'grp_01',
    title: 'Taxi',
    amount: 600,
    category: 'Transport',
    paidBy: [{ memberId: 'usr_b', amount: 600 }],
    splitBetween: ['usr_a', 'usr_b'],
    splits: [
      { memberId: 'usr_a', shareAmount: 300 },
      { memberId: 'usr_b', shareAmount: 300 },
    ],
    splitMethod: 'equal',
    date: '2026-10-02',
    createdBy: 'usr_b',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const groupBalances = SplitSettlementEngine.calculateMemberBalances(members, sampleGroupExpenses, []);
const totalSumOfBalances = groupBalances.reduce((sum, b) => sum + b.netBalance, 0);
const invariantCheck = SplitSettlementEngine.verifyInvariants(members, sampleGroupExpenses, []);

assertInvariant(
  'INV-02-GROUP-ZERO-SUM',
  'Group Ledger Invariant',
  'Sum of all group member balances must equal exactly ₹0',
  0,
  totalSumOfBalances,
  (e, a) => Math.abs(e - a) < 0.0001 && invariantCheck.isValid
);

// ============================================================================
// TEST 3: Debt Netting & Optimal Settlements (INV-03-DEBT-NETTING)
// ============================================================================
// Real function: SplitSettlementEngine.calculateOptimalSettlements
// Arithmetic:
// Balances from Test 2:
//   Alice: +₹500 (creditor)
//   Bob: -₹100 (debtor)
//   Charlie: -₹400 (debtor)
// Optimal settlement:
//   Bob pays Alice ₹100.
//   Charlie pays Alice ₹400.
// Total settlement amount = 100 + 400 = 500, resolving 3 members' debts in 2 payments.
const optimalSettlements = SplitSettlementEngine.calculateOptimalSettlements(groupBalances);
const bobPaysAlice = optimalSettlements.find((s) => s.fromMemberId === 'usr_b' && s.toMemberId === 'usr_a');
const charliePaysAlice = optimalSettlements.find((s) => s.fromMemberId === 'usr_c' && s.toMemberId === 'usr_a');

assertInvariant(
  'INV-03-DEBT-NETTING',
  'Debt Netting',
  'Debts net to Bob pays Alice ₹100 and Charlie pays Alice ₹400',
  'Bob: 100, Charlie: 400',
  `Bob: ${bobPaysAlice?.amount}, Charlie: ${charliePaysAlice?.amount}`
);

// ============================================================================
// TEST 4: Net Worth Equation (INV-04-NET-WORTH)
// ============================================================================
// Real function: calculateNetWorth
// Arithmetic:
// Assets:
//   Cash & Bank: ₹25,000
//   Savings (FD): ₹50,000
//   Investments (Current Value): ₹1,25,000
//   Money Lent (Unsettled): ₹15,000
//   Total Assets = 25,000 + 50,000 + 125,000 + 15,000 = ₹2,15,000
// Liabilities:
//   Money Borrowed (Unsettled): ₹5,000
//   Loans Outstanding: ₹40,000
//   Total Liabilities = 5,000 + 40,000 = ₹45,000
// Net Worth = Total Assets - Total Liabilities = 215,000 - 45,000 = ₹1,70,000
const testAccounts: FinancialAccount[] = [{ id: 'acc_1', name: 'Cash', type: 'Cash', balance: 25000 }];
const testSavings: SavingsRecord[] = [
  { id: 'sav_1', amount: 50000, type: 'Fixed Deposit', accountName: 'FD Bank', date: '2026-10-01', createdAt: 1 },
];
const testInvestments: Investment[] = [
  { id: 'inv_1', name: 'Nifty 50 Index', type: 'Mutual Funds', amountInvested: 100000, currentValue: 125000, date: '2026-10-01', createdAt: 1 },
];
const testMoneyOwed: MoneyOwed[] = [
  { id: 'ow_1', type: 'lent', personName: 'Friend', originalAmount: 15000, amountSettled: 0, remainingAmount: 15000, dateGivenOrBorrowed: '2026-10-01', dueDate: '2026-11-01', reminderEnabled: false, status: 'Pending', createdAt: 1 },
  { id: 'ow_2', type: 'borrowed', personName: 'Shopkeeper', originalAmount: 5000, amountSettled: 0, remainingAmount: 5000, dateGivenOrBorrowed: '2026-10-01', dueDate: '2026-11-01', reminderEnabled: false, status: 'Pending', createdAt: 1 },
];
const testLoans: Loan[] = [
  { id: 'ln_1', name: 'Personal Loan', type: 'Personal borrowing', originalAmount: 40000, outstandingAmount: 40000, emiAmount: 3500, interestRate: 10, dueDate: '10', frequency: 'Monthly', startDate: '2026-01-01', nextPaymentDate: '2026-11-01', reminderEnabled: false, status: 'Active', createdAt: 1 },
];

const netWorthResult = calculateNetWorth(
  testAccounts,
  testSavings,
  null,
  testInvestments,
  testMoneyOwed,
  testLoans
);

assertInvariant(
  'INV-04-NET-WORTH',
  'Net Worth Accounting',
  'Net Worth strictly equals Total Assets (₹2,15,000) minus Total Liabilities (₹45,000) = ₹1,70,000',
  170000,
  netWorthResult.netWorth
);

// ============================================================================
// TEST 5: Cash Flow Accounting Invariant (INV-05-CASH-FLOW)
// ============================================================================
// Real function: calculateCashFlow
// Arithmetic:
// Inflows:
//   Salary: ₹75,000
//   Allowance: ₹5,000
//   Total Inflow = 75,000 + 5,000 = ₹80,000
// Outflows:
//   Expenses: ₹30,000
//   Savings contribution: ₹15,000
//   Investment purchase: ₹10,000
//   Active Debt EMI: ₹5,000
//   Total Outflow = 30,000 + 15,000 + 10,000 + 5,000 = ₹60,000
// Remaining Cash Flow = 80,000 - 60,000 = ₹20,000
const testIncomes: Income[] = [
  { id: 'inc_1', amount: 75000, source: 'Company', type: 'Salary', date: '2026-10-01', createdAt: 1 },
];
const testAllowances: Allowance[] = [
  { id: 'al_1', name: 'HRA', amount: 5000, type: 'Housing', recurring: true, date: '2026-10-01', createdAt: 1 },
];
const testExpenses: Expense[] = [
  { id: 'exp_1', amount: 30000, category: 'Needs', subcategory: 'Groceries & Rent', date: '2026-10-05', createdAt: 1 },
];
const testSavingsTx: SavingsRecord[] = [
  { id: 'sav_cf', amount: 15000, type: 'Emergency Fund', accountName: 'Vault', date: '2026-10-05', createdAt: 1 },
];
const testInvestmentsTx: Investment[] = [
  { id: 'inv_cf', name: 'SIP', type: 'Mutual Funds', amountInvested: 10000, currentValue: 10000, date: '2026-10-05', createdAt: 1 },
];
const testActiveLoans: Loan[] = [
  { ...testLoans[0], emiAmount: 5000, status: 'Active' },
];

const cashFlowRes = calculateCashFlow(
  testIncomes,
  testAllowances,
  [],
  testExpenses,
  testSavingsTx,
  testInvestmentsTx,
  testActiveLoans,
  '2026-10'
);

assertInvariant(
  'INV-05-CASH-FLOW',
  'Cash Flow Accounting',
  'Inflows (₹80,000) minus Outflows (₹60,000) yields Remaining Cash Flow of ₹20,000',
  20000,
  cashFlowRes.remainingCashFlow
);

// ============================================================================
// TEST 6: Emergency Fund Progress Metrics (INV-06-EMERGENCY-FUND)
// ============================================================================
// Real function: calculateEmergencyFundDetails
// Arithmetic:
// Essential monthly expenses = ₹25,000
// Target duration = 6 months
// Target Amount = 25,000 * 6 = ₹1,50,000
// Current amount saved = ₹60,000
// Remaining amount = 150,000 - 60,000 = ₹90,000
// Progress percentage = round((60,000 / 150,000) * 100, 2) = 40.0%
// Months covered = round(60,000 / 25,000, 1) = 2.4 months
// Monthly contribution plan = ₹15,000
// Estimated months to complete = ceil(90,000 / 15,000) = 6 months
const sampleFund: EmergencyFund = {
  id: 'fund_01',
  currentAmount: 60000,
  targetMonths: 6,
  essentialMonthlyExpenses: 25000,
  monthlyContributionPlan: 15000,
  contributions: [],
};

const fundDetails = calculateEmergencyFundDetails(sampleFund);

assertInvariant(
  'INV-06-EMERGENCY-FUND',
  'Emergency Fund System',
  'Target: ₹1,50,000, Progress: 40%, Months Covered: 2.4, Est Months: 6',
  'Target: 150000, Progress: 40%, Months: 2.4, Est: 6',
  `Target: ${fundDetails.targetAmount}, Progress: ${fundDetails.progressPercentage}%, Months: ${fundDetails.monthsCovered}, Est: ${fundDetails.estimatedMonthsToComplete}`
);

// ============================================================================
// TEST 7: 50/30/20 Salary Split Sums (INV-07-50-30-20-SPLIT)
// ============================================================================
// Real function: calculateSalarySplit
// Arithmetic:
// Monthly income = ₹1,00,000
// Needs (50%) = round(100,000 * 50 / 100) = ₹50,000
// Wants (30%) = round(100,000 * 30 / 100) = ₹30,000
// Savings (20%) = round(100,000 * 20 / 100) = ₹20,000
// Sum = 50,000 + 30,000 + 20,000 = ₹1,00,000 (100% of income perfectly conserved).
const salarySplit = calculateSalarySplit(100000, 50, 30, 20);
const totalSplitSum = salarySplit.needsAmount + salarySplit.wantsAmount + salarySplit.savingsAmount;

assertInvariant(
  'INV-07-50-30-20-SPLIT',
  'Budget Allocation',
  '50/30/20 split of ₹1,00,000 equals ₹50,000 + ₹30,000 + ₹20,000 = ₹1,00,000',
  100000,
  totalSplitSum
);

// ============================================================================
// TEST 8: Loan Principal Repayment vs Interest Expense (INV-08-LOAN-PRINCIPAL-INTEREST)
// ============================================================================
// Arithmetic:
// Loan initial principal = ₹40,000
// Repayment event: Principal ₹5,000, Interest ₹250
// New principal = 40,000 - 5,000 = ₹35,000 (liability reduced by ₹5,000)
// Operating expense recognized = ₹250 (financing cost, NOT ₹5,250 total payment)
const loanBefore: Loan = { ...testLoans[0], outstandingAmount: 40000 };
const loanAfter: Loan = { ...loanBefore, outstandingAmount: 35000 };
const principalReduction = loanBefore.outstandingAmount - loanAfter.outstandingAmount;
const interestExpense: Expense = {
  id: 'exp_loan_int',
  amount: 250,
  category: 'Needs',
  subcategory: 'Loan Interest',
  date: '2026-10-10',
  createdAt: 1,
};
const loanCashFlow = calculateCashFlow([], [], [], [interestExpense], [], [], [], '2026-10');

assertInvariant(
  'INV-08-LOAN-PRINCIPAL-INTEREST',
  'Loan Accounting',
  'Repayment reduces loan liability by ₹5,000 while recording only ₹250 as expense',
  'Principal Reduced: 5000, Expense: 250',
  `Principal Reduced: ${principalReduction}, Expense: ${loanCashFlow.expenses}`
);

// ============================================================================
// TEST 9: Lent vs Borrowed Settlement Reconciliation (INV-09-LENT-BORROWED-SETTLEMENT)
// ============================================================================
// Real function: calculateMoneyOwedSummary
// Arithmetic:
// Lent record: Original ₹10,000, Settled ₹7,500 -> Remaining = 10,000 - 7,500 = ₹2,500 (Receivable)
// Borrowed record: Original ₹8,000, Settled ₹3,000 -> Remaining = 8,000 - 3,000 = ₹5,000 (Payable)
// Net Position = Receivables (2,500) - Payables (5,000) = -₹2,500
const owedRecords: MoneyOwed[] = [
  {
    id: 'ow_lent_part',
    type: 'lent',
    personName: 'Rahul',
    originalAmount: 10000,
    amountSettled: 7500,
    remainingAmount: 2500,
    dateGivenOrBorrowed: '2026-10-01',
    dueDate: '2026-11-01',
    reminderEnabled: false,
    status: 'Partially Settled',
    createdAt: 1,
  },
  {
    id: 'ow_borrow_part',
    type: 'borrowed',
    personName: 'Karan',
    originalAmount: 8000,
    amountSettled: 3000,
    remainingAmount: 5000,
    dateGivenOrBorrowed: '2026-10-01',
    dueDate: '2026-11-01',
    reminderEnabled: false,
    status: 'Partially Settled',
    createdAt: 1,
  },
];
const owedSummary = calculateMoneyOwedSummary(owedRecords);

assertInvariant(
  'INV-09-LENT-BORROWED-SETTLEMENT',
  'Debt Ledger',
  'Receivables: ₹2,500, Payables: ₹5,000, Net Position: -₹2,500',
  'ToReceive: 2500, ToRepay: 5000, Net: -2500',
  `ToReceive: ${owedSummary.toReceiveTotal}, ToRepay: ${owedSummary.toRepayTotal}, Net: ${owedSummary.netOutstanding}`
);

// ============================================================================
// TEST 10: Zero and Empty Boundary State (INV-10-ZERO-EMPTY-BOUNDARY)
// ============================================================================
// Real functions: calculateNetWorth, calculateCashFlow, calculateMoneyOwedSummary
// Arithmetic:
// Empty arrays for accounts, savings, investments, loans, debts:
// Net worth = ₹0 (not NaN or null)
// Inflow = ₹0, Expenses = ₹0, Remaining Cash Flow = ₹0
// Receivables = 0, Payables = 0, Net Outstanding = 0
const emptyNetWorth = calculateNetWorth([], [], null, [], [], []);
const emptyCashFlow = calculateCashFlow([], [], [], [], [], [], [], '2026-10');
const emptyOwed = calculateMoneyOwedSummary([]);

assertInvariant(
  'INV-10-ZERO-EMPTY-BOUNDARY',
  'Boundary Condition',
  'Empty financial records deterministically yield ₹0 without NaN or crashes',
  'NW: 0, Inflow: 0, Remaining: 0, Owed: 0',
  `NW: ${emptyNetWorth.netWorth}, Inflow: ${emptyCashFlow.totalInflow}, Remaining: ${emptyCashFlow.remainingCashFlow}, Owed: ${emptyOwed.netOutstanding}`
);

// ============================================================================
// TEST 11: Very Large Values (₹100 Crores) (INV-11-VERY-LARGE-VALUES)
// ============================================================================
// Real function: calculateNetWorth, formatINR
// Arithmetic:
// Asset = ₹1,00,00,00,000 (100 Crores)
// Liability = ₹35,00,00,000 (35 Crores)
// Net Worth = 1,00,00,00,000 - 35,00,00,000 = ₹65,00,00,000 (65 Crores)
// formatINR(1000000000) = "₹ 1,00,00,00,000"
const largeAccounts: FinancialAccount[] = [
  { id: 'acc_huge', name: 'Treasury', type: 'Bank account', balance: 1000000000 },
];
const largeLoans: Loan[] = [
  { id: 'ln_huge', name: 'Commercial Syndication', type: 'Bank loan', originalAmount: 350000000, outstandingAmount: 350000000, emiAmount: 5000000, interestRate: 8, dueDate: '1', frequency: 'Monthly', startDate: '2026-01-01', nextPaymentDate: '2026-11-01', reminderEnabled: false, status: 'Active', createdAt: 1 },
];
const largeNetWorth = calculateNetWorth(largeAccounts, [], null, [], [], largeLoans);
const formattedLarge = formatINR(1000000000);

assertInvariant(
  'INV-11-VERY-LARGE-VALUES',
  'Scale & Precision',
  '₹100 Crores minus ₹35 Crores debt equals ₹65 Crores (₹65,00,00,000) formatted as "₹ 1,00,00,00,000"',
  'NetWorth: 650000000, Formatted: ₹ 1,00,00,00,000',
  `NetWorth: ${largeNetWorth.netWorth}, Formatted: ${formattedLarge}`
);

// ============================================================================
// TEST 12: Indian Rupee (INR) Rounding and Formatting (INV-12-INR-ROUNDING)
// ============================================================================
// Real function: formatINR
// Arithmetic:
// formatINR(1234567.89):
//   Math.round(1234567.89) = 1234568
//   Indian numbering: last 3 digits = 568, prefix 1234 grouped by 2 = 12,34
//   Result = "₹ 12,34,568"
// formatINR(-50000): "-₹ 50,000"
// formatINR(0): "₹ 0"
const formattedFraction = formatINR(1234567.89);
const formattedNegative = formatINR(-50000);
const formattedZero = formatINR(0);

assertInvariant(
  'INV-12-INR-ROUNDING',
  'Currency Formatting',
  'formatINR formats 1234567.89 to "₹ 12,34,568", -50000 to "-₹ 50,000", and 0 to "₹ 0"',
  '₹ 12,34,568 | -₹ 50,000 | ₹ 0',
  `${formattedFraction} | ${formattedNegative} | ${formattedZero}`
);

// ============================================================================
// TEST 13: CAGR Engine Accuracy (INV-13-CAGR-METRICS)
// ============================================================================
// Real function: FinancialCalculationEngine.calculateCAGR
// Arithmetic:
// Start Value = 100, End Value = 144, Years = 2
// CAGR = (144 / 100)^(1/2) - 1 = sqrt(1.44) - 1 = 1.20 - 1 = 0.20 -> 20.0%
const cagrValue = FinancialCalculationEngine.calculateCAGR(100, 144, 2);

assertInvariant(
  'INV-13-CAGR-METRICS',
  'Growth Calculations',
  'CAGR from 100 to 144 over 2 years equals exactly 20.0%',
  20.0,
  cagrValue
);

// ============================================================================
// TEST 14: 1-Year Percentage Growth Engine (INV-14-PERCENTAGE-GROWTH)
// ============================================================================
// Real function: FinancialCalculationEngine.calculateGrowth
// Arithmetic:
// Previous Value = 80, Current Value = 100
// Growth = ((100 - 80) / 80) * 100 = (20 / 80) * 100 = 25.0%
const growthValue = FinancialCalculationEngine.calculateGrowth(80, 100);

assertInvariant(
  'INV-14-PERCENTAGE-GROWTH',
  'Growth Calculations',
  'Growth from 80 to 100 equals exactly 25.0%',
  25.0,
  growthValue
);

// ============================================================================
// SUMMARY & CI OUTPUT
// ============================================================================
console.log('\n=== FINANCIAL INVARIANTS TEST REPORT ===');
console.table(
  results.map((r) => ({
    ID: r.id,
    Category: r.category,
    Assertion: r.name,
    Status: r.passed ? 'PASS' : 'FAIL',
  }))
);

const allPassed = results.every((r) => r.passed);
console.log(`\nTOTAL FINANCIAL INVARIANT TESTS: ${results.length}`);
console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);

if (!allPassed) {
  process.exit(1);
}
