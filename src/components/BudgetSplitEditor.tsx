import React,{ useState,useEffect } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { BUDGET_RATIO_PRESETS } from '../constants/defaults';
import { formatINR,validateBudgetPercentages,calculateSalarySplit } from '../utils/calculations';
import confetti from 'canvas-confetti';
import { Check,AlertCircle,ArrowLeft } from 'lucide-react';

interface BudgetSplitEditorProps {
  isOpen?: boolean;
  onClose: () => void;
}

export const BudgetSplitEditor: React.FC<BudgetSplitEditorProps> = ({ isOpen = true, onClose }) => {
  const { settings, updateSettings, monthlyIncome, setQuickAddOpen } = useFinTraQ();
  const [mode, setMode] = useState<'ratio' | 'amount'>('ratio');
  const [needsPct, setNeedsPct] = useState(settings.needsPercentage);
  const [wantsPct, setWantsPct] = useState(settings.wantsPercentage);
  const [savingsPct, setSavingsPct] = useState(settings.savingsPercentage);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNeedsPct(settings.needsPercentage);
    setWantsPct(settings.wantsPercentage);
    setSavingsPct(settings.savingsPercentage);
    setIsSaving(false);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const validation = validateBudgetPercentages(needsPct, wantsPct, savingsPct);
  const split = calculateSalarySplit(monthlyIncome, needsPct, wantsPct, savingsPct);

  const handleCancel = () => {
    setNeedsPct(settings.needsPercentage);
    setWantsPct(settings.wantsPercentage);
    setSavingsPct(settings.savingsPercentage);
    setIsSaving(false);
    onClose();
  };

  const handlePreset = (preset: { needs: number; wants: number; savings: number }) => {
    setNeedsPct(preset.needs);
    setWantsPct(preset.wants);
    setSavingsPct(preset.savings);
  };

  const handleAmountChange = (category: 'needs' | 'wants' | 'savings', newAmount: number) => {
    if (monthlyIncome <= 0) return;
    const safeAmount = Math.max(0, newAmount);
    const calculatedPct = Math.round((safeAmount / monthlyIncome) * 100);
    if (category === 'needs') {
      setNeedsPct(calculatedPct);
    } else if (category === 'wants') {
      setWantsPct(calculatedPct);
    } else {
      setSavingsPct(calculatedPct);
    }
  };

  const handleSave = async () => {
    if (isSaving || !validation.isValid) return;
    setIsSaving(true);
    try {
      await updateSettings({
        needsPercentage: needsPct,
        wantsPercentage: wantsPct,
        savingsPercentage: savingsPct,
      });
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#A8F34A', '#55E0C1', '#78D64B'],
        });
      } catch {}
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--mv-surface)] rounded-3xl w-full max-w-md shadow-2xl border border-[var(--mv-border)] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 -ml-2 rounded-xl text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-[var(--mv-text-primary)] tracking-tight">ADJUST SPLIT</h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">Allocate your take-home income</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)]">
            {formatINR(monthlyIncome)}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {monthlyIncome === 0 && (
            <div className="p-3 bg-[var(--mv-warning)]/15 border border-[var(--mv-warning)]/30 rounded-2xl flex items-center justify-between text-xs text-[var(--mv-warning)]">
              <span>No income recorded for this month yet.</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setQuickAddOpen(true, 'income');
                }}
                className="font-bold underline text-[var(--mv-primary)] cursor-pointer"
              >
                + Add Income
              </button>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('ratio')}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'ratio'
                  ? 'bg-[var(--mv-surface-elevated)] text-[var(--mv-primary)] shadow-sm font-black border border-[var(--mv-primary)]/30'
                  : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
              }`}
            >
              By ratio %
            </button>
            <button
              type="button"
              onClick={() => setMode('amount')}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'amount'
                  ? 'bg-[var(--mv-surface-elevated)] text-[var(--mv-primary)] shadow-sm font-black border border-[var(--mv-primary)]/30'
                  : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
              }`}
            >
              By amount (₹)
            </button>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-2.5">
              Quick presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_RATIO_PRESETS.map((p) => {
                const isSelected =
                  needsPct === p.needs && wantsPct === p.wants && savingsPct === p.savings;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handlePreset(p)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'border-[var(--mv-primary)] bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] shadow-sm'
                        : 'border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] hover:border-[var(--mv-border-strong)] hover:text-[var(--mv-text-primary)]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Rows */}
          <div className="space-y-3.5">
            {/* Needs */}
            <div className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#64D8FF]" />
                <div>
                  <span className="block text-sm font-bold text-[var(--mv-text-primary)]">Needs</span>
                  <span className="block text-xs text-[var(--mv-text-secondary)] font-medium tabular-nums">
                    {formatINR(split.needsAmount)}
                  </span>
                </div>
              </div>
              {mode === 'ratio' ? (
                <div className="flex items-center gap-1.5 bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-xl px-2.5 py-1.5 focus-within:border-[#64D8FF]/60">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={needsPct}
                    onChange={(e) => setNeedsPct(Number(e.target.value) || 0)}
                    className="w-12 text-right text-sm font-bold text-[var(--mv-text-primary)] focus:outline-none tabular-nums bg-transparent"
                  />
                  <span className="text-xs font-semibold text-[var(--mv-text-secondary)]">%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-xl px-2.5 py-1.5 focus-within:border-[#64D8FF]/60">
                  <span className="text-xs font-bold text-[var(--mv-text-secondary)]">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={split.needsAmount}
                    onChange={(e) => handleAmountChange('needs', Number(e.target.value) || 0)}
                    className="w-20 text-right text-sm font-bold text-[var(--mv-text-primary)] focus:outline-none tabular-nums bg-transparent"
                  />
                </div>
              )}
            </div>

            {/* Wants */}
            <div className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#FFB84D]" />
                <div>
                  <span className="block text-sm font-bold text-[var(--mv-text-primary)]">Wants</span>
                  <span className="block text-xs text-[var(--mv-text-secondary)] font-medium tabular-nums">
                    {formatINR(split.wantsAmount)}
                  </span>
                </div>
              </div>
              {mode === 'ratio' ? (
                <div className="flex items-center gap-1.5 bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-xl px-2.5 py-1.5 focus-within:border-[#FFB84D]/60">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={wantsPct}
                    onChange={(e) => setWantsPct(Number(e.target.value) || 0)}
                    className="w-12 text-right text-sm font-bold text-[var(--mv-text-primary)] focus:outline-none tabular-nums bg-transparent"
                  />
                  <span className="text-xs font-semibold text-[var(--mv-text-secondary)]">%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-xl px-2.5 py-1.5 focus-within:border-[#FFB84D]/60">
                  <span className="text-xs font-bold text-[var(--mv-text-secondary)]">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={split.wantsAmount}
                    onChange={(e) => handleAmountChange('wants', Number(e.target.value) || 0)}
                    className="w-20 text-right text-sm font-bold text-[var(--mv-text-primary)] focus:outline-none tabular-nums bg-transparent"
                  />
                </div>
              )}
            </div>

            {/* Savings */}
            <div className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#78D64B]" />
                <div>
                  <span className="block text-sm font-bold text-[var(--mv-text-primary)]">Savings</span>
                  <span className="block text-xs text-[var(--mv-text-secondary)] font-medium tabular-nums">
                    {formatINR(split.savingsAmount)}
                  </span>
                </div>
              </div>
              {mode === 'ratio' ? (
                <div className="flex items-center gap-1.5 bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-xl px-2.5 py-1.5 focus-within:border-[#78D64B]/60">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={savingsPct}
                    onChange={(e) => setSavingsPct(Number(e.target.value) || 0)}
                    className="w-12 text-right text-sm font-bold text-[var(--mv-text-primary)] focus:outline-none tabular-nums bg-transparent"
                  />
                  <span className="text-xs font-semibold text-[var(--mv-text-secondary)]">%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-xl px-2.5 py-1.5 focus-within:border-[#78D64B]/60">
                  <span className="text-xs font-bold text-[var(--mv-text-secondary)]">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={split.savingsAmount}
                    onChange={(e) => handleAmountChange('savings', Number(e.target.value) || 0)}
                    className="w-20 text-right text-sm font-bold text-[var(--mv-text-primary)] focus:outline-none tabular-nums bg-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Validation Total status bar */}
          <div
            className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-colors border ${
              validation.isValid
                ? 'bg-[var(--mv-income)]/15 border-[var(--mv-income)]/30 text-[var(--mv-income)]'
                : 'bg-[var(--mv-danger)]/15 border-[var(--mv-danger)]/30 text-[var(--mv-danger)]'
            }`}
          >
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <Check size={16} className="text-[var(--mv-income)]" />
              ) : (
                <AlertCircle size={16} className="text-[var(--mv-danger)]" />
              )}
              <span>
                Total <strong className="tabular-nums">{validation.total}%</strong> —{' '}
                {validation.isValid ? 'balanced' : 'Must total 100%'}
              </span>
            </div>
            {!validation.isValid && (
              <span
                className="text-[11px] font-normal underline cursor-pointer text-[var(--mv-text-primary)] hover:text-[var(--mv-primary)]"
                onClick={() => handlePreset(BUDGET_RATIO_PRESETS[0])}
              >
                Reset 50/30/20
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--mv-border)] flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleCancel}
            className="btn-secondary flex-1 py-3 px-4 rounded-2xl text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!validation.isValid || isSaving}
            onClick={handleSave}
            className={`btn-primary flex-1 py-3 px-4 rounded-2xl text-xs font-black cursor-pointer ${
              !validation.isValid || isSaving ? 'opacity-40 cursor-not-allowed shadow-none' : ''
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Split'}
          </button>
        </div>
      </div>
    </div>
  );
};
