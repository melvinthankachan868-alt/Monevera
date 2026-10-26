import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR, toDateString } from '../utils/calculations';
import { ShieldCheck, ArrowRight, CheckCircle2, Sparkles, X, ChevronLeft } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { addIncome, updateSettings, updateEmergencyFundSetup, settings } = useFinTraQ();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Base Income
  const [monthlySalary, setMonthlySalary] = useState('');
  const [salarySource, setSalarySource] = useState('Primary Employment');

  // Step 2: Budget Rule Split
  const [needsPct, setNeedsPct] = useState(settings.needsPercentage || 50);
  const [wantsPct, setWantsPct] = useState(settings.wantsPercentage || 30);
  const [savingsPct, setSavingsPct] = useState(settings.savingsPercentage || 20);

  // Step 3: Emergency Fund Target
  const [targetMonths, setTargetMonths] = useState(6);
  const [essentialExpense, setEssentialExpense] = useState('');

  const handleFinish = async () => {
    const salaryVal = parseFloat(monthlySalary) || 0;
    if (salaryVal > 0) {
      await addIncome({
        source: salarySource || 'Primary Employment',
        amount: salaryVal,
        type: 'Salary',
        date: toDateString(new Date()),
        note: 'Initial salary configured during onboarding',
      });
    }

    await updateSettings({
      monthlySalary: salaryVal,
      monthlyIncome: salaryVal,
      needsPercentage: needsPct,
      wantsPercentage: wantsPct,
      savingsPercentage: savingsPct,
      onboardingCompleted: true,
    });

    const essentialVal =
      parseFloat(essentialExpense) || (salaryVal > 0 ? Math.round(salaryVal * 0.5) : 25000);

    await updateEmergencyFundSetup(essentialVal, targetMonths, 0);

    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--mv-primary)]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--mv-teal)]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header & Navigation */}
        <div className="relative z-10 flex items-center justify-between mb-7 pb-4 border-b border-[var(--mv-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center font-black shadow-xs shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--mv-primary)]">
                  Personal Vault Setup
                </span>
                <span className="text-[10px] font-bold text-[var(--mv-text-muted)] bg-[var(--mv-surface-hover)] px-2 py-0.5 rounded-full border border-[var(--mv-border)]">
                  Step {step} of 3
                </span>
              </div>
              <p className="text-xs font-semibold text-[var(--mv-text-secondary)] mt-0.5">
                {step === 1 && 'Configure base take-home salary'}
                {step === 2 && 'Set budget distribution rules'}
                {step === 3 && 'Establish emergency reserve target'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="w-8 h-8 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Dismiss setup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step 1: Base Monthly Salary */}
        {step === 1 && (
          <div className="relative z-10 space-y-6">
            <div>
              <h2 className="text-xl font-black text-[var(--mv-text-primary)] tracking-tight">
                What is your regular monthly income?
              </h2>
              <p className="text-xs text-[var(--mv-text-secondary)] mt-1.5 leading-relaxed">
                Enter your base take-home salary. Allowances, bonuses, and side earnings can be tracked separately anytime.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--mv-text-secondary)] block mb-1.5">
                  Monthly Take-Home Salary (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-[var(--mv-primary)]">₹</span>
                  <input
                    type="number"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    placeholder="e.g. 50,000"
                    className="w-full pl-9 pr-4 py-3.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl text-lg font-bold text-[var(--mv-text-primary)] placeholder-[var(--mv-text-muted)] focus:outline-none focus:border-[var(--mv-primary)] focus:ring-1 focus:ring-[var(--mv-primary)] transition-all tabular-nums"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--mv-text-secondary)] block mb-1.5">
                  Income Source Name
                </label>
                <input
                  type="text"
                  value={salarySource}
                  onChange={(e) => setSalarySource(e.target.value)}
                  placeholder="e.g. Primary Employment, Company Name"
                  className="w-full px-4 py-3 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl text-sm font-semibold text-[var(--mv-text-primary)] placeholder-[var(--mv-text-muted)] focus:outline-none focus:border-[var(--mv-primary)] focus:ring-1 focus:ring-[var(--mv-primary)] transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3.5 px-4 bg-[var(--mv-primary)] hover:bg-[var(--mv-primary-hover)] text-[#0B0D0C] rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(168,243,74,0.18)] transition-all cursor-pointer active:scale-98"
            >
              <span>Continue to Budget Guidelines</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Budgeting Rule */}
        {step === 2 && (
          <div className="relative z-10 space-y-6">
            <div>
              <h2 className="text-xl font-black text-[var(--mv-text-primary)] tracking-tight">
                50 / 30 / 20 Budget Distribution
              </h2>
              <p className="text-xs text-[var(--mv-text-secondary)] mt-1.5 leading-relaxed">
                Customize how your monthly net income should be allocated across fundamental categories.
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Needs Slider */}
              <div className="p-4 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[var(--mv-cyan)]">Needs (Rent, Bills, Groceries, EMIs)</span>
                  <span className="font-black text-[var(--mv-cyan)] text-sm">{needsPct}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="70"
                  value={needsPct}
                  onChange={(e) => {
                    const n = parseInt(e.target.value);
                    setNeedsPct(n);
                    const remainder = 100 - n;
                    setWantsPct(Math.round(remainder * 0.6));
                    setSavingsPct(remainder - Math.round(remainder * 0.6));
                  }}
                  className="w-full accent-[var(--mv-cyan)] cursor-pointer"
                />
              </div>

              {/* Wants Slider */}
              <div className="p-4 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[var(--mv-amber)]">Wants (Dining, Shopping, Leisure)</span>
                  <span className="font-black text-[var(--mv-amber)] text-sm">{wantsPct}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={wantsPct}
                  onChange={(e) => {
                    const w = parseInt(e.target.value);
                    setWantsPct(w);
                    setSavingsPct(Math.max(0, 100 - needsPct - w));
                  }}
                  className="w-full accent-[var(--mv-amber)] cursor-pointer"
                />
              </div>

              {/* Savings Slider */}
              <div className="p-4 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[var(--mv-primary)]">Savings & Investments</span>
                  <span className="font-black text-[var(--mv-primary)] text-sm">{savingsPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={savingsPct}
                  onChange={(e) => {
                    const s = parseInt(e.target.value);
                    setSavingsPct(s);
                    setWantsPct(Math.max(0, 100 - needsPct - s));
                  }}
                  className="w-full accent-[var(--mv-primary)] cursor-pointer"
                />
              </div>

              <div className="flex justify-between text-xs text-[var(--mv-text-muted)] font-medium px-1">
                <span>Total Target Allocation:</span>
                <span className={`font-black ${needsPct + wantsPct + savingsPct === 100 ? 'text-[var(--mv-primary)]' : 'text-[var(--mv-danger)]'}`}>
                  {needsPct + wantsPct + savingsPct}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 border border-[var(--mv-border)] bg-[var(--mv-surface-hover)] hover:bg-[var(--mv-surface-elevated)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] rounded-2xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 px-4 bg-[var(--mv-primary)] hover:bg-[var(--mv-primary-hover)] text-[#0B0D0C] rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(168,243,74,0.18)] transition-all cursor-pointer active:scale-98"
              >
                <span>Continue to Emergency Fund</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Emergency Fund Target */}
        {step === 3 && (
          <div className="relative z-10 space-y-6">
            <div>
              <h2 className="text-xl font-black text-[var(--mv-text-primary)] tracking-tight">
                Configure Your Emergency Safety Net
              </h2>
              <p className="text-xs text-[var(--mv-text-secondary)] mt-1.5 leading-relaxed">
                A dedicated emergency fund shields you from unexpected shocks without liquidating investments.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--mv-text-secondary)] block mb-1.5">
                  Target Months of Coverage
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 6, 9, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMonths(m)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        targetMonths === m
                          ? 'border-[var(--mv-primary)] bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] font-black shadow-xs'
                          : 'border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] hover:border-[var(--mv-border-strong)] hover:text-[var(--mv-text-primary)]'
                      }`}
                    >
                      {m} Months
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--mv-text-secondary)] block mb-1.5">
                  Estimated Essential Monthly Expenses (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--mv-primary)]">₹</span>
                  <input
                    type="number"
                    value={essentialExpense}
                    onChange={(e) => setEssentialExpense(e.target.value)}
                    placeholder={
                      parseFloat(monthlySalary) > 0
                        ? `Default: ₹${Math.round(parseFloat(monthlySalary) * 0.5).toLocaleString('en-IN')}`
                        : 'e.g. 25,000'
                    }
                    className="w-full pl-8 pr-4 py-3 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl text-sm font-bold text-[var(--mv-text-primary)] placeholder-[var(--mv-text-muted)] focus:outline-none focus:border-[var(--mv-primary)] focus:ring-1 focus:ring-[var(--mv-primary)] transition-all tabular-nums"
                  />
                </div>
              </div>

              <div className="p-4 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold text-[var(--mv-text-muted)] uppercase tracking-wider">
                    Calculated Emergency Target
                  </div>
                  <div className="text-xl font-black text-[var(--mv-primary)] tabular-nums mt-0.5">
                    {formatINR(
                      (parseFloat(essentialExpense) ||
                        (parseFloat(monthlySalary) > 0 ? parseFloat(monthlySalary) * 0.5 : 25000)) * targetMonths
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-4 border border-[var(--mv-border)] bg-[var(--mv-surface-hover)] hover:bg-[var(--mv-surface-elevated)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] rounded-2xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 py-3.5 px-4 bg-[var(--mv-primary)] hover:bg-[var(--mv-primary-hover)] text-[#0B0D0C] rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(168,243,74,0.18)] transition-all cursor-pointer active:scale-98"
              >
                <CheckCircle2 size={18} />
                <span>Complete Setup & Launch</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
