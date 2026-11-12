import React,{ useState,useMemo } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { CategoryType } from '../types';
import { formatINR,formatDisplayDate } from '../utils/calculations';
import { CategoryIcon } from '../components/CategoryIcon';
import {
Receipt,
Plus,
Search,
Trash2,
Edit2,
ArrowUpDown,
Download,
} from 'lucide-react';
import { exportFinancialStatementPDF } from '../utils/pdfExport';

export const ExpensesScreen: React.FC = () => {
  const {
    monthExpenses,
    selectedMonth,
    setSelectedMonth,
    deleteExpense,
    setEditingExpense,
    setQuickAddOpen,
    monthlySpent,
    categorySummaries,
    user,
    incomes,
    allowances,
    bonuses,
    expenses,
    savings,
    investments,
    goals,
    budgets,
    moneyOwed,
    loans,
    bills,
    subscriptions,
    emergencyFund,
    cashFlowSummary,
    netWorthSummary,
    insights,
    subcategories,
  } = useFinTraQ();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [isExporting, setIsExporting] = useState(false);

  // Category Summaries lookup
  const needsSummary = useMemo(
    () => categorySummaries.find((c) => c.category === 'Needs') || { spent: 0, budget: 0, percentageUsed: 0 },
    [categorySummaries]
  );
  const wantsSummary = useMemo(
    () => categorySummaries.find((c) => c.category === 'Wants') || { spent: 0, budget: 0, percentageUsed: 0 },
    [categorySummaries]
  );
  const savingsSummary = useMemo(
    () => categorySummaries.find((c) => c.category === 'Savings') || { spent: 0, budget: 0, percentageUsed: 0 },
    [categorySummaries]
  );

  // Filtered & sorted expenses
  const filteredExpenses = useMemo(() => {
    return monthExpenses
      .filter((exp) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          exp.subcategory.toLowerCase().includes(query) ||
          (exp.note && exp.note.toLowerCase().includes(query));
        const matchesCategory = selectedCategory === 'ALL' || exp.category === selectedCategory;
        const matchesMethod = selectedMethod === 'ALL' || exp.paymentMethod === selectedMethod;
        return matchesSearch && matchesCategory && matchesMethod;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount_desc') return b.amount - a.amount;
        if (sortBy === 'amount_asc') return a.amount - b.amount;
        return 0;
      });
  }, [monthExpenses, searchQuery, selectedCategory, selectedMethod, sortBy]);

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
      console.error('PDF generation error', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2">
              <Receipt className="text-[#A8F34A]" size={26} />
              <span>Expense Ledger</span>
            </h1>
            <span className="text-[10px] font-bold text-[#FF7373] bg-[#2D1616] border border-[#FF7373]/30 px-2.5 py-0.5 rounded-full">
              Cash Outflow
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-1">
            Log and audit all expenditures dynamically categorized by Needs, Wants, and Savings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="btn-secondary px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Download size={15} />
            <span>{isExporting ? 'Generating...' : 'PDF Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Month Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="vault-card p-4 rounded-2xl border border-[var(--mv-border)] space-y-1">
          <div className="text-[10.5px] font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">Total Spent</div>
          <div className="text-2xl font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">{formatINR(monthlySpent)}</div>
          <div className="text-[10.5px] text-[var(--mv-text-muted)] mt-0.5">{monthExpenses.length} transactions</div>
        </div>

        <div className="vault-card p-4 rounded-2xl border border-[var(--mv-border)] space-y-1">
          <div className="text-[10.5px] font-bold text-[#64D8FF] uppercase tracking-wider">Needs (50%)</div>
          <div className="text-2xl font-black text-[#64D8FF] tabular-nums mt-0.5">
            {formatINR(needsSummary.spent)}
          </div>
          <div className="text-[10.5px] text-[var(--mv-text-secondary)] mt-0.5">
            {needsSummary.budget > 0
              ? `${Math.round((needsSummary.spent / needsSummary.budget) * 100)}% of limit`
              : 'Limit not set'}
          </div>
        </div>

        <div className="vault-card p-4 rounded-2xl border border-[var(--mv-border)] space-y-1">
          <div className="text-[10.5px] font-bold text-[#FFB84D] uppercase tracking-wider">Wants (30%)</div>
          <div className="text-2xl font-black text-[#FFB84D] tabular-nums mt-0.5">
            {formatINR(wantsSummary.spent)}
          </div>
          <div className="text-[10.5px] text-[var(--mv-text-secondary)] mt-0.5">
            {wantsSummary.budget > 0
              ? `${Math.round((wantsSummary.spent / wantsSummary.budget) * 100)}% of limit`
              : 'Limit not set'}
          </div>
        </div>

        <div className="vault-card p-4 rounded-2xl border border-[var(--mv-border)] space-y-1">
          <div className="text-[10.5px] font-bold text-[#78D64B] uppercase tracking-wider">Savings (20%)</div>
          <div className="text-2xl font-black text-[#78D64B] tabular-nums mt-0.5">
            {formatINR(savingsSummary.spent)}
          </div>
          <div className="text-[10.5px] text-[var(--mv-text-secondary)] mt-0.5">Direct transfers</div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="vault-panel p-4.5 rounded-2xl border border-[var(--mv-border)] space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search box */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--mv-text-muted)]" size={16} />
            <input
              type="text"
              placeholder="Search expenses by subcategory or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-xs font-semibold text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]/50 transition-colors"
            />
          </div>

          {/* Month selector */}
          <div className="relative">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[#A8F34A]/50 cursor-pointer"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 bg-[var(--mv-bg-secondary)] px-3.5 py-2.5 border border-[var(--mv-border)] rounded-xl">
            <ArrowUpDown size={14} className="text-[var(--mv-text-secondary)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="date_desc" className="bg-[var(--mv-surface)] text-[var(--mv-text-primary)]">Newest First</option>
              <option value="date_asc" className="bg-[var(--mv-surface)] text-[var(--mv-text-primary)]">Oldest First</option>
              <option value="amount_desc" className="bg-[var(--mv-surface)] text-[var(--mv-text-primary)]">Highest Amount</option>
              <option value="amount_asc" className="bg-[var(--mv-surface)] text-[var(--mv-text-primary)]">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--mv-border)]">
          <span className="text-[11px] font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mr-1">Category:</span>
          {(['ALL', 'Needs', 'Wants', 'Savings'] as const).map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? cat === 'Needs'
                      ? 'bg-[#64D8FF]/20 text-[#64D8FF] border border-[#64D8FF]/40 shadow-sm'
                      : cat === 'Wants'
                      ? 'bg-[#FFB84D]/20 text-[#FFB84D] border border-[#FFB84D]/40 shadow-sm'
                      : cat === 'Savings'
                      ? 'bg-[#78D64B]/20 text-[#78D64B] border border-[#78D64B]/40 shadow-sm'
                      : 'bg-[#A8F34A] text-[#0B0D0C] font-black shadow-sm'
                    : 'bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)]'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">Method:</span>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="bg-[var(--mv-bg-secondary)] text-xs font-semibold text-[var(--mv-text-primary)] py-1.5 px-2.5 rounded-lg border border-[var(--mv-border)] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[var(--mv-surface)]">All Methods</option>
              <option value="UPI" className="bg-[var(--mv-surface)]">UPI</option>
              <option value="Credit Card" className="bg-[var(--mv-surface)]">Credit Card</option>
              <option value="Debit Card" className="bg-[var(--mv-surface)]">Debit Card</option>
              <option value="Net Banking" className="bg-[var(--mv-surface)]">Net Banking</option>
              <option value="Cash" className="bg-[var(--mv-surface)]">Cash</option>
              <option value="Other" className="bg-[var(--mv-surface)]">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table / List */}
      <div className="vault-panel rounded-2xl border border-[var(--mv-border)] overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] border border-[var(--mv-primary)]/30 flex items-center justify-center mx-auto">
              <Receipt size={24} />
            </div>
            <h3 className="text-base font-bold text-[var(--mv-text-primary)]">No Expenses Recorded</h3>
            <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
              {searchQuery || selectedCategory !== 'ALL' || selectedMethod !== 'ALL'
                ? 'No transactions match your current search or filter criteria.'
                : 'You have not recorded any expenses for this month yet. Real financial tracking begins by logging your daily expenditures.'}
            </p>
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Plus size={15} strokeWidth={3} />
              <span>Record First Expense</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#252B27]">
            {filteredExpenses.map((expense) => {
              return (
                <div
                  key={expense.id}
                  className="p-4 flex items-center justify-between hover:bg-[var(--mv-surface-hover)]/60 transition-colors group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <CategoryIcon name={expense.subcategory} category={expense.category} size={20} />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-[var(--mv-text-primary)] truncate">
                          {expense.subcategory || 'Expense'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            expense.category === 'Needs'
                              ? 'bg-[#64D8FF]/10 text-[#64D8FF] border border-[#64D8FF]/20'
                              : expense.category === 'Wants'
                              ? 'bg-[#FFB84D]/10 text-[#FFB84D] border border-[#FFB84D]/20'
                              : 'bg-[#78D64B]/10 text-[#78D64B] border border-[#78D64B]/20'
                          }`}
                        >
                          {expense.category}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--mv-text-secondary)] mt-1">
                        <span>{formatDisplayDate(expense.date)}</span>
                        {expense.paymentMethod && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] font-medium text-[var(--mv-text-secondary)]">
                              {expense.paymentMethod}
                            </span>
                          </>
                        )}
                        {expense.note && (
                          <>
                            <span>•</span>
                            <span className="italic text-[var(--mv-text-muted)] truncate max-w-xs">{expense.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-black text-base text-[var(--mv-text-primary)] tabular-nums">
                        {formatINR(expense.amount)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setEditingExpense(expense)}
                        className="p-1.5 text-[var(--mv-text-secondary)] hover:text-[#A8F34A] rounded-lg hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
                        title="Edit expense"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteExpense(expense.id)}
                        className="p-1.5 text-[var(--mv-text-secondary)] hover:text-[#FF7373] rounded-lg hover:bg-[#2D1616] transition-colors cursor-pointer"
                        title="Delete expense"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
