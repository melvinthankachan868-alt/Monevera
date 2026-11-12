import { SplitSettlementEngine } from '../splitSettlementEngine';
import { GroupMember,GroupExpense,GroupSettlement } from '../../types/splitExpenses';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${msg}`);
  }
}

console.log('--- Testing SplitSettlementEngine ---');

// Test 1: Equal Split with Rounding (₹100 / 3)
const splits100 = SplitSettlementEngine.calculateEqualSplit(100, ['A', 'B', 'C']);
assert(splits100.length === 3, 'Equal split has 3 members');
const sumSplits100 = splits100.reduce((acc, s) => acc + s.shareAmount, 0);
assert(Math.round(sumSplits100 * 100) === 10000, `Sum of ₹100 split 3 ways is exactly ₹100.00 (got ${sumSplits100})`);
assert(splits100[0].shareAmount === 33.34, 'First member gets 33.34 paise');
assert(splits100[1].shareAmount === 33.33, 'Second member gets 33.33 paise');
assert(splits100[2].shareAmount === 33.33, 'Third member gets 33.33 paise');

// Test 2: Exact Split
const exactRes = SplitSettlementEngine.calculateExactSplit(4000, [
  { memberId: 'Alvin', amount: 500 },
  { memberId: 'Rahul', amount: 1000 },
  { memberId: 'Anu', amount: 1500 },
  { memberId: 'Arjun', amount: 1000 },
]);
assert(exactRes.isValid, 'Exact split summing to 4000 is valid');

const exactResInvalid = SplitSettlementEngine.calculateExactSplit(4000, [
  { memberId: 'Alvin', amount: 500 },
  { memberId: 'Rahul', amount: 1000 },
]);
assert(!exactResInvalid.isValid, 'Exact split not summing to 4000 is invalid');

// Test 3: Percentage Split
const pctRes = SplitSettlementEngine.calculatePercentageSplit(4000, [
  { memberId: 'Alvin', percentage: 25 },
  { memberId: 'Rahul', percentage: 25 },
  { memberId: 'Anu', percentage: 30 },
  { memberId: 'Arjun', percentage: 20 },
]);
assert(pctRes.isValid, 'Percentage split with 100% total is valid');
assert(pctRes.splits[0].shareAmount === 1000, 'Alvin 25% is 1000');
assert(pctRes.splits[2].shareAmount === 1200, 'Anu 30% is 1200');

// Test 4: Shares Split
const sharesRes = SplitSettlementEngine.calculateSharesSplit(4000, [
  { memberId: 'Alvin', shares: 1 },
  { memberId: 'Rahul', shares: 1 },
  { memberId: 'Anu', shares: 2 },
  { memberId: 'Arjun', shares: 1 },
]);
assert(sharesRes.isValid, 'Shares split with total 5 shares is valid');
assert(sharesRes.splits[0].shareAmount === 800, '1 share is ₹800');
assert(sharesRes.splits[2].shareAmount === 1600, '2 shares is ₹1600');

// Test 5: Multi-Payer Validation
const multiPayerValid = SplitSettlementEngine.validateExpensePayments(4000, [
  { memberId: 'Alvin', amount: 2500 },
  { memberId: 'Rahul', amount: 1500 },
]);
assert(multiPayerValid.isValid, 'Multi-payer payments summing to 4000 is valid');

const multiPayerInvalid = SplitSettlementEngine.validateExpensePayments(4000, [
  { memberId: 'Alvin', amount: 2500 },
  { memberId: 'Rahul', amount: 500 },
]);
assert(!multiPayerInvalid.isValid, 'Multi-payer payments not summing to 4000 is invalid');

// Test 6: REQUIRED TEST SCENARIO FROM PROMPT (Alvin, Rahul, Anu, Arjun)
const members: GroupMember[] = [
  { id: 'alvin', name: 'Alvin', isCurrentUser: true },
  { id: 'rahul', name: 'Rahul', isCurrentUser: false },
  { id: 'anu', name: 'Anu', isCurrentUser: false },
  { id: 'arjun', name: 'Arjun', isCurrentUser: false },
];

const exp1: GroupExpense = {
  id: 'exp-1',
  groupId: 'g-1',
  title: 'Hotel',
  amount: 4000,
  date: '2026-10-01',
  category: 'Accommodation',
  paidBy: [{ memberId: 'alvin', amount: 4000 }],
  splitMethod: 'equal',
  splitBetween: ['alvin', 'rahul', 'anu', 'arjun'],
  splits: SplitSettlementEngine.calculateEqualSplit(4000, ['alvin', 'rahul', 'anu', 'arjun']),
  createdAt: 1000,
  updatedAt: 1000,
};

const exp2: GroupExpense = {
  id: 'exp-2',
  groupId: 'g-1',
  title: 'Food',
  amount: 2000,
  date: '2026-10-02',
  category: 'Food',
  paidBy: [{ memberId: 'rahul', amount: 2000 }],
  splitMethod: 'equal',
  splitBetween: ['alvin', 'rahul', 'anu', 'arjun'],
  splits: SplitSettlementEngine.calculateEqualSplit(2000, ['alvin', 'rahul', 'anu', 'arjun']),
  createdAt: 2000,
  updatedAt: 2000,
};

const exp3: GroupExpense = {
  id: 'exp-3',
  groupId: 'g-1',
  title: 'Fuel',
  amount: 1000,
  date: '2026-10-03',
  category: 'Transport',
  paidBy: [{ memberId: 'anu', amount: 1000 }],
  splitMethod: 'equal',
  splitBetween: ['alvin', 'rahul', 'anu', 'arjun'],
  splits: SplitSettlementEngine.calculateEqualSplit(1000, ['alvin', 'rahul', 'anu', 'arjun']),
  createdAt: 3000,
  updatedAt: 3000,
};

const expenses = [exp1, exp2, exp3];
const balances = SplitSettlementEngine.calculateMemberBalances(members, expenses, []);

const alvinBal = balances.find((b) => b.memberId === 'alvin');
const rahulBal = balances.find((b) => b.memberId === 'rahul');
const anuBal = balances.find((b) => b.memberId === 'anu');
const arjunBal = balances.find((b) => b.memberId === 'arjun');

assert(alvinBal?.netBalance === 2250, `Alvin net balance should be +2250 (got ${alvinBal?.netBalance})`);
assert(rahulBal?.netBalance === 250, `Rahul net balance should be +250 (got ${rahulBal?.netBalance})`);
assert(anuBal?.netBalance === -750, `Anu net balance should be -750 (got ${anuBal?.netBalance})`);
assert(arjunBal?.netBalance === -1750, `Arjun net balance should be -1750 (got ${arjunBal?.netBalance})`);

// Verify invariant: sum positive balances === sum negative balances
const sumPositive = balances.filter((b) => b.netBalance > 0).reduce((a, b) => a + b.netBalance, 0);
const sumNegative = balances.filter((b) => b.netBalance < 0).reduce((a, b) => a + Math.abs(b.netBalance), 0);
assert(sumPositive === 2500, `Sum positive balances === 2500 (got ${sumPositive})`);
assert(sumNegative === 2500, `Sum negative balances === 2500 (got ${sumNegative})`);

// Optimal settlements
const recs = SplitSettlementEngine.calculateOptimalSettlements(balances);
assert(recs.length <= 3, `Optimal settlements minimized to ${recs.length} transactions`);
const recsTotal = recs.reduce((a, r) => a + r.amount, 0);
assert(recsTotal === 2500, `Total recommended settlements equals 2500 (got ${recsTotal})`);

// Test 7: Cross-Obligation Netting
// A owes B 1000, B owes A 700 -> A owes B 300
const crossMembers: GroupMember[] = [
  { id: 'A', name: 'A', isCurrentUser: true },
  { id: 'B', name: 'B', isCurrentUser: false },
];
const crossExp1: GroupExpense = {
  id: 'ce-1',
  groupId: 'g-2',
  title: 'B paid for A',
  amount: 1000,
  date: '2026-10-01',
  category: 'Other',
  paidBy: [{ memberId: 'B', amount: 1000 }],
  splitMethod: 'exact',
  splitBetween: ['A'],
  splits: [{ memberId: 'A', shareAmount: 1000 }],
  createdAt: 100,
  updatedAt: 100,
};
const crossExp2: GroupExpense = {
  id: 'ce-2',
  groupId: 'g-2',
  title: 'A paid for B',
  amount: 700,
  date: '2026-10-02',
  category: 'Other',
  paidBy: [{ memberId: 'A', amount: 700 }],
  splitMethod: 'exact',
  splitBetween: ['B'],
  splits: [{ memberId: 'B', shareAmount: 700 }],
  createdAt: 200,
  updatedAt: 200,
};
const crossBalances = SplitSettlementEngine.calculateMemberBalances(crossMembers, [crossExp1, crossExp2], []);
const aNet = crossBalances.find((b) => b.memberId === 'A')?.netBalance;
const bNet = crossBalances.find((b) => b.memberId === 'B')?.netBalance;
assert(aNet === -300, `A owes B 300 (got ${aNet})`);
assert(bNet === 300, `B receives 300 (got ${bNet})`);

const crossRecs = SplitSettlementEngine.calculateOptimalSettlements(crossBalances);
assert(crossRecs.length === 1, 'Only 1 settlement transaction generated');
assert(crossRecs[0].fromMemberId === 'A' && crossRecs[0].toMemberId === 'B' && crossRecs[0].amount === 300, 'A pays B 300');

// Test 8: Partial Settlement
const settlement: GroupSettlement = {
  id: 'set-1',
  groupId: 'g-1',
  fromMemberId: 'anu',
  toMemberId: 'alvin',
  amount: 500, // Anu owes 750, pays 500
  date: '2026-10-04',
  createdAt: 4000,
};
const balancesAfterPartial = SplitSettlementEngine.calculateMemberBalances(members, expenses, [settlement]);
const anuAfter = balancesAfterPartial.find((b) => b.memberId === 'anu')?.netBalance;
const alvinAfter = balancesAfterPartial.find((b) => b.memberId === 'alvin')?.netBalance;
assert(anuAfter === -250, `Anu remaining balance is -250 (got ${anuAfter})`);
assert(alvinAfter === 1750, `Alvin remaining balance is +1750 (got ${alvinAfter})`);

// Test 9: Complete Invariants Audit
const invCheck = SplitSettlementEngine.verifyInvariants(members, expenses, [settlement]);
assert(invCheck.isValid, `Invariants audit passed (errors: ${invCheck.errors.join(', ')})`);

console.log('🎉 ALL SplitSettlementEngine UNIT TESTS PASSED SUCCESSFULLY!');
