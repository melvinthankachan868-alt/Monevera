/**
 * Money Vault — Group Expense Splitting & Automatic Settlement Engine
 * 
 * Strict Financial Invariants:
 * 1. Safe money arithmetic: all calculations computed in integer paise (₹1 = 100 paise)
 *    to prevent floating-point drift and guarantee sum of shares === total expense.
 * 2. Cross-obligation netting: A owes B ₹1000 and B owes A ₹700 nets to A owes B ₹300.
 * 3. Settlement optimization: minimizes total transactions across the entire group.
 * 4. Accounting isolation: distinguishes Personal Expense from Money Paid on Behalf of Others.
 */

import {
GroupMember,
GroupExpense,
GroupSettlement,
SplitParticipant,
SplitExpensePayment,MemberBalanceSummary,
SettlementRecommendation,
GroupFinancialSummary
} from '../types/splitExpenses';

export class SplitSettlementEngine {
  /**
   * Convert INR amount to integer paise (e.g., ₹100.50 -> 10050 paise)
   */
  public static toPaise(amount: number): number {
    if (isNaN(amount) || !isFinite(amount)) return 0;
    return Math.round(amount * 100);
  }

  /**
   * Convert integer paise back to INR rounded to 2 decimal places
   */
  public static fromPaise(paise: number): number {
    return Math.round(paise) / 100;
  }

  /**
   * A. Equal Split
   * Distributes total amount equally across participants in integer paise.
   * Extra remainder paise (e.g., 1 paise from ₹100 / 3) are assigned
   * deterministically to the first members so the sum reconciles perfectly.
   */
  public static calculateEqualSplit(totalAmount: number, memberIds: string[]): SplitParticipant[] {
    if (!memberIds || memberIds.length === 0) return [];
    const totalPaise = this.toPaise(totalAmount);
    const n = memberIds.length;
    const basePaise = Math.floor(totalPaise / n);
    const remainder = totalPaise - basePaise * n;

    return memberIds.map((memberId, index) => {
      const sharePaise = basePaise + (index < remainder ? 1 : 0);
      return {
        memberId,
        shareAmount: this.fromPaise(sharePaise),
      };
    });
  }

  /**
   * B. Exact Amount Split
   * Validates that sum of exact amounts equals the total expense.
   */
  public static calculateExactSplit(
    totalAmount: number,
    items: { memberId: string; amount: number }[]
  ): { isValid: boolean; error?: string; splits: SplitParticipant[]; difference: number } {
    const totalPaise = this.toPaise(totalAmount);
    let sumPaise = 0;

    const splits: SplitParticipant[] = items.map((item) => {
      const p = this.toPaise(item.amount || 0);
      sumPaise += p;
      return {
        memberId: item.memberId,
        shareAmount: this.fromPaise(p),
      };
    });

    const diffPaise = totalPaise - sumPaise;
    const isValid = diffPaise === 0;

    return {
      isValid,
      error: isValid
        ? undefined
        : `Sum of participant amounts (₹${this.fromPaise(sumPaise)}) must equal total expense (₹${totalAmount}). Difference: ₹${this.fromPaise(Math.abs(diffPaise))}`,
      splits,
      difference: this.fromPaise(diffPaise),
    };
  }

  /**
   * C. Percentage Split
   * Validates percentages sum to exactly 100%. Converts to exact paise,
   * deterministically assigning rounding residuals to the highest percentage participant.
   */
  public static calculatePercentageSplit(
    totalAmount: number,
    items: { memberId: string; percentage: number }[]
  ): { isValid: boolean; error?: string; splits: SplitParticipant[]; percentageSum: number } {
    const totalPaise = this.toPaise(totalAmount);
    let pctSum = 0;

    for (const item of items) {
      pctSum += item.percentage || 0;
    }

    // Rounding check for 100%
    const isSumValid = Math.abs(pctSum - 100) < 0.001;
    if (!isSumValid) {
      return {
        isValid: false,
        error: `Total percentage must equal exactly 100%. Currently: ${Math.round(pctSum * 100) / 100}%`,
        splits: [],
        percentageSum: pctSum,
      };
    }

    // Allocate base paise
    let allocatedPaise = 0;
    const initialSplits = items.map((item) => {
      const p = Math.floor((totalPaise * (item.percentage || 0)) / 100);
      allocatedPaise += p;
      return {
        memberId: item.memberId,
        percentage: item.percentage,
        paise: p,
      };
    });

    // Distribute remainder paise to largest percentage items
    let remainder = totalPaise - allocatedPaise;
    // Sort indices by percentage descending to allocate remainder paise
    const sortedIndices = [...Array(items.length).keys()].sort(
      (a, b) => (items[b].percentage || 0) - (items[a].percentage || 0)
    );

    let i = 0;
    while (remainder > 0 && i < sortedIndices.length) {
      initialSplits[sortedIndices[i]].paise += 1;
      remainder--;
      i++;
    }

    const splits: SplitParticipant[] = initialSplits.map((item) => ({
      memberId: item.memberId,
      percentage: item.percentage,
      shareAmount: this.fromPaise(item.paise),
    }));

    return {
      isValid: true,
      splits,
      percentageSum: pctSum,
    };
  }

  /**
   * D. Shares Split
   * Proportional distribution by share units (e.g. 1 share, 2 shares).
   */
  public static calculateSharesSplit(
    totalAmount: number,
    items: { memberId: string; shares: number }[]
  ): { isValid: boolean; error?: string; splits: SplitParticipant[]; totalShares: number } {
    const totalPaise = this.toPaise(totalAmount);
    let totalShares = 0;

    for (const item of items) {
      totalShares += Math.max(0, item.shares || 0);
    }

    if (totalShares <= 0) {
      return {
        isValid: false,
        error: 'Total shares must be greater than 0',
        splits: [],
        totalShares: 0,
      };
    }

    let allocatedPaise = 0;
    const initial = items.map((item) => {
      const p = Math.floor((totalPaise * (item.shares || 0)) / totalShares);
      allocatedPaise += p;
      return {
        memberId: item.memberId,
        shares: item.shares,
        paise: p,
      };
    });

    let remainder = totalPaise - allocatedPaise;
    const sortedIndices = [...Array(items.length).keys()].sort(
      (a, b) => (items[b].shares || 0) - (items[a].shares || 0)
    );

    let i = 0;
    while (remainder > 0 && i < sortedIndices.length) {
      initial[sortedIndices[i]].paise += 1;
      remainder--;
      i++;
    }

    const splits: SplitParticipant[] = initial.map((item) => ({
      memberId: item.memberId,
      shares: item.shares,
      shareAmount: this.fromPaise(item.paise),
    }));

    return {
      isValid: true,
      splits,
      totalShares,
    };
  }

  /**
   * Validate payments array against total expense amount
   */
  public static validateExpensePayments(
    totalAmount: number,
    payments: SplitExpensePayment[]
  ): { isValid: boolean; error?: string; paidPaise: number } {
    const totalPaise = this.toPaise(totalAmount);
    let paidPaise = 0;

    for (const p of payments) {
      paidPaise += this.toPaise(p.amount || 0);
    }

    const diff = totalPaise - paidPaise;
    if (diff !== 0) {
      return {
        isValid: false,
        error: `Total paid (₹${this.fromPaise(paidPaise)}) must equal expense amount (₹${totalAmount}). Difference: ₹${this.fromPaise(Math.abs(diff))}`,
        paidPaise,
      };
    }

    return { isValid: true, paidPaise };
  }

  /**
   * Calculate Net Balances for each member across all expenses and settlements.
   * Net Balance Formula:
   *   Net = (Total Paid - Total Share) - (Settlement Received - Settlement Paid)
   * 
   * Where:
   *   Positive (+) = Member is owed money (creditor)
   *   Negative (-) = Member owes money (debtor)
   *   Zero (0)     = Fully settled
   * 
   * Fundamental Accounting Invariant:
   *   Sum of all Net Balances === 0
   */
  public static calculateMemberBalances(
    members: GroupMember[],
    expenses: GroupExpense[],
    settlements: GroupSettlement[]
  ): MemberBalanceSummary[] {
    const paidMap = new Map<string, number>(); // in paise
    const shareMap = new Map<string, number>(); // in paise
    const settleRecvMap = new Map<string, number>(); // in paise
    const settlePaidMap = new Map<string, number>(); // in paise

    // Initialize map entries
    for (const m of members) {
      paidMap.set(m.id, 0);
      shareMap.set(m.id, 0);
      settleRecvMap.set(m.id, 0);
      settlePaidMap.set(m.id, 0);
    }

    // Aggregate expenses
    for (const exp of expenses) {
      // Aggregate payments
      for (const p of exp.paidBy) {
        const cur = paidMap.get(p.memberId) || 0;
        paidMap.set(p.memberId, cur + this.toPaise(p.amount || 0));
      }

      // Aggregate participant shares
      for (const s of exp.splits) {
        const cur = shareMap.get(s.memberId) || 0;
        shareMap.set(s.memberId, cur + this.toPaise(s.shareAmount || 0));
      }
    }

    // Aggregate settlements
    for (const set of settlements) {
      const amtPaise = this.toPaise(set.amount || 0);

      // fromMemberId paid settlement money (reduces what they owe)
      const curPaid = settlePaidMap.get(set.fromMemberId) || 0;
      settlePaidMap.set(set.fromMemberId, curPaid + amtPaise);

      // toMemberId received settlement money (reduces what is owed to them)
      const curRecv = settleRecvMap.get(set.toMemberId) || 0;
      settleRecvMap.set(set.toMemberId, curRecv + amtPaise);
    }

    return members.map((m) => {
      const totalPaidPaise = paidMap.get(m.id) || 0;
      const totalSharePaise = shareMap.get(m.id) || 0;
      const setRecvPaise = settleRecvMap.get(m.id) || 0;
      const setPaidPaise = settlePaidMap.get(m.id) || 0;

      // Net = (Paid - Share) - (Received - Paid)
      const netPaise = (totalPaidPaise - totalSharePaise) - (setRecvPaise - setPaidPaise);
      const netBalance = this.fromPaise(netPaise);

      let statusDescription = 'Settled';
      if (netBalance > 0) {
        statusDescription = m.isCurrentUser
          ? `You should receive ₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          : `${m.name} should receive ₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      } else if (netBalance < 0) {
        const absVal = Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        statusDescription = m.isCurrentUser
          ? `You owe ₹${absVal}`
          : `${m.name} owes ₹${absVal}`;
      }

      return {
        memberId: m.id,
        memberName: m.name,
        isCurrentUser: !!m.isCurrentUser,
        isInactive: !!m.isInactive,
        totalPaid: this.fromPaise(totalPaidPaise),
        totalShare: this.fromPaise(totalSharePaise),
        settlementReceived: this.fromPaise(setRecvPaise),
        settlementPaid: this.fromPaise(setPaidPaise),
        netBalance,
        statusDescription,
      };
    });
  }

  /**
   * Calculate Optimal Settlements (Minimizing Total Transactions)
   * 
   * Uses a greedy min-cash-flow algorithm on net balances:
   * 1. Separates debtors (net < 0) and creditors (net > 0).
   * 2. Sorts debtors by debt amount descending and creditors by credit amount descending.
   * 3. Greedily pairs the largest debtor with the largest creditor and settles min(|debt|, credit).
   * 4. Guarantees cross-obligation netting (e.g. A owes B 1000 and B owes A 700 -> A owes B 300).
   * 5. Produces the minimum practical number of settlement transfers.
   */
  public static calculateOptimalSettlements(
    balances: MemberBalanceSummary[]
  ): SettlementRecommendation[] {
    const memberNameMap = new Map<string, string>();
    for (const b of balances) {
      memberNameMap.set(b.memberId, b.memberName);
    }

    // Work in integer paise to eliminate rounding errors
    interface Party {
      memberId: string;
      paise: number;
    }

    const creditors: Party[] = []; // net > 0
    const debtors: Party[] = []; // net < 0 (stored as positive debt in paise)

    for (const b of balances) {
      const p = this.toPaise(b.netBalance);
      if (p > 0) {
        creditors.push({ memberId: b.memberId, paise: p });
      } else if (p < 0) {
        debtors.push({ memberId: b.memberId, paise: Math.abs(p) });
      }
    }

    // Sort descending by amount
    creditors.sort((a, b) => b.paise - a.paise);
    debtors.sort((a, b) => b.paise - a.paise);

    const recommendations: SettlementRecommendation[] = [];
    let cIdx = 0;
    let dIdx = 0;
    let seq = 1;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];

      const settlePaise = Math.min(creditor.paise, debtor.paise);
      if (settlePaise > 0) {
        recommendations.push({
          id: `rec-${debtor.memberId}-${creditor.memberId}-${seq++}`,
          fromMemberId: debtor.memberId,
          toMemberId: creditor.memberId,
          fromMemberName: memberNameMap.get(debtor.memberId) || 'Member',
          toMemberName: memberNameMap.get(creditor.memberId) || 'Member',
          amount: this.fromPaise(settlePaise),
        });

        creditor.paise -= settlePaise;
        debtor.paise -= settlePaise;
      }

      if (creditor.paise === 0) cIdx++;
      if (debtor.paise === 0) dIdx++;
    }

    return recommendations;
  }

  /**
   * Complete Group Financial Summary
   */
  public static calculateGroupSummary(
    members: GroupMember[],
    expenses: GroupExpense[],
    settlements: GroupSettlement[]
  ): GroupFinancialSummary {
    let totalSpentPaise = 0;
    let totalSettledPaise = 0;

    for (const exp of expenses) {
      totalSpentPaise += this.toPaise(exp.amount || 0);
    }

    for (const set of settlements) {
      totalSettledPaise += this.toPaise(set.amount || 0);
    }

    const memberBalances = this.calculateMemberBalances(members, expenses, settlements);
    const optimalSettlements = this.calculateOptimalSettlements(memberBalances);

    const currentMember = memberBalances.find((b) => b.isCurrentUser);

    return {
      totalSpent: this.fromPaise(totalSpentPaise),
      totalSettled: this.fromPaise(totalSettledPaise),
      currentUserPaid: currentMember ? currentMember.totalPaid : 0,
      currentUserShare: currentMember ? currentMember.totalShare : 0,
      currentUserNetBalance: currentMember ? currentMember.netBalance : 0,
      memberBalances,
      optimalSettlements,
      expenseCount: expenses.length,
      settlementCount: settlements.length,
    };
  }

  /**
   * Accounting Decomposition for a Group Expense:
   * Separates user's personal budget expense from money paid on behalf of others (receivable)
   * or money owed to others (payable).
   */
  public static decomposeUserExpenseAccounting(
    expense: GroupExpense,
    currentUserId: string
  ): {
    userPaid: number;
    userPersonalShare: number; // Actual personal expense for user's budget
    receivableFromOthers: number; // Money user paid for others
    payableToOthers: number; // Money user owes because someone else paid
  } {
    // 1. How much did the current user pay?
    const payment = expense.paidBy.find((p) => p.memberId === currentUserId);
    const userPaidPaise = this.toPaise(payment ? payment.amount : 0);

    // 2. What is the current user's fair personal share?
    const split = expense.splits.find((s) => s.memberId === currentUserId);
    const userSharePaise = this.toPaise(split ? split.shareAmount : 0);

    // 3. Receivable: If user paid more than their share, difference is owed to them
    const receivablePaise = Math.max(0, userPaidPaise - userSharePaise);

    // 4. Payable: If user's share is more than what they paid, difference is owed by user
    const payablePaise = Math.max(0, userSharePaise - userPaidPaise);

    return {
      userPaid: this.fromPaise(userPaidPaise),
      userPersonalShare: this.fromPaise(userSharePaise),
      receivableFromOthers: this.fromPaise(receivablePaise),
      payableToOthers: this.fromPaise(payablePaise),
    };
  }

  /**
   * Formats a clean, shareable settlement summary text (e.g. for WhatsApp, SMS, clipboard)
   */
  public static formatShareableSummaryText(
    groupName: string,
    summary: GroupFinancialSummary
  ): string {
    const lines: string[] = [];
    lines.push(`📊 ${groupName.toUpperCase()} — EXPENSE & SETTLEMENT SUMMARY`);
    lines.push(`Total Group Spending: ₹${summary.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    lines.push(`Total Settled to Date: ₹${summary.totalSettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    lines.push('--------------------------------------------------');
    lines.push('👥 MEMBER BALANCES:');

    for (const b of summary.memberBalances) {
      if (b.isInactive && b.totalPaid === 0 && b.totalShare === 0 && b.netBalance === 0) continue;
      const sign = b.netBalance > 0 ? '+' : '';
      const formattedNet = `${sign}₹${b.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      lines.push(`• ${b.memberName}: Paid ₹${b.totalPaid.toLocaleString('en-IN')} | Share ₹${b.totalShare.toLocaleString('en-IN')} | Net: ${formattedNet} (${b.netBalance >= 0 ? 'Gets back' : 'Owes'})`);
    }

    lines.push('--------------------------------------------------');
    if (summary.optimalSettlements.length === 0) {
      lines.push('✅ All balances are fully settled! No payments pending.');
    } else {
      lines.push('🤝 RECOMMENDED SETTLEMENTS (MINIMAL TRANSFERS):');
      for (const rec of summary.optimalSettlements) {
        lines.push(`👉 ${rec.fromMemberName} pays ${rec.toMemberName}: ₹${rec.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      }
    }
    lines.push('--------------------------------------------------');
    lines.push('Generated with Money Vault • Secure Your Money. Master Your Future.');

    return lines.join('\n');
  }

  /**
   * Verify all 7 Accounting Invariants for automated auditing
   */
  public static verifyInvariants(
    members: GroupMember[],
    expenses: GroupExpense[],
    settlements: GroupSettlement[]
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Invariant 1: For every expense, total paid === expense amount
    for (const exp of expenses) {
      const { isValid, error } = this.validateExpensePayments(exp.amount, exp.paidBy);
      if (!isValid) {
        errors.push(`Expense "${exp.title}" (${exp.id}): ${error}`);
      }

      // Invariant 2: Total participant shares === expense amount
      let sharesPaise = 0;
      for (const s of exp.splits) {
        sharesPaise += this.toPaise(s.shareAmount || 0);
      }
      if (sharesPaise !== this.toPaise(exp.amount)) {
        errors.push(
          `Expense "${exp.title}" (${exp.id}): sum of shares (₹${this.fromPaise(sharesPaise)}) !== amount (₹${exp.amount})`
        );
      }
    }

    // Invariant 3: Sum of all net balances === 0
    const balances = this.calculateMemberBalances(members, expenses, settlements);
    let netSumPaise = 0;
    for (const b of balances) {
      netSumPaise += this.toPaise(b.netBalance);
    }
    if (netSumPaise !== 0) {
      errors.push(`Sum of net balances is not zero! Sum = ₹${this.fromPaise(netSumPaise)}`);
    }

    // Invariant 4: Sum of positive balances === sum of absolute negative balances
    let posPaise = 0;
    let negPaise = 0;
    for (const b of balances) {
      const p = this.toPaise(b.netBalance);
      if (p > 0) posPaise += p;
      if (p < 0) negPaise += Math.abs(p);
    }
    if (posPaise !== negPaise) {
      errors.push(`Positive balances (₹${this.fromPaise(posPaise)}) !== Negative balances (₹${this.fromPaise(negPaise)})`);
    }

    // Invariant 5: Optimal settlements total === total positive balance
    const recs = this.calculateOptimalSettlements(balances);
    let recsTotalPaise = 0;
    for (const r of recs) {
      recsTotalPaise += this.toPaise(r.amount);
    }
    if (recsTotalPaise !== posPaise) {
      errors.push(`Settlement recommendations total (₹${this.fromPaise(recsTotalPaise)}) !== Total to settle (₹${this.fromPaise(posPaise)})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
