import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR } from '../utils/calculations';
import { DonutChart } from '../components/DonutChart';
import { WeeklyChart } from '../components/WeeklyChart';
import { exportFinancialStatementPDF } from '../utils/pdfExport';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Download,
  Briefcase,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
} from 'lucide-react';

export const InsightsScreen: React.FC = () => {
  const {
    monthlyIncome,
    monthlySpent,
    monthlyRemaining,
    cashFlowSummary,
    netWorthSummary,
    categoryDistribution,
    weeklySpending,
    topSubcategories,
    insights,
    selectedMonth,
    user,
    incomes,
    allowances,
    bonuses,
    expenses,
    savings,
    investments,
    goals,
    budgets,
    subcategories,
    moneyOwed,
    loans,
    bills,
    subscriptions,
    emergencyFund,
  } = useFinTraQ();

  const [isExporting, setIsExporting] = useState(false);

  const totalInflows = cashFlowSummary.totalInflow;
  const totalOutflows =
    cashFlowSummary.expenses +
    cashFlowSummary.savings +
    cashFlowSummary.investment +
    cashFlowSummary.debtEmi;
  const netCashFlow = cashFlowSummary.remainingCashFlow;
  const savingsRate =
    totalInflows > 0
      ? Math.round(((cashFlowSummary.savings + cashFlowSummary.investment) / totalInflows) * 100)
      : 0;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportFinancialStatementPDF({
        user,
        selectedMonth,
        incomes,
        allowances,
        bonuses,
        expenses,
        savings,
        investments,
        goals,
        budgets,
        subcategories,
        moneyOwed,
        loans,
        bills,
        subscriptions,
        emergencyFund,
        cashFlow: cashFlowSummary,
        netWorth: netWorthSummary,
        insights,
      });
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2.5">
            <PieChartIcon className="text-[var(--mv-primary)]" size={28} />
            <span>Financial Insights & Cash Flow</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-0.5">
            Holistic cash flows, dynamic net worth calculations, and rule-based advisory diagnostics.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportPDF}
          disabled={isExporting}
          className="px-4 py-2.5 bg-[var(--mv-surface-hover)] hover:bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download size={15} className="text-[var(--mv-primary)]" />
          <span>{isExporting ? 'Generating Statement...' : 'Download Full PDF Report'}</span>
        </button>
      </div>

      {/* Net Worth & Cash Flow Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Net Cash Flow Card */}
        <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--mv-text-muted)]">
                Monthly Net Cash Flow
              </span>
              <div
                className={`text-2xl sm:text-3xl font-black mt-1 tabular-nums ${
                  netCashFlow >= 0 ? 'text-[var(--mv-income)]' : 'text-[var(--mv-danger)]'
                }`}
              >
                {netCashFlow >= 0 ? '+' : ''}
                {formatINR(netCashFlow)}
              </div>
            </div>
            <div
              className={`p-2.5 rounded-xl ${
                netCashFlow >= 0
                  ? 'bg-[var(--mv-income)]/15 text-[var(--mv-income)]'
                  : 'bg-[var(--mv-danger)]/15 text-[var(--mv-danger)]'
              }`}
            >
              {netCashFlow >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--mv-border)] text-center">
            <div className="vault-card p-2.5 rounded-xl border border-[var(--mv-border)]">
              <div className="text-[10px] font-bold uppercase text-[var(--mv-text-muted)]">Total Inflows</div>
              <div className="text-xs font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">
                {formatINR(totalInflows)}
              </div>
            </div>
            <div className="vault-card p-2.5 rounded-xl border border-[var(--mv-border)]">
              <div className="text-[10px] font-bold uppercase text-[var(--mv-text-muted)]">Total Outflows</div>
              <div className="text-xs font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">
                {formatINR(totalOutflows)}
              </div>
            </div>
            <div className="vault-card p-2.5 rounded-xl border border-[var(--mv-border)]">
              <div className="text-[10px] font-bold uppercase text-[var(--mv-text-muted)]">Savings Rate</div>
              <div className="text-xs font-black text-[var(--mv-income)] tabular-nums mt-0.5">
                {savingsRate}%
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[var(--mv-text-secondary)] leading-relaxed bg-[var(--mv-bg-secondary)] p-3 rounded-xl border border-[var(--mv-border)]">
            Inflows include Salary ({formatINR(cashFlowSummary.regularIncome)}), Allowances (
            {formatINR(cashFlowSummary.allowances)}), Bonuses ({formatINR(cashFlowSummary.bonus)}),
            and Other Income ({formatINR(cashFlowSummary.otherIncome)}). Outflows include Expenses (
            {formatINR(cashFlowSummary.expenses)}), Savings ({formatINR(cashFlowSummary.savings)}),
            Investments ({formatINR(cashFlowSummary.investment)}), and Debt/EMIs (
            {formatINR(cashFlowSummary.debtEmi)}).
          </div>
        </div>

        {/* Balance Sheet & Net Worth Card */}
        <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--mv-text-muted)]">
                Calculated Net Worth
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[var(--mv-text-primary)] tabular-nums mt-1">
                {formatINR(netWorthSummary.netWorth)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--mv-primary)]/15 text-[var(--mv-primary)]">
              <Briefcase size={22} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--mv-border)]">
            <div className="p-3 bg-[var(--mv-income)]/10 rounded-xl border border-[var(--mv-income)]/25">
              <div className="text-[10px] font-bold uppercase text-[var(--mv-income)]">Total Assets</div>
              <div className="text-sm font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">
                {formatINR(netWorthSummary.assets.total)}
              </div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] mt-1">
                Investments: {formatINR(netWorthSummary.assets.investments)} • Savings: {formatINR(netWorthSummary.assets.savings)} • To Receive: {formatINR(netWorthSummary.assets.moneyToReceive)}
              </div>
            </div>

            <div className="p-3 bg-[var(--mv-danger)]/10 rounded-xl border border-[var(--mv-danger)]/25">
              <div className="text-[10px] font-bold uppercase text-[var(--mv-danger)]">Total Liabilities</div>
              <div className="text-sm font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">
                {formatINR(netWorthSummary.liabilities.total)}
              </div>
              <div className="text-[10px] text-[var(--mv-text-secondary)] mt-1">
                Loans: {formatINR(netWorthSummary.liabilities.loansOutstanding)} • To Repay: {formatINR(netWorthSummary.liabilities.moneyToRepay)}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[var(--mv-warning)] bg-[var(--mv-warning)]/10 p-2.5 rounded-xl border border-[var(--mv-warning)]/25">
            ⚠️ <strong>Accounting Note:</strong> Net worth includes non-liquid investments and outstanding receivables. It does not represent immediately spendable cash.
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Breakdown Donut */}
        <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
          <h2 className="text-sm font-bold text-[var(--mv-text-primary)] flex items-center justify-between">
            <span>Spending by Rule Category</span>
            <span className="text-xs text-[var(--mv-text-muted)] font-normal">Needs vs Wants vs Savings</span>
          </h2>
          <DonutChart totalSpent={monthlySpent} segments={categoryDistribution} />
        </div>

        {/* Weekly Spending Rhythm */}
        <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
          <h2 className="text-sm font-bold text-[var(--mv-text-primary)] flex items-center justify-between">
            <span>Weekly Spending Cadence</span>
            <span className="text-xs text-[var(--mv-text-muted)] font-normal">Current Month Pace</span>
          </h2>
          <WeeklyChart days={weeklySpending} />
        </div>
      </div>

      {/* Top Subcategories Breakdown */}
      <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
        <h2 className="text-sm font-bold text-[var(--mv-text-primary)]">Top Expenditure Subcategories</h2>
        {topSubcategories.length === 0 ? (
          <p className="text-xs text-[var(--mv-text-muted)] py-4 text-center">No expenditure data logged for this month yet.</p>
        ) : (
          <div className="space-y-3">
            {topSubcategories.map((sub, i) => (
              <div key={sub.name} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-[var(--mv-text-primary)]">
                  <span>
                    #{i + 1} {sub.name}
                  </span>
                  <span className="tabular-nums">
                    {formatINR(sub.amount)} ({sub.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--mv-primary)] rounded-full"
                    style={{ width: `${Math.min(100, sub.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Rule-based Insights & Recommendations */}
      <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="text-[var(--mv-warning)]" size={20} />
          <h2 className="text-sm font-bold text-[var(--mv-text-primary)]">Dynamic Financial Observations</h2>
        </div>

        {insights.length === 0 ? (
          <p className="text-xs text-[var(--mv-text-muted)] py-4 text-center">
            As you log income and expenses, Money Vault provides automated recommendations and warnings here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                  insight.type === 'alert'
                    ? 'bg-[var(--mv-danger)]/10 border-[var(--mv-danger)]/30 text-[var(--mv-text-primary)]'
                    : insight.type === 'success'
                    ? 'bg-[var(--mv-income)]/10 border-[var(--mv-income)]/30 text-[var(--mv-text-primary)]'
                    : 'bg-[var(--mv-cyan)]/10 border-[var(--mv-cyan)]/30 text-[var(--mv-text-primary)]'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {insight.type === 'alert' && <AlertTriangle size={16} className="text-[var(--mv-danger)]" />}
                  {insight.type === 'success' && <CheckCircle size={16} className="text-[var(--mv-income)]" />}
                  {insight.type === 'info' && <TrendingUp size={16} className="text-[var(--mv-cyan)]" />}
                  {insight.type === 'neutral' && <Lightbulb size={16} className="text-[var(--mv-text-muted)]" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--mv-text-primary)]">{insight.title}</h4>
                  <p className="text-[11px] leading-relaxed mt-0.5 text-[var(--mv-text-secondary)]">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
