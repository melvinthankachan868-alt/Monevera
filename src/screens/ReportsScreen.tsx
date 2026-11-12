import React,{ useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { exportFinancialStatementPDF } from '../utils/pdfExport';
import { formatINR } from '../utils/calculations';
import {
FileText,
Download,
Calendar,
CheckCircle2,
Lock,
Layers
} from 'lucide-react';

export const ReportsScreen: React.FC = () => {
  const {
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
    cashFlowSummary,
    netWorthSummary,
    insights,
    monthlyIncome,
    monthlySpent,
  } = useFinTraQ();

  const [selectedRange, setSelectedRange] = useState<'this_month' | 'prev_month' | 'last_3' | 'last_6' | 'this_year' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState(selectedMonth);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExported, setLastExported] = useState<string | null>(null);

  const ranges = [
    { id: 'this_month', label: 'Current Month', desc: 'Active accounting month' },
    { id: 'prev_month', label: 'Previous Month', desc: 'Complete prior billing cycle' },
    { id: 'last_3', label: 'Last 3 Months', desc: 'Quarterly review & trend analysis' },
    { id: 'last_6', label: 'Last 6 Months', desc: 'Mid-year financial health check' },
    { id: 'this_year', label: 'Current Fiscal Year', desc: 'Full annual financial statement' },
  ] as const;

  const handleGenerate = async () => {
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
      setLastExported(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('PDF error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2">
              <FileText className="text-[var(--mv-primary)]" size={28} />
              <span>Financial Reports & Statements</span>
            </h1>
            <span className="text-[10px] font-bold text-[var(--mv-primary)] bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 px-2.5 py-0.5 rounded-full">
              Audit Grade
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-1">
            Generate formal, multi-page confidential statements branded with Money Vault security protocols.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isExporting}
          className="btn-primary px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Download size={16} strokeWidth={3} />
          <span>{isExporting ? 'Compiling Statement...' : 'Generate PDF Statement'}</span>
        </button>
      </div>

      {lastExported && (
        <div className="p-3.5 bg-[var(--mv-income)]/15 border border-[var(--mv-income)]/30 text-[var(--mv-income)] rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[var(--mv-income)]" />
          <span>Statement successfully compiled and downloaded at {lastExported}.</span>
        </div>
      )}

      {/* Range Selection Cards */}
      <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--mv-text-primary)] flex items-center gap-2">
          <Calendar size={16} className="text-[var(--mv-primary)]" />
          <span>Select Statement Accounting Scope</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {ranges.map((r) => {
            const isSelected = selectedRange === r.id;
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRange(r.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--mv-primary)] bg-[var(--mv-primary)]/15 shadow-sm'
                    : 'border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] hover:border-[var(--mv-border-strong)] hover:bg-[var(--mv-surface)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-xs ${isSelected ? 'text-[var(--mv-primary)]' : 'text-[var(--mv-text-primary)]'}`}>
                    {r.label}
                  </span>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-[var(--mv-primary)] animate-pulse" />}
                </div>
                <p className="text-[11px] text-[var(--mv-text-secondary)] mt-1">{r.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statement Preview Contents Overview */}
      <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--mv-text-primary)] flex items-center gap-2">
          <Layers size={16} className="text-[#A8F34A]" />
          <span>Statement Table of Contents & Certified Sections</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)] space-y-1">
            <div className="font-bold text-[var(--mv-text-primary)]">1. Executive Cash Summary</div>
            <p className="text-[11px] text-[var(--mv-text-secondary)]">Total inflow ({formatINR(monthlyIncome)}), outflows ({formatINR(monthlySpent)}), and net savings rate.</p>
          </div>

          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)] space-y-1">
            <div className="font-bold text-[var(--mv-text-primary)]">2. Income Architecture Breakdown</div>
            <p className="text-[11px] text-[var(--mv-text-secondary)]">Base salary, classified allowances, bonus awards, and freelance earnings.</p>
          </div>

          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)] space-y-1">
            <div className="font-bold text-[var(--mv-text-primary)]">3. 50/30/20 Budget Compliance</div>
            <p className="text-[11px] text-[var(--mv-text-secondary)]">Essential Needs vs Lifestyle Wants vs Wealth Savings allocation variance.</p>
          </div>

          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)] space-y-1">
            <div className="font-bold text-[var(--mv-text-primary)]">4. Money Owed & Settlement Ledger</div>
            <p className="text-[11px] text-[var(--mv-text-secondary)]">Receivables from friends/associates vs repayments owed with audit timestamps.</p>
          </div>

          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)] space-y-1">
            <div className="font-bold text-[var(--mv-text-primary)]">5. Formal Loans, EMIs & Liabilities</div>
            <p className="text-[11px] text-[var(--mv-text-secondary)]">Bank loans, vehicle installments, education loans, and interest schedules.</p>
          </div>

          <div className="vault-card p-3 rounded-xl border border-[var(--mv-border)] space-y-1">
            <div className="font-bold text-[var(--mv-text-primary)]">6. Balance Sheet & Net Worth Statement</div>
            <p className="text-[11px] text-[var(--mv-text-secondary)]">Liquid cash, savings, emergency buffer, investments less total debts.</p>
          </div>
        </div>
      </div>

      {/* Security Invariant Callout */}
      <div className="vault-card p-4 rounded-xl border border-[var(--mv-border)] flex items-center gap-3 text-xs text-[var(--mv-text-secondary)]">
        <Lock size={16} className="text-[#A8F34A] flex-shrink-0" />
        <p>
          Statements are compiled client-side with confidential formatting. All PDF headers and
          footers bear official certification: <span className="text-[var(--mv-text-primary)] font-semibold">Money Vault — Secure Your Money. Master Your Future.</span>
        </p>
      </div>
    </div>
  );
};
