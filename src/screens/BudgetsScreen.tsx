import React,{ useState,useMemo } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { CategoryType } from '../types';
import { formatINR } from '../utils/calculations';
import { BudgetSplitEditor } from '../components/BudgetSplitEditor';
import { SubcategoryBudgetModal } from '../components/SubcategoryBudgetModal';
import { BudgetOverview } from '../components/BudgetOverview';
import {
PiggyBank,
Plus,
Edit2,PieChart,ArrowLeft
} from 'lucide-react';

export const BudgetsScreen: React.FC = () => {
  const {
    monthlyIncome,
    monthlySalary,
    incomeBreakdown,
    categorySummaries,
    subcategories,
    budgets,
    monthExpenses,
    addSubcategory,
    deleteSubcategory,
    selectedMonth,
    settings,
    setActiveTab: navigateToTab,
  } = useFinTraQ();

  const [activeTab, setActiveTab] = useState<'rules' | 'subcategories'>('rules');
  const [splitEditorOpen, setSplitEditorOpen] = useState(false);
  const [subcatModalOpen, setSubcatModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<CategoryType>('Needs');
  const [newSubcatName, setNewSubcatName] = useState('');
  const [newSubcatCategory, setNewSubcatCategory] = useState<CategoryType>('Needs');
  const [showAddSubcat, setShowAddSubcat] = useState(false);

  // Group subcategories by parent category
  const subcatsByCategory = useMemo(
    () => ({
      Needs: subcategories.filter((s) => s.category === 'Needs'),
      Wants: subcategories.filter((s) => s.category === 'Wants'),
      Savings: subcategories.filter((s) => s.category === 'Savings'),
    }),
    [subcategories]
  );

  // Category Summaries lookup
  const needsSummary = useMemo(
    () => categorySummaries.find((c) => c.category === 'Needs') || { spent: 0, budget: 0, remaining: 0, percentageUsed: 0 },
    [categorySummaries]
  );
  const wantsSummary = useMemo(
    () => categorySummaries.find((c) => c.category === 'Wants') || { spent: 0, budget: 0, remaining: 0, percentageUsed: 0 },
    [categorySummaries]
  );
  const savingsSummary = useMemo(
    () => categorySummaries.find((c) => c.category === 'Savings') || { spent: 0, budget: 0, remaining: 0, percentageUsed: 0 },
    [categorySummaries]
  );

  // Spending per subcategory
  const spendingBySubcat = useMemo(
    () =>
      monthExpenses.reduce((acc, exp) => {
        const key = exp.subcategory || 'General';
        acc[key] = (acc[key] || 0) + exp.amount;
        return acc;
      }, {} as Record<string, number>),
    [monthExpenses]
  );

  const handleCreateSubcat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcatName.trim()) return;
    await addSubcategory(newSubcatName.trim(), newSubcatCategory, 'Tag');
    setNewSubcatName('');
    setShowAddSubcat(false);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateToTab('home')}
            className="p-2 -ml-1 rounded-xl text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2">
                <PiggyBank className="text-[var(--mv-primary)]" size={28} />
                <span>Budgets & Allocations</span>
              </h1>
              <span className="text-[10px] font-bold text-[var(--mv-primary)] bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 px-2.5 py-0.5 rounded-full">
                50/30/20 Engine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-1">
              Dynamic mathematical guardrails with granular subcategory caps linked to your monthly income.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center p-1 bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-[#A8F34A] text-[#0B0D0C] shadow-sm font-black'
                : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
            }`}
          >
            50/30/20 Rule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subcategories')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'subcategories'
                ? 'bg-[#A8F34A] text-[#0B0D0C] shadow-sm font-black'
                : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
            }`}
          >
            Subcategory Caps
          </button>
        </div>
      </div>

      {/* Income Basis Header Banner */}
      <div className="vault-panel-highlight rounded-2xl p-5 border border-[var(--mv-border)] flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#A8F34A]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A8F34A] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#78D64B] animate-pulse" />
            <span>Current Income Allocation Basis ({selectedMonth})</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--mv-text-primary)] tracking-tight tabular-nums mt-1">
            {formatINR(monthlyIncome)}
          </div>
          <div className="text-xs text-[var(--mv-text-secondary)] mt-1">
            Base Salary: <span className="text-[var(--mv-text-primary)] font-semibold">{formatINR(monthlySalary)}</span>
            {incomeBreakdown.allowancesTotal > 0 && (
              <> • Allowances: <span className="text-[var(--mv-text-primary)] font-semibold">{formatINR(incomeBreakdown.allowancesTotal)}</span></>
            )}
            {incomeBreakdown.bonusesTotal > 0 && (
              <> • Bonuses: <span className="text-[var(--mv-text-primary)] font-semibold">{formatINR(incomeBreakdown.bonusesTotal)}</span></>
            )}
          </div>
        </div>

        <div className="relative z-10 bg-[var(--mv-bg-secondary)]/80 p-3.5 rounded-xl border border-[var(--mv-border)] sm:text-right flex flex-col sm:items-end gap-2">
          <div>
            <div className="text-[11px] font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">Active Guideline Split</div>
            <div className="text-xs font-extrabold text-[var(--mv-text-primary)] mt-0.5">
              <span className="text-[#64D8FF]">{settings.needsPercentage}% Needs</span> • <span className="text-[#FFB84D]">{settings.wantsPercentage}% Wants</span> • <span className="text-[#78D64B]">{settings.savingsPercentage}% Savings</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSplitEditorOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--mv-primary)] text-[#0B0D0C] text-xs font-black hover:brightness-110 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            title="Adjust 50/30/20 budget ratio split"
          >
            <PieChart size={13} />
            <span>Adjust Split</span>
          </button>
        </div>
      </div>

      {activeTab === 'rules' ? (
        <div className="space-y-6">
          {/* Budget Overview Rings Component */}
          <BudgetOverview
            onAdjustSplit={() => setSplitEditorOpen(true)}
            onConfigureLimits={(cat) => {
              setModalCategory(cat);
              setSubcatModalOpen(true);
            }}
          />

          {/* Main 50/30/20 Rule Visual Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Needs Card */}
            <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64D8FF] bg-[#64D8FF]/10 border border-[#64D8FF]/30 px-2.5 py-1 rounded-full">
                    50% Guideline
                  </span>
                  <h3 className="text-base font-bold text-[var(--mv-text-primary)] mt-2.5">Essential Needs</h3>
                  <p className="text-xs text-[var(--mv-text-secondary)]">Rent, groceries, utilities, EMIs, health</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xl font-black text-[#64D8FF] tabular-nums">
                    {formatINR(needsSummary.spent)}
                  </span>
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

                <div className="flex justify-between items-center text-xs mt-2.5 font-semibold">
                  <span
                    className={
                      needsSummary.remaining >= 0 ? 'text-[var(--mv-text-secondary)]' : 'text-[#FF7373] font-bold'
                    }
                  >
                    {needsSummary.remaining >= 0
                      ? `${formatINR(needsSummary.remaining)} remaining`
                      : `${formatINR(Math.abs(needsSummary.remaining))} over budget`}
                  </span>
                  <span className="text-[#64D8FF] font-bold">{needsSummary.percentageUsed}%</span>
                </div>
              </div>
            </div>

            {/* Wants Card */}
            <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFB84D] bg-[#FFB84D]/10 border border-[#FFB84D]/30 px-2.5 py-1 rounded-full">
                    30% Guideline
                  </span>
                  <h3 className="text-base font-bold text-[var(--mv-text-primary)] mt-2.5">Lifestyle Wants</h3>
                  <p className="text-xs text-[var(--mv-text-secondary)]">Dining, shopping, hobbies, streaming</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xl font-black text-[#FFB84D] tabular-nums">
                    {formatINR(wantsSummary.spent)}
                  </span>
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

                <div className="flex justify-between items-center text-xs mt-2.5 font-semibold">
                  <span
                    className={
                      wantsSummary.remaining >= 0 ? 'text-[var(--mv-text-secondary)]' : 'text-[#FF7373] font-bold'
                    }
                  >
                    {wantsSummary.remaining >= 0
                      ? `${formatINR(wantsSummary.remaining)} remaining`
                      : `${formatINR(Math.abs(wantsSummary.remaining))} over budget`}
                  </span>
                  <span className="text-[#FFB84D] font-bold">{wantsSummary.percentageUsed}%</span>
                </div>
              </div>
            </div>

            {/* Savings Card */}
            <div className="vault-panel p-5 rounded-2xl border border-[var(--mv-border)] space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#78D64B] bg-[#78D64B]/10 border border-[#78D64B]/30 px-2.5 py-1 rounded-full">
                    20% Guideline
                  </span>
                  <h3 className="text-base font-bold text-[var(--mv-text-primary)] mt-2.5">Savings & Wealth</h3>
                  <p className="text-xs text-[var(--mv-text-secondary)]">Emergency safety net, mutual funds, gold</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xl font-black text-[#78D64B] tabular-nums">
                    {formatINR(savingsSummary.spent)}
                  </span>
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

                <div className="flex justify-between items-center text-xs mt-2.5 font-semibold">
                  <span className="text-[var(--mv-text-secondary)]">
                    {savingsSummary.spent >= savingsSummary.budget
                      ? 'Target achieved 🎉'
                      : `${formatINR(savingsSummary.budget - savingsSummary.spent)} to target`}
                  </span>
                  <span className="text-[#78D64B] font-bold">{savingsSummary.percentageUsed}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Split Editor Modal */}
          {splitEditorOpen && (
            <BudgetSplitEditor isOpen={splitEditorOpen} onClose={() => setSplitEditorOpen(false)} />
          )}
        </div>
      ) : (
        /* Subcategories & Granular Caps */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-[var(--mv-text-primary)]">Subcategory Limits & Tracking</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalCategory('Needs');
                  setSubcatModalOpen(true);
                }}
                className="btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Set Category Caps
              </button>
              <button
                type="button"
                onClick={() => setShowAddSubcat(true)}
                className="btn-primary px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus size={16} strokeWidth={3} />
                <span>Add Subcategory</span>
              </button>
            </div>
          </div>

          {showAddSubcat && (
            <form
              onSubmit={handleCreateSubcat}
              className="vault-panel p-4 rounded-2xl border border-[var(--mv-border)] flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-200"
            >
              <input
                type="text"
                value={newSubcatName}
                onChange={(e) => setNewSubcatName(e.target.value)}
                placeholder="Subcategory Name (e.g. Gym, Pet Care, Streaming)"
                className="flex-1 w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-xs font-semibold text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]/60"
                autoFocus
              />
              <select
                value={newSubcatCategory}
                onChange={(e) => setNewSubcatCategory(e.target.value as CategoryType)}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="Needs" className="bg-[var(--mv-surface)]">Needs</option>
                <option value="Wants" className="bg-[var(--mv-surface)]">Wants</option>
                <option value="Savings" className="bg-[var(--mv-surface)]">Savings</option>
              </select>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  className="btn-primary flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSubcat(false)}
                  className="btn-secondary flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {(['Needs', 'Wants', 'Savings'] as const).map((cat) => {
            const list = subcatsByCategory[cat];
            return (
              <div key={cat} className="vault-panel rounded-2xl border border-[var(--mv-border)] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--mv-text-primary)] flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        cat === 'Needs'
                          ? 'bg-[#64D8FF]'
                          : cat === 'Wants'
                          ? 'bg-[#FFB84D]'
                          : 'bg-[#78D64B]'
                      }`}
                    />
                    <span>{cat} Subcategories</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setModalCategory(cat);
                      setSubcatModalOpen(true);
                    }}
                    className="text-xs text-[#A8F34A] hover:text-[#B8FF62] font-bold cursor-pointer"
                  >
                    Edit {cat} Caps →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {list.map((subcat) => {
                    const spent = spendingBySubcat[subcat.name] || 0;
                    const subcatBudget = budgets.find(
                      (b) => b.subcategory === subcat.name && b.month === selectedMonth
                    );
                    const cap = subcatBudget ? subcatBudget.amount : 0;
                    const pct = cap > 0 ? Math.round((spent / cap) * 100) : 0;

                    return (
                      <div
                        key={subcat.id}
                        onClick={() => {
                          setModalCategory(cat);
                          setSubcatModalOpen(true);
                        }}
                        className="vault-card p-3.5 rounded-xl border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[var(--mv-text-primary)] group-hover:text-[#A8F34A] transition-colors">
                            {subcat.name}
                          </span>
                          <Edit2 size={13} className="text-[var(--mv-text-muted)] group-hover:text-[var(--mv-text-secondary)]" />
                        </div>

                        <div className="mt-2 flex justify-between items-baseline">
                          <span className="text-sm font-black text-[var(--mv-text-primary)] tabular-nums">{formatINR(spent)}</span>
                          <span className="text-[11px] text-[var(--mv-text-secondary)]">
                            {cap > 0 ? `cap ${formatINR(cap)}` : 'no cap'}
                          </span>
                        </div>

                        {cap > 0 && (
                          <div className="mt-2 w-full bg-[var(--mv-bg-secondary)] h-1.5 rounded-full overflow-hidden border border-[var(--mv-border)]">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                pct > 100 ? 'bg-[#FF7373]' : pct > 80 ? 'bg-[#FFB84D]' : 'bg-[#78D64B]'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subcategory Edit Modal */}
      <SubcategoryBudgetModal
        isOpen={subcatModalOpen}
        onClose={() => setSubcatModalOpen(false)}
        targetCategory={modalCategory}
      />
    </div>
  );
};
