import React,{ useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR,formatDisplayDate } from '../utils/calculations';
import {
ShieldCheck,
Settings,
Plus,
Minus,Sparkles
} from 'lucide-react';

export const EmergencyFundScreen: React.FC = () => {
  const {
    emergencyFund,
    emergencyFundDetails,
    updateEmergencyFundSetup,
    recordEmergencyFundContribution,
    recordEmergencyFundWithdrawal,
  } = useFinTraQ();

  const isAlreadyConfigured = Boolean(emergencyFund && emergencyFund.essentialMonthlyExpenses > 0);
  const [isConfiguring, setIsConfiguring] = useState(!isAlreadyConfigured);
  const [essentialExpensesInput, setEssentialExpensesInput] = useState(
    emergencyFund?.essentialMonthlyExpenses ? String(emergencyFund.essentialMonthlyExpenses) : ''
  );
  const [targetMonths, setTargetMonths] = useState(emergencyFund?.targetMonths || 6);
  const [currentAmountInput, setCurrentAmountInput] = useState(
    emergencyFund?.currentAmount ? String(emergencyFund.currentAmount) : ''
  );
  const [monthlyContributionInput, setMonthlyContributionInput] = useState(
    emergencyFund?.monthlyContributionPlan ? String(emergencyFund.monthlyContributionPlan) : ''
  );

  // Quick Action Modals
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');

  const targetMonthPresets = [1, 2, 3, 4, 6, 9, 12, 24];

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const essential = parseFloat(essentialExpensesInput) || 0;
    const current = parseFloat(currentAmountInput) || 0;
    const plan = parseFloat(monthlyContributionInput) || 0;

    await updateEmergencyFundSetup(essential, targetMonths, current, plan);
    setIsConfiguring(false);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;
    await recordEmergencyFundContribution(amt, depositNote || 'Regular safety net contribution');
    setDepositAmount('');
    setDepositNote('');
    setDepositOpen(false);
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) return;
    await recordEmergencyFundWithdrawal(amt, withdrawNote);
    setWithdrawAmount('');
    setWithdrawNote('');
    setWithdrawOpen(false);
  };

  const contributions = emergencyFund?.contributions || [];

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="text-[var(--mv-teal)]" size={28} />
            <span>Emergency Safety Fund</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-0.5">
            Dedicated safety reserve for unexpected life events — isolated from ordinary savings & investments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsConfiguring(!isConfiguring)}
          className="py-2 px-3.5 rounded-xl bg-[var(--mv-surface-hover)] hover:bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Settings size={15} className="text-[var(--mv-primary)]" />
          <span>{isConfiguring ? 'Close Setup' : 'Configure Target'}</span>
        </button>
      </div>

      {/* 1. Setup Form (if toggled or initial) */}
      {isConfiguring && (
        <form
          onSubmit={handleSaveSetup}
          className="vault-panel rounded-3xl p-6 border border-[var(--mv-border)] shadow-md space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-[var(--mv-border)] pb-3">
            <h2 className="text-sm font-extrabold text-[var(--mv-text-primary)]">Configure Emergency Fund Parameters</h2>
            <span className="text-xs text-[var(--mv-primary)] font-bold">Step 1 of 1</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                Essential Monthly Expenses (Needs)
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                value={essentialExpensesInput}
                onChange={(e) => setEssentialExpensesInput(e.target.value)}
                placeholder="25000"
                className="w-full px-3.5 py-2 text-xs font-bold bg-[var(--mv-surface)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl focus:outline-none focus:border-[var(--mv-primary)] tabular-nums"
                required
              />
              <span className="text-[10px] text-[var(--mv-text-muted)] mt-1 block">
                Rent, utilities, groceries, medicines & unavoidable bills
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                Current Emergency Balance (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={currentAmountInput}
                onChange={(e) => setCurrentAmountInput(e.target.value)}
                placeholder="90000"
                className="w-full px-3.5 py-2 text-xs font-bold bg-[var(--mv-surface)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl focus:outline-none focus:border-[var(--mv-primary)] tabular-nums"
                required
              />
              <span className="text-[10px] text-[var(--mv-text-muted)] mt-1 block">
                Liquid cash or savings reserve already in place
              </span>
            </div>
          </div>

          {/* Target Months Presets */}
          <div>
            <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-2">
              Select Target Cushion (Months)
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {targetMonthPresets.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTargetMonths(m)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    targetMonths === m
                      ? 'border-[var(--mv-teal)] bg-[var(--mv-teal)]/15 text-[var(--mv-teal)] shadow-xs'
                      : 'border-[var(--mv-border)] bg-[var(--mv-surface)] text-[var(--mv-text-secondary)] hover:border-[var(--mv-border-strong)]'
                  }`}
                >
                  {m} {m === 1 ? 'month' : 'mos'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--mv-text-muted)] mt-1">
              You choose the target cushion based on your personal risk tolerance and job stability.
            </p>
          </div>

          {/* Monthly Contribution Plan */}
          <div>
            <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
              Planned Monthly Contribution (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={monthlyContributionInput}
              onChange={(e) => setMonthlyContributionInput(e.target.value)}
              placeholder="10000"
              className="w-full px-3.5 py-2 text-xs font-bold bg-[var(--mv-surface)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl focus:outline-none focus:border-[var(--mv-primary)] tabular-nums"
            />
            <span className="text-[10px] text-[var(--mv-text-muted)] mt-1 block">
              Helps dynamically calculate your estimated target completion date.
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-2xl bg-[var(--mv-teal)] hover:brightness-110 text-white font-bold text-xs transition-all shadow-md active:scale-98 cursor-pointer"
          >
            Save Target & Calculate
          </button>
        </form>
      )}

      {/* 2. Visual Progress Card */}
      <div className="vault-panel-highlight rounded-3xl p-6 sm:p-7 border border-[var(--mv-border)] shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--mv-teal)]/15 border border-[var(--mv-teal)]/30 text-[var(--mv-teal)] flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--mv-text-muted)] block">
                EMERGENCY FUND
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">
                {formatINR(emergencyFundDetails.currentAmount)} / {formatINR(emergencyFundDetails.targetAmount)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-black text-[var(--mv-teal)] tabular-nums">
              {emergencyFundDetails.progressPercentage}%
            </span>
            <span className="text-[11px] text-[var(--mv-text-secondary)] font-semibold block">Completed</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 rounded-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] overflow-hidden relative">
            <div
              style={{ width: `${Math.min(emergencyFundDetails.progressPercentage, 100)}%` }}
              className="h-full rounded-full bg-gradient-to-r from-[var(--mv-teal)] to-[var(--mv-primary)] transition-all duration-700 ease-out"
            />
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-[var(--mv-text-secondary)]">
            <span>{formatINR(emergencyFundDetails.remainingAmount)} remaining</span>
            <span className="text-[var(--mv-teal)]">
              {emergencyFundDetails.monthsCovered} months of essential expenses covered
            </span>
          </div>
        </div>

        {/* Breakdown parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--mv-border)] text-center">
          <div className="p-3 bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)]">
            <span className="text-[10px] text-[var(--mv-text-muted)] font-bold uppercase block">Target Cushion</span>
            <span className="text-sm font-extrabold text-[var(--mv-text-primary)] block mt-0.5">
              {emergencyFundDetails.targetMonths} months
            </span>
          </div>
          <div className="p-3 bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)]">
            <span className="text-[10px] text-[var(--mv-text-muted)] font-bold uppercase block">Essential Expenses</span>
            <span className="text-sm font-extrabold text-[var(--mv-text-primary)] block mt-0.5 tabular-nums">
              {formatINR(emergencyFundDetails.essentialMonthlyExpenses)}/mo
            </span>
          </div>
          <div className="p-3 bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)]">
            <span className="text-[10px] text-[var(--mv-text-muted)] font-bold uppercase block">Monthly Contribution</span>
            <span className="text-sm font-extrabold text-[var(--mv-text-primary)] block mt-0.5 tabular-nums">
              {emergencyFundDetails.monthlyContributionPlan > 0
                ? `${formatINR(emergencyFundDetails.monthlyContributionPlan)}/mo`
                : 'Flexible'}
            </span>
          </div>
          <div className="p-3 bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)]">
            <span className="text-[10px] text-[var(--mv-text-muted)] font-bold uppercase block">Est. Completion</span>
            <span className="text-sm font-extrabold text-[var(--mv-teal)] block mt-0.5">
              {emergencyFundDetails.estimatedCompletionDate}
            </span>
          </div>
        </div>

        {/* Quick Contribution & Withdrawal Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => setDepositOpen(true)}
            className="flex-1 py-3 px-4 rounded-2xl bg-[var(--mv-income)] hover:brightness-110 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
          >
            <Plus size={16} />
            <span>Record Contribution</span>
          </button>
          <button
            type="button"
            onClick={() => setWithdrawOpen(true)}
            className="flex-1 py-3 px-4 rounded-2xl bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Minus size={16} />
            <span>Emergency Withdrawal</span>
          </button>
        </div>
      </div>

      {/* 3. AI Assistant Advice Card */}
      <div className="vault-panel rounded-3xl p-5 border border-[var(--mv-border)] shadow-sm flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-[var(--mv-teal)]/15 border border-[var(--mv-teal)]/30 text-[var(--mv-teal)] flex items-center justify-center shrink-0">
          <Sparkles size={20} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">Money Vault Financial Analysis</h3>
          <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed font-medium">
            You currently have <b className="text-[var(--mv-text-primary)]">{formatINR(emergencyFundDetails.currentAmount)}</b> in your emergency fund against a{' '}
            <b className="text-[var(--mv-text-primary)]">{formatINR(emergencyFundDetails.targetAmount)}</b> target, so you are{' '}
            <b className="text-[var(--mv-teal)]">{emergencyFundDetails.progressPercentage}%</b> complete. Your current balance covers approximately{' '}
            <b className="text-[var(--mv-text-primary)]">{emergencyFundDetails.monthsCovered} months</b> of the{' '}
            <b className="text-[var(--mv-text-primary)]">{formatINR(emergencyFundDetails.essentialMonthlyExpenses)}</b> essential monthly expenses you've recorded. You need another{' '}
            <b className="text-[var(--mv-text-primary)]">{formatINR(emergencyFundDetails.remainingAmount)}</b> to reach your selected {emergencyFundDetails.targetMonths}-month target.
          </p>
        </div>
      </div>

      {/* 4. Contribution & Withdrawal History */}
      <div className="vault-panel rounded-3xl p-5 border border-[var(--mv-border)] shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--mv-text-muted)]">
          TRANSACTION & ALLOCATION HISTORY
        </h3>
        {contributions.length === 0 ? (
          <p className="text-xs text-[var(--mv-text-muted)] p-6 text-center">
            No contributions or withdrawals recorded yet. Use the buttons above to log deposit entries.
          </p>
        ) : (
          <div className="divide-y divide-[var(--mv-border)] border border-[var(--mv-border)] rounded-2xl overflow-hidden">
            {contributions.map((c) => {
              const isDep = c.type === 'deposit';
              return (
                <div key={c.id} className="p-3.5 bg-[var(--mv-surface)] flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold tabular-nums ${isDep ? 'text-[var(--mv-income)]' : 'text-[var(--mv-danger)]'}`}>
                        {isDep ? '+' : '-'} {formatINR(c.amount)}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)]">
                        {isDep ? 'Contribution' : 'Withdrawal'}
                      </span>
                    </div>
                    {c.note && <span className="text-[11px] text-[var(--mv-text-muted)] block mt-0.5">{c.note}</span>}
                  </div>
                  <span className="text-[11px] text-[var(--mv-text-muted)]">{formatDisplayDate(c.date)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">Record Emergency Contribution</h3>
            <form onSubmit={handleDeposit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full px-3 py-2 text-sm font-bold bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl focus:outline-none focus:border-[var(--mv-teal)] tabular-nums"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="e.g. Monthly salary savings"
                  className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositOpen(false)}
                  className="flex-1 py-2 px-3 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-[var(--mv-income)] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer hover:brightness-110"
                >
                  Save Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">Record Emergency Withdrawal</h3>
            <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">
              Withdrawals from your emergency fund are tracked separately and not counted as ordinary budget spending automatically.
            </p>
            <form onSubmit={handleWithdrawal} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={emergencyFundDetails.currentAmount}
                  step="any"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Up to ${emergencyFundDetails.currentAmount}`}
                  className="w-full px-3 py-2 text-sm font-bold bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl focus:outline-none focus:border-[var(--mv-danger)] tabular-nums"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Reason / Expense</label>
                <input
                  type="text"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  placeholder="e.g. Urgent car repair, Medical bill"
                  className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWithdrawOpen(false)}
                  className="flex-1 py-2 px-3 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-[var(--mv-danger)] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer hover:brightness-110"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
