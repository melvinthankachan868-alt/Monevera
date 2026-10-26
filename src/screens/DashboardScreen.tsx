import React, { useState, useMemo } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR, formatDisplayDate, calculateDueDateStatus } from '../utils/calculations';
import { CategoryIcon } from '../components/CategoryIcon';
import { MoneyOwedModal } from '../components/MoneyOwedModal';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  TrendingUp,
  ShieldCheck,
  PiggyBank,
  Target,
  Sparkles,
  AlertTriangle,
  Clock,
  ChevronRight,
  CheckCircle2,
  Calendar,
  CreditCard,
  Plus,
  Receipt,
  Layers,
  ArrowRight,
  Info,
  DollarSign,
  PieChart,
  Camera,
  Users,
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const {
    monthlyIncome,
    monthlySpent,
    monthlyRemaining,
    todaySpent,
    incomeBreakdown,
    categorySummaries,
    emergencyFundDetails,
    moneyOwedSummary,
    globalGroupBalancesSummary,
    cashFlowSummary,
    netWorthSummary,
    upcomingObligations,
    overdueObligations,
    goals,
    incomes,
    expenses,
    savings,
    investments,
    loans,
    setQuickAddOpen,
    setReceiptScanModalOpen,
    setActiveTab,
    user,
    selectedMonth,
  } = useFinTraQ();

  const [moneyOwedModalOpen, setMoneyOwedModalOpen] = useState(false);
  const [cashFlowRange, setCashFlowRange] = useState<'30d' | '3m' | '1y'>('30d');

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userName = user?.displayName ? user.displayName.split(' ')[0] : 'Commander';

  // Budget calculations
  const needsSummary = useMemo(
    () => categorySummaries.find((c) => c.category === 'Needs') || { spent: 0, budget: 0, percentageUsed: 0, remaining: 0 },
    [categorySummaries]
  );
  const wantsSummary = useMemo(
    () => categorySummaries.find((c) => c.category === 'Wants') || { spent: 0, budget: 0, percentageUsed: 0, remaining: 0 },
    [categorySummaries]
  );
  const savingsSummary = useMemo(
    () => categorySummaries.find((c) => c.category === 'Savings') || { spent: 0, budget: 0, percentageUsed: 0, remaining: 0 },
    [categorySummaries]
  );

  // Budget health index
  const budgetHealthScore = useMemo(() => {
    if (monthlyIncome <= 0) return 100;
    const overSpent = Math.max(0, monthlySpent - monthlyIncome);
    if (overSpent > 0) {
      return Math.max(20, Math.round(100 - (overSpent / monthlyIncome) * 100));
    }
    const spentPct = (monthlySpent / monthlyIncome) * 100;
    if (spentPct <= 80) return 96;
    if (spentPct <= 95) return 82;
    return 65;
  }, [monthlyIncome, monthlySpent]);

  // Combined Recent Transactions (Incomes, Expenses, Savings) sorted by date
  const recentTransactions = useMemo(() => {
    const combined: Array<{
      id: string;
      title: string;
      category: string;
      subcategory: string;
      amount: number;
      type: 'income' | 'expense' | 'saving' | 'investment';
      date: string;
      paymentMethod?: string;
    }> = [];

    expenses.slice(0, 10).forEach((exp) => {
      combined.push({
        id: `exp-${exp.id}`,
        title: exp.subcategory || 'Expense',
        category: exp.category,
        subcategory: exp.subcategory,
        amount: exp.amount,
        type: 'expense',
        date: exp.date,
        paymentMethod: exp.paymentMethod,
      });
    });

    incomes.slice(0, 5).forEach((inc) => {
      combined.push({
        id: `inc-${inc.id}`,
        title: inc.source,
        category: 'Inflow',
        subcategory: inc.type,
        amount: inc.amount,
        type: 'income',
        date: inc.date,
      });
    });

    savings.slice(0, 5).forEach((sav) => {
      combined.push({
        id: `sav-${sav.id}`,
        title: sav.accountName,
        category: 'Savings',
        subcategory: sav.type,
        amount: sav.amount,
        type: 'saving',
        date: sav.date,
      });
    });

    return combined
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);
  }, [expenses, incomes, savings]);

  // Dynamic "Needs Your Attention" items based on real data
  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      amount?: number;
      desc: string;
      level: 'danger' | 'warning' | 'info';
      actionTab: string;
    }> = [];

    // 1. Overdue debts or loans
    overdueObligations.forEach((ob) => {
      items.push({
        id: `ob-overdue-${ob.id}`,
        title: `${ob.title} is Overdue`,
        amount: ob.amount,
        desc: `Due ${ob.dueDate}. Please record settlement.`,
        level: 'danger',
        actionTab: ob.sourceType === 'loan' ? 'loans' : 'money_owed',
      });
    });

    // 2. Overdue money to receive
    if (moneyOwedSummary.overdueCount > 0) {
      items.push({
        id: 'mo-overdue',
        title: `${moneyOwedSummary.overdueCount} Receivable(s) Overdue`,
        desc: 'Follow up on informal money lent to friends or family.',
        level: 'warning',
        actionTab: 'money_owed',
      });
    }

    // 3. Obligations due today or within 3 days
    upcomingObligations.slice(0, 3).forEach((ob) => {
      if (ob.diffDays <= 3) {
        items.push({
          id: `ob-soon-${ob.id}`,
          title: `${ob.title} due ${ob.dueLabel}`,
          amount: ob.amount,
          desc: `Scheduled for ${formatDisplayDate(ob.dueDate)}`,
          level: ob.diffDays <= 1 ? 'danger' : 'warning',
          actionTab: ob.sourceType === 'loan' ? 'loans' : 'reminders',
        });
      }
    });

    // 4. Needs or Wants budget exceeded
    if (needsSummary.percentageUsed > 100) {
      items.push({
        id: 'budget-needs-exceeded',
        title: 'Essential Needs Budget Exceeded',
        amount: Math.abs(needsSummary.remaining),
        desc: `Currently at ${needsSummary.percentageUsed}% of planned limit.`,
        level: 'danger',
        actionTab: 'budgets',
      });
    } else if (wantsSummary.percentageUsed > 90) {
      items.push({
        id: 'budget-wants-near',
        title: 'Lifestyle Wants Budget 90%+ Used',
        amount: wantsSummary.remaining,
        desc: `${formatINR(wantsSummary.remaining)} remaining before limit is hit.`,
        level: 'warning',
        actionTab: 'budgets',
      });
    }

    // 5. Emergency fund gap if under 50%
    if (emergencyFundDetails.progressPercentage < 50 && emergencyFundDetails.targetAmount > 0) {
      items.push({
        id: 'ef-gap',
        title: 'Emergency Safety Net Under 50%',
        amount: emergencyFundDetails.remainingAmount,
        desc: `Target is ${emergencyFundDetails.targetMonths} months (${formatINR(emergencyFundDetails.targetAmount)}).`,
        level: 'info',
        actionTab: 'emergency_fund',
      });
    }

    return items.slice(0, 4);
  }, [
    overdueObligations,
    moneyOwedSummary.overdueCount,
    upcomingObligations,
    needsSummary,
    wantsSummary,
    emergencyFundDetails,
  ]);

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* ========================================================
          1. TOP COMMAND BAR & GREETING (Requirement 15)
      ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--mv-text-primary)] tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-0.5">
            Here's your comprehensive financial picture for <span className="text-[var(--mv-text-primary)] font-semibold">{selectedMonth}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setReceiptScanModalOpen(true)}
            className="px-3.5 py-2.5 bg-[var(--mv-surface-hover)] hover:bg-[var(--mv-surface-elevated)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Camera size={15} className="text-[var(--mv-primary)]" />
            <span>Scan Receipt</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'expense')}
            className="px-4 py-2.5 bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          1B. MIKE ASSISTANT PRESENCE (Requirement 21)
      ======================================================== */}
      <div className="vault-panel p-4 sm:p-5 rounded-3xl border border-[var(--mv-border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center font-black shadow-xs shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[var(--mv-text-primary)] tracking-tight">MIKE</span>
              <span className="text-[10px] font-bold text-[var(--mv-primary)] bg-[var(--mv-primary)]/10 px-2 py-0.5 rounded-full border border-[var(--mv-primary)]/20 uppercase tracking-wider">
                Your Money Vault Assistant
              </span>
            </div>
            <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
              "Need help logging an expense, scanning a receipt, or reviewing your budgets?"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setReceiptScanModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[var(--mv-surface-hover)] hover:bg-[var(--mv-surface-elevated)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Camera size={14} className="text-[var(--mv-primary)]" />
            <span>Scan Receipt</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'expense')}
            className="px-3.5 py-2 rounded-xl bg-[var(--mv-surface-hover)] hover:bg-[var(--mv-surface-elevated)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Add Expense</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className="px-3.5 py-2 rounded-xl bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Ask Mike</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. HERO FINANCIAL CARD (Requirement 16)
      ======================================================== */}
      <div className="vault-panel-highlight rounded-3xl p-6 sm:p-7 relative overflow-hidden">
        {/* Ambient Vault Lighting */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--mv-primary)]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[var(--mv-teal)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] text-[11px] font-bold tracking-wider uppercase mb-2">
                <span className="w-2 h-2 rounded-full bg-[var(--mv-primary)] animate-pulse" />
                <span>Your Money • Real Liquidity</span>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--mv-text-primary)] tabular-nums tracking-tight">
                {formatINR(monthlyRemaining)}
              </div>
              <div className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-1 font-medium">
                Net Remaining Cash Available this Month
              </div>
            </div>

            {/* Quick Flow Ratio Pill */}
            <div className="sm:text-right bg-[var(--mv-surface)]/90 p-3.5 rounded-2xl border border-[var(--mv-border)] backdrop-blur-md">
              <div className="text-[11px] font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">
                Monthly Savings Rate
              </div>
              <div className="text-2xl font-black text-[var(--mv-income)] tabular-nums mt-0.5">
                {cashFlowSummary.totalInflow > 0
                  ? Math.round(
                      ((cashFlowSummary.savings + cashFlowSummary.investment) /
                        cashFlowSummary.totalInflow) *
                        100
                    )
                  : 0}
                %
              </div>
              <div className="text-[10px] text-[var(--mv-text-muted)] mt-0.5">Wealth allocation rate</div>
            </div>
          </div>

          {/* Compact Cash Flow Strip (Requirement 16) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-[var(--mv-border)]">
            <div className="vault-card p-3.5 rounded-xl border border-[var(--mv-border)]">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--mv-income)] uppercase tracking-wider">
                <span>Total Inflow</span>
                <ArrowDownLeft size={14} />
              </div>
              <div className="text-lg font-black text-[var(--mv-text-primary)] tabular-nums mt-1">
                {formatINR(monthlyIncome)}
              </div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] mt-0.5 truncate">
                Salary + Allowances + Bonus
              </div>
            </div>

            <div className="vault-card p-3.5 rounded-xl border border-[var(--mv-border)]">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--mv-expense)] uppercase tracking-wider">
                <span>Expenses Spent</span>
                <ArrowUpRight size={14} />
              </div>
              <div className="text-lg font-black text-[var(--mv-text-primary)] tabular-nums mt-1">
                {formatINR(monthlySpent)}
              </div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] mt-0.5 truncate">
                Needs + Lifestyle Wants
              </div>
            </div>

            <div className="vault-card p-3.5 rounded-xl border border-[var(--mv-border)]">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--mv-income)] uppercase tracking-wider">
                <span>Savings Added</span>
                <PiggyBank size={14} />
              </div>
              <div className="text-lg font-black text-[var(--mv-text-primary)] tabular-nums mt-1">
                {formatINR(cashFlowSummary.savings)}
              </div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] mt-0.5 truncate">
                Emergency & liquid funds
              </div>
            </div>

            <div className="vault-card p-3.5 rounded-xl border border-[var(--mv-border)]">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--mv-investment)] uppercase tracking-wider">
                <span>Investments</span>
                <TrendingUp size={14} />
              </div>
              <div className="text-lg font-black text-[var(--mv-text-primary)] tabular-nums mt-1">
                {formatINR(cashFlowSummary.investment)}
              </div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] mt-0.5 truncate">
                Capital growth & SIPs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. FINANCIAL PULSE (Requirement 17)
      ======================================================== */}
      <div className="vault-panel p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A8F34A] animate-ping" />
            <h3 className="text-sm font-bold text-[var(--mv-text-primary)] uppercase tracking-wider">Financial Pulse</h3>
          </div>
          <span className="text-xs text-[var(--mv-text-secondary)] font-semibold">Live System Telemetry</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)]">
            <div className="text-[10px] font-bold text-[var(--mv-text-secondary)] uppercase">Budget Health</div>
            <div className="text-base font-black text-[var(--mv-income)] tabular-nums mt-0.5">
              {budgetHealthScore}% Healthy
            </div>
          </div>

          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)]">
            <div className="text-[10px] font-bold text-[var(--mv-text-secondary)] uppercase">Savings Month</div>
            <div className="text-base font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">
              {formatINR(cashFlowSummary.savings)}
            </div>
          </div>

          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)]">
            <div className="text-[10px] font-bold text-[var(--mv-text-secondary)] uppercase">Safety Net</div>
            <div className="text-base font-black text-[var(--mv-teal)] tabular-nums mt-0.5">
              {emergencyFundDetails.progressPercentage}%
            </div>
          </div>

          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)]">
            <div className="text-[10px] font-bold text-[var(--mv-text-secondary)] uppercase">Upcoming Dues</div>
            <div className="text-base font-black text-[var(--mv-warning)] tabular-nums mt-0.5">
              {upcomingObligations.length} payments
            </div>
          </div>

          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)]">
            <div className="text-[10px] font-bold text-[var(--mv-text-secondary)] uppercase">To Receive</div>
            <div className="text-base font-black text-[var(--mv-income)] tabular-nums mt-0.5">
              {formatINR(moneyOwedSummary.toReceiveTotal)}
            </div>
          </div>

          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)]">
            <div className="text-[10px] font-bold text-[var(--mv-text-secondary)] uppercase">To Repay</div>
            <div className="text-base font-black text-[var(--mv-warning)] tabular-nums mt-0.5">
              {formatINR(moneyOwedSummary.toRepayTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. NEEDS YOUR ATTENTION (Requirement 18)
      ======================================================== */}
      {attentionItems.length > 0 && (
        <div className="vault-panel p-5 rounded-2xl space-y-3 border-[var(--mv-warning)]/30 bg-[var(--mv-warning)]/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--mv-warning)]">
              <AlertTriangle size={18} />
              <h3 className="text-sm font-bold text-[var(--mv-text-primary)] uppercase tracking-wider">
                Needs Your Attention ({attentionItems.length})
              </h3>
            </div>
            <span className="text-xs text-[var(--mv-text-secondary)]">Action items requiring review</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attentionItems.map((item) => {
              const isDanger = item.level === 'danger';
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveTab(item.actionTab as any)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isDanger
                      ? 'bg-[var(--mv-danger)]/10 border-[var(--mv-danger)]/30 hover:border-[var(--mv-danger)]/60'
                      : 'bg-[var(--mv-warning)]/10 border-[var(--mv-warning)]/30 hover:border-[var(--mv-warning)]/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isDanger ? 'bg-[var(--mv-danger)] animate-pulse' : 'bg-[var(--mv-warning)]'
                        }`}
                      />
                      <h4 className="text-xs font-bold text-[var(--mv-text-primary)] truncate">{item.title}</h4>
                    </div>
                    <p className="text-[11px] text-[var(--mv-text-secondary)] mt-0.5 truncate">{item.desc}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.amount !== undefined && (
                      <span className="text-xs font-black text-[var(--mv-text-primary)] tabular-nums">
                        {formatINR(item.amount)}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-[var(--mv-text-secondary)] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          5. QUICK ACTIONS (Requirement 19)
      ======================================================== */}
      <div className="vault-panel p-4 sm:p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-xs text-[var(--mv-text-secondary)] font-bold uppercase tracking-wider">
          <span>Quick Actions</span>
          <span>Instant Entries</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
          <button
            type="button"
            onClick={() => setReceiptScanModalOpen(true)}
            className="p-3 rounded-xl bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-primary)]/40 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera size={16} />
            </div>
            <span className="text-[11px] font-bold text-center">📷 Receipt</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'expense')}
            className="p-3 rounded-xl bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[#FF7373]/30 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FF7373]/15 text-[#FF7373] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt size={16} />
            </div>
            <span className="text-[11px] font-bold">+ Expense</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'income')}
            className="p-3 rounded-xl bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[#78D64B]/30 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#78D64B]/15 text-[#78D64B] flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowDownLeft size={16} />
            </div>
            <span className="text-[11px] font-bold">+ Income</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'savings')}
            className="p-3 rounded-xl bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[#78D64B]/30 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#78D64B]/15 text-[#78D64B] flex items-center justify-center group-hover:scale-110 transition-transform">
              <PiggyBank size={16} />
            </div>
            <span className="text-[11px] font-bold">+ Saving</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'investment')}
            className="p-3 rounded-xl bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[#64D8FF]/30 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#64D8FF]/15 text-[#64D8FF] flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp size={16} />
            </div>
            <span className="text-[11px] font-bold">+ Asset</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'loan')}
            className="p-3 rounded-xl bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[#FF7373]/30 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FF7373]/15 text-[#FF7373] flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard size={16} />
            </div>
            <span className="text-[11px] font-bold">+ Loan</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'moneyOwed')}
            className="p-3 rounded-xl bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[#FFB84D]/30 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FFB84D]/15 text-[#FFB84D] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet size={16} />
            </div>
            <span className="text-[11px] font-bold">+ Owed</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'goal')}
            className="p-3 rounded-xl bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[#C084FC]/30 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#C084FC]/15 text-[#C084FC] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Target size={16} />
            </div>
            <span className="text-[11px] font-bold">+ Goal</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'bill')}
            className="p-3 rounded-xl bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[#55E0C1]/30 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#55E0C1]/15 text-[#55E0C1] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar size={16} />
            </div>
            <span className="text-[11px] font-bold">+ Bill</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          6. BUDGET CONTROL (Requirement 20)
      ======================================================== */}
      <div className="vault-panel p-5 sm:p-6 rounded-3xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-[var(--mv-text-primary)]">50/30/20 Budget Control</h3>
              <span className="text-[10px] font-bold text-[var(--mv-primary)] bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 px-2 py-0.5 rounded-full">
                Mathematical Rule
              </span>
            </div>
            <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
              Live consumption tracking against your dynamic income allocation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('budgets')}
            className="text-xs font-bold text-[#A8F34A] hover:text-[#B8FF62] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Manage Budget Caps</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Needs 50% */}
          <div className="vault-card p-4.5 rounded-2xl space-y-3 border border-[var(--mv-border)]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#64D8FF] uppercase tracking-wider">
                  Needs (50% Guideline)
                </span>
                <div className="text-xl font-black text-[var(--mv-text-primary)] tabular-nums mt-1">
                  {formatINR(needsSummary.spent)}
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--mv-text-secondary)]">
                of {formatINR(needsSummary.budget)}
              </span>
            </div>

            <div className="w-full bg-[var(--mv-bg-secondary)] h-2.5 rounded-full overflow-hidden border border-[var(--mv-border)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  needsSummary.percentageUsed > 100
                    ? 'bg-[#FF7373]'
                    : needsSummary.percentageUsed > 80
                    ? 'bg-[#FFB84D]'
                    : 'bg-[#64D8FF]'
                }`}
                style={{ width: `${Math.min(100, needsSummary.percentageUsed)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-[var(--mv-text-secondary)] font-semibold">
              <span className={needsSummary.remaining < 0 ? 'text-[#FF7373] font-bold' : ''}>
                {needsSummary.remaining >= 0
                  ? `${formatINR(needsSummary.remaining)} remaining`
                  : `${formatINR(Math.abs(needsSummary.remaining))} over budget`}
              </span>
              <span className="text-[#64D8FF] font-bold">{needsSummary.percentageUsed}%</span>
            </div>
          </div>

          {/* Wants 30% */}
          <div className="vault-card p-4.5 rounded-2xl space-y-3 border border-[var(--mv-border)]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#FFB84D] uppercase tracking-wider">
                  Wants (30% Guideline)
                </span>
                <div className="text-xl font-black text-[var(--mv-text-primary)] tabular-nums mt-1">
                  {formatINR(wantsSummary.spent)}
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--mv-text-secondary)]">
                of {formatINR(wantsSummary.budget)}
              </span>
            </div>

            <div className="w-full bg-[var(--mv-bg-secondary)] h-2.5 rounded-full overflow-hidden border border-[var(--mv-border)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  wantsSummary.percentageUsed > 100
                    ? 'bg-[#FF7373]'
                    : wantsSummary.percentageUsed > 80
                    ? 'bg-[#FFB84D]'
                    : 'bg-[#FFB84D]'
                }`}
                style={{ width: `${Math.min(100, wantsSummary.percentageUsed)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-[var(--mv-text-secondary)] font-semibold">
              <span className={wantsSummary.remaining < 0 ? 'text-[#FF7373] font-bold' : ''}>
                {wantsSummary.remaining >= 0
                  ? `${formatINR(wantsSummary.remaining)} remaining`
                  : `${formatINR(Math.abs(wantsSummary.remaining))} over budget`}
              </span>
              <span className="text-[#FFB84D] font-bold">{wantsSummary.percentageUsed}%</span>
            </div>
          </div>

          {/* Savings 20% */}
          <div className="vault-card p-4.5 rounded-2xl space-y-3 border border-[var(--mv-border)]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#78D64B] uppercase tracking-wider">
                  Savings & Wealth (20%)
                </span>
                <div className="text-xl font-black text-[var(--mv-text-primary)] tabular-nums mt-1">
                  {formatINR(savingsSummary.spent)}
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--mv-text-secondary)]">
                target {formatINR(savingsSummary.budget)}
              </span>
            </div>

            <div className="w-full bg-[var(--mv-bg-secondary)] h-2.5 rounded-full overflow-hidden border border-[var(--mv-border)]">
              <div
                className="h-full bg-[#78D64B] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, savingsSummary.percentageUsed)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-[var(--mv-text-secondary)] font-semibold">
              <span>
                {savingsSummary.spent >= savingsSummary.budget
                  ? 'Target achieved 🎉'
                  : `${formatINR(savingsSummary.budget - savingsSummary.spent)} to target`}
              </span>
              <span className="text-[#78D64B] font-bold">{savingsSummary.percentageUsed}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          7. THREE-COLUMN SPLIT: SAFETY NET, MONEY OWED & GROUP BALANCES
      ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Emergency Safety Net Card (Requirement 22) */}
        <div
          onClick={() => setActiveTab('emergency_fund')}
          className="vault-panel p-5 rounded-2xl space-y-4 cursor-pointer hover:border-[#55E0C1]/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#55E0C1]" />
              <h3 className="text-sm font-bold text-[var(--mv-text-primary)] uppercase tracking-wider">
                Emergency Safety Net
              </h3>
            </div>
            <span className="text-xs text-[#55E0C1] group-hover:translate-x-0.5 transition-transform font-bold">
              View Buffer →
            </span>
          </div>

          <div className="flex justify-between items-baseline">
            <div className="text-2xl font-black text-[var(--mv-text-primary)] tabular-nums">
              {formatINR(emergencyFundDetails.currentAmount)}
            </div>
            <div className="text-xs text-[var(--mv-text-secondary)] font-semibold">
              target {formatINR(emergencyFundDetails.targetAmount)}
            </div>
          </div>

          <div className="w-full bg-[var(--mv-bg-secondary)] h-3 rounded-full overflow-hidden border border-[var(--mv-border)]">
            <div
              className="h-full bg-gradient-to-r from-[#55E0C1] to-[#78D64B] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, emergencyFundDetails.progressPercentage)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--mv-border)] text-center text-xs">
            <div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] uppercase">Coverage</div>
              <div className="font-bold text-[var(--mv-text-primary)] mt-0.5">
                {emergencyFundDetails.monthsCovered.toFixed(1)} / {emergencyFundDetails.targetMonths} mo
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] uppercase">Progress</div>
              <div className="font-bold text-[#55E0C1] mt-0.5">
                {emergencyFundDetails.progressPercentage}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] uppercase">Remaining</div>
              <div className="font-bold text-[var(--mv-text-secondary)] mt-0.5 tabular-nums">
                {formatINR(emergencyFundDetails.remainingAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* Money Owed Dashboard Card (Requirement 23) */}
        <div
          onClick={() => setActiveTab('money_owed')}
          className="vault-panel p-5 rounded-2xl space-y-4 cursor-pointer hover:border-[#FFB84D]/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownLeft size={18} className="text-[#FFB84D]" />
              <h3 className="text-sm font-bold text-[var(--mv-text-primary)] uppercase tracking-wider">
                Loans & Money Owed
              </h3>
            </div>
            <span className="text-xs text-[#FFB84D] group-hover:translate-x-0.5 transition-transform font-bold">
              Ledger →
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="vault-card p-3 rounded-xl border border-[#78D64B]/20 bg-[var(--mv-surface)]">
              <div className="text-[10px] font-bold text-[#78D64B] uppercase">To Receive (Lent)</div>
              <div className="text-lg font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">
                {formatINR(moneyOwedSummary.toReceiveTotal)}
              </div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] mt-0.5">
                {moneyOwedSummary.lentRecords.filter((r) => r.status !== 'Settled').length} pending
              </div>
            </div>

            <div className="vault-card p-3 rounded-xl border border-[#FFB84D]/20 bg-[var(--mv-surface)]">
              <div className="text-[10px] font-bold text-[#FFB84D] uppercase">To Repay (Borrowed)</div>
              <div className="text-lg font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">
                {formatINR(moneyOwedSummary.toRepayTotal)}
              </div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] mt-0.5">
                {moneyOwedSummary.borrowedRecords.filter((r) => r.status !== 'Settled').length} pending
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--mv-border)] flex items-center justify-between text-xs">
            <div>
              <span className="text-[var(--mv-text-secondary)]">Net Outstanding: </span>
              <span className="font-extrabold text-[var(--mv-text-primary)] tabular-nums">
                {formatINR(moneyOwedSummary.netOutstanding)}
              </span>
            </div>
            <span className="text-[10.5px] text-[#FFB84D] italic">
              *Not included as available cash
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          8. UPCOMING OBLIGATIONS TIMELINE (Requirement 24)
      ======================================================== */}
      <div className="vault-panel p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#A8F34A]" />
            <h3 className="text-sm font-bold text-[var(--mv-text-primary)] uppercase tracking-wider">
              Upcoming Obligations Timeline
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className="text-xs text-[#A8F34A] hover:text-[#B8FF62] font-bold cursor-pointer"
          >
            View Calendar →
          </button>
        </div>

        {upcomingObligations.length === 0 ? (
          <p className="text-xs text-[var(--mv-text-secondary)] py-4 text-center">
            No upcoming EMI, bill, or loan obligations due in the next 30 days.
          </p>
        ) : (
          <div className="space-y-2.5">
            {upcomingObligations.slice(0, 4).map((ob) => {
              const isOverdue = ob.isOverdue;
              const isDueToday = ob.statusBadge === 'Due today';

              return (
                <div
                  key={ob.id}
                  className="vault-card p-3 rounded-xl flex items-center justify-between gap-3 border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black ${
                        isOverdue
                          ? 'bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373]'
                          : isDueToday
                          ? 'bg-[#282210] border border-[#FFB84D]/30 text-[#FFB84D]'
                          : 'bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[#64D8FF]'
                      }`}
                    >
                      <Calendar size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-[var(--mv-text-primary)] truncate">{ob.title}</span>
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                            isOverdue
                              ? 'bg-[#2D1616] text-[#FF7373] border border-[#FF7373]/30'
                              : isDueToday
                              ? 'bg-[#282210] text-[#FFB84D] border border-[#FFB84D]/30'
                              : 'bg-[var(--mv-surface-hover)] text-[#64D8FF] border border-[var(--mv-border)]'
                          }`}
                        >
                          {ob.dueLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--mv-text-secondary)] mt-0.5">
                        {ob.categoryOrType} • Due {formatDisplayDate(ob.dueDate)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 font-extrabold text-sm text-[var(--mv-text-primary)] tabular-nums">
                    {formatINR(ob.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          9. RECENT TRANSACTIONS (Requirement 27)
      ======================================================== */}
      <div className="vault-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-[#78D64B]" />
            <h3 className="text-sm font-bold text-[var(--mv-text-primary)] uppercase tracking-wider">
              Recent Financial Activity
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className="text-xs text-[#A8F34A] hover:text-[#B8FF62] font-bold cursor-pointer"
          >
            Full Ledger →
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--mv-text-secondary)]">
            No transactions logged this month yet. Use Quick Actions above to record your first entry.
          </div>
        ) : (
          <div className="divide-y divide-[#252B27]">
            {recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isSaving = tx.type === 'saving';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 flex items-center justify-between hover:bg-[var(--mv-surface-hover)]/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <CategoryIcon category={tx.category as any} name={tx.subcategory} size={18} />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[var(--mv-text-primary)] truncate">{tx.title}</div>
                      <div className="text-[11px] text-[var(--mv-text-secondary)] mt-0.5 flex items-center gap-2">
                        <span>{formatDisplayDate(tx.date)}</span>
                        <span>•</span>
                        <span>{tx.subcategory}</span>
                        {tx.paymentMethod && <span>({tx.paymentMethod})</span>}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`font-extrabold text-sm tabular-nums flex-shrink-0 ${
                      isIncome
                        ? 'text-[#78D64B]'
                        : isSaving
                        ? 'text-[#78D64B]'
                        : 'text-[#FF7373]'
                    }`}
                  >
                    {isIncome ? '+' : isSaving ? '↗' : '−'}
                    {formatINR(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          10. MONEY VAULT AI ASSISTANT TEASER (Requirement 28)
      ======================================================== */}
      <div className="vault-panel p-5 rounded-3xl border border-[var(--mv-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center flex-shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">Money Vault AI</h3>
              <span className="text-[10px] font-bold text-[var(--mv-primary)] bg-[var(--mv-primary)]/15 px-2 py-0.5 rounded-full border border-[var(--mv-primary)]/30">
                Intelligent Guide
              </span>
            </div>
            <p className="text-xs text-[var(--mv-text-secondary)] mt-1">
              "Your net savings rate this month is{' '}
              <strong className="text-[var(--mv-income)]">
                {cashFlowSummary.totalInflow > 0
                  ? Math.round(
                      ((cashFlowSummary.savings + cashFlowSummary.investment) /
                        cashFlowSummary.totalInflow) *
                        100
                    )
                  : 0}
                %
              </strong>
              . Would you like a roadmap to optimize your upcoming debt EMIs?"
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className="px-4 py-2.5 bg-[#A8F34A] hover:bg-[#B8FF62] text-[#0B0D0C] font-black rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(168,243,74,0.18)] whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          Ask Money Vault AI
        </button>
      </div>

      {/* Money Owed Modal */}
      {moneyOwedModalOpen && (
        <MoneyOwedModal
          isOpen={moneyOwedModalOpen}
          onClose={() => setMoneyOwedModalOpen(false)}
        />
      )}
    </div>
  );
};
