import React,{ useState,useEffect,useRef } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { FinancialGoal,GoalCategory } from '../types';
import { formatINR,toDateString } from '../utils/calculations';
import { Target,X,Trash2,Plus,CheckCircle2 } from 'lucide-react';

interface FinancialGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGoal?: FinancialGoal | null;
  contributingGoal?: FinancialGoal | null;
}

const GOAL_CATEGORIES: GoalCategory[] = [
  'Vehicle',
  'Home',
  'Gadget',
  'Travel',
  'Education',
  'Wedding',
  'Emergency Fund',
  'Retirement',
  'Custom',
];

export const FinancialGoalModal: React.FC<FinancialGoalModalProps> = ({
  isOpen,
  onClose,
  editingGoal = null,
  contributingGoal = null,
}) => {
  const { addGoal, updateGoal, deleteGoal } = useFinTraQ();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<GoalCategory>('Vehicle');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [currentAmountStr, setCurrentAmountStr] = useState('0');
  const [targetDate, setTargetDate] = useState(
    toDateString(new Date(Date.now() + 180 * 86400000))
  );
  const [note, setNote] = useState('');
  const [contributionAmountStr, setContributionAmountStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const isContributionMode = !!contributingGoal;

  useEffect(() => {
    if (isOpen) {
      if (contributingGoal) {
        setName(contributingGoal.name);
        setCategory(contributingGoal.category);
        setContributionAmountStr('');
      } else if (editingGoal) {
        setName(editingGoal.name);
        setCategory(editingGoal.category);
        setTargetAmountStr(String(editingGoal.targetAmount));
        setCurrentAmountStr(String(editingGoal.currentAmount || 0));
        setTargetDate(editingGoal.targetDate || toDateString(new Date(Date.now() + 180 * 86400000)));
        setNote(editingGoal.note || '');
      } else {
        setName('');
        setCategory('Vehicle');
        setTargetAmountStr('');
        setCurrentAmountStr('0');
        setTargetDate(toDateString(new Date(Date.now() + 180 * 86400000)));
        setNote('');
      }
      setErrorMsg('');
      setConfirmDelete(false);
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, editingGoal, contributingGoal]);

  if (!isOpen) return null;

  // Handle Goal Contribution
  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoal) return;
    setErrorMsg('');

    const contAmt = parseFloat(contributionAmountStr);
    if (isNaN(contAmt) || contAmt <= 0) {
      setErrorMsg('Please enter a valid contribution amount greater than ₹ 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateGoal({
        ...contributingGoal,
        currentAmount: (contributingGoal.currentAmount || 0) + Math.round(contAmt),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add / Edit Goal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Please enter a goal milestone title');
      return;
    }

    const targetAmt = parseFloat(targetAmountStr);
    if (isNaN(targetAmt) || targetAmt <= 0) {
      setErrorMsg('Please enter a target milestone amount greater than ₹ 0');
      return;
    }

    const curAmt = currentAmountStr.trim() !== '' ? parseFloat(currentAmountStr) : 0;
    if (isNaN(curAmt) || curAmt < 0) {
      setErrorMsg('Current accumulated amount must be zero or a positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingGoal) {
        await updateGoal({
          ...editingGoal,
          name: trimmedName,
          category,
          targetAmount: Math.round(targetAmt),
          currentAmount: Math.round(curAmt),
          targetDate,
          note: note.trim() || undefined,
        });
      } else {
        await addGoal({
          name: trimmedName,
          category,
          targetAmount: Math.round(targetAmt),
          currentAmount: Math.round(curAmt),
          targetDate,
          note: note.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save goal:', err);
      setErrorMsg(err.message || 'Failed to save financial goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingGoal) return;
    setIsSubmitting(true);
    try {
      await deleteGoal(editingGoal.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete goal');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--mv-border-subtle)] flex items-center justify-between bg-[var(--mv-surface-elevated)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--mv-violet)]/15 text-[var(--mv-violet)] flex items-center justify-center border border-[var(--mv-violet)]/30">
              <Target size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">
                {isContributionMode
                  ? `Contribute to ${contributingGoal.name}`
                  : editingGoal
                  ? 'Edit Financial Goal'
                  : 'New Financial Goal'}
              </h2>
              <p className="text-[11px] text-[var(--mv-text-secondary)]">
                {isContributionMode
                  ? 'Transfer capital towards this target • Zero expense inflation'
                  : 'Milestone accumulation • Target date tracking'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Contribution Mode Form */}
        {isContributionMode ? (
          <form onSubmit={handleContributeSubmit} className="p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold animate-in fade-in">
                {errorMsg}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[var(--mv-text-primary)]">{contributingGoal.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-violet)]/15 text-[var(--mv-violet)] border border-[var(--mv-violet)]/30">
                  {contributingGoal.category}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--mv-text-secondary)]">
                <span>Current: {formatINR(contributingGoal.currentAmount)}</span>
                <span>Target: {formatINR(contributingGoal.targetAmount)}</span>
              </div>
              <div className="w-full bg-[var(--mv-surface)] rounded-full h-2 overflow-hidden border border-[var(--mv-border)]">
                <div
                  className="bg-[var(--mv-violet)] h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((contributingGoal.currentAmount / (contributingGoal.targetAmount || 1)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Deposit / Contribution Amount (₹) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[var(--mv-text-muted)]">₹</span>
                <input
                  ref={inputRef}
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="5000"
                  value={contributionAmountStr}
                  onChange={(e) => setContributionAmountStr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-3 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-black text-base tabular-nums focus:border-[var(--mv-violet)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-violet)] text-[var(--mv-text-primary)]"
                />
              </div>
              <span className="text-[10px] text-[var(--mv-text-muted)] mt-1 block">
                Treated as an allocation toward your goal. Does not appear as an ordinary expense.
              </span>
            </div>

            <div className="pt-3 border-t border-[var(--mv-border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[var(--mv-violet)] hover:brightness-110 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Add Contribution</span>
              </button>
            </div>
          </form>
        ) : (
          /* Add / Edit Goal Form */
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold animate-in fade-in">
                {errorMsg}
              </div>
            )}

            {/* Goal Title */}
            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Milestone / Goal Title <span className="text-red-400">*</span>
              </label>
              <input
                ref={inputRef}
                type="text"
                required
                placeholder="e.g. New Electric Car Down Payment, MacBook Pro M4, Europe Trip"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-violet)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-violet)] text-[var(--mv-text-primary)] transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Category <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {GOAL_CATEGORIES.map((c) => {
                  const isSelected = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`py-2 px-2 rounded-xl text-center font-bold text-[11px] border transition-all cursor-pointer truncate ${
                        isSelected
                          ? 'bg-[var(--mv-violet)] text-white border-[var(--mv-violet)] shadow-sm'
                          : 'bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] border-[var(--mv-border)] hover:border-[var(--mv-border-strong)]'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Amount & Initial Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                  Target Amount (₹) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[var(--mv-text-muted)]">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="200000"
                    value={targetAmountStr}
                    onChange={(e) => setTargetAmountStr(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-black text-sm tabular-nums focus:border-[var(--mv-violet)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-violet)] text-[var(--mv-text-primary)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                  Already Saved / Initial Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[var(--mv-text-muted)]">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={currentAmountStr}
                    onChange={(e) => setCurrentAmountStr(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-black text-sm tabular-nums focus:border-[var(--mv-violet)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-violet)] text-[var(--mv-text-primary)] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Target Date */}
            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Target Completion Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-violet)] focus:outline-none text-[var(--mv-text-primary)]"
              />
            </div>

            {/* Notes / Plan */}
            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Notes & Monthly Contribution Plan <span className="font-normal text-[var(--mv-text-muted)]">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Save ₹10,000 every month from salary surplus"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-violet)] focus:outline-none text-[var(--mv-text-primary)]"
              />
            </div>

            {/* Action Footer */}
            <div className="pt-3 border-t border-[var(--mv-border-subtle)] flex items-center justify-between gap-3">
              {editingGoal ? (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleDelete}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-2 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] rounded-xl font-semibold text-xs text-[var(--mv-text-secondary)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Delete Goal</span>
                  </button>
                )
              ) : (
                <span className="text-[11px] text-[var(--mv-text-muted)] flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Tracked in Financial Milestones</span>
                </span>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[var(--mv-violet)] hover:brightness-110 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Target size={14} />
                  <span>{editingGoal ? 'Update Goal' : 'Save Goal'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
