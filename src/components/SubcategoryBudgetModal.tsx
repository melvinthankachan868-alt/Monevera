import React,{ useState,useEffect } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { CategoryType,Subcategory } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatINR,calculateSubcategorySpent } from '../utils/calculations';
import { X,Check,ArrowLeft,AlertCircle } from 'lucide-react';

interface SubcategoryBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCategory?: CategoryType;
}

export const SubcategoryBudgetModal: React.FC<SubcategoryBudgetModalProps> = ({
  isOpen,
  onClose,
  targetCategory = 'Needs',
}) => {
  const { subcategories, budgets, setSubcategoryBudget, selectedMonth, expenses } = useFinTraQ();
  const [activeCategory, setActiveCategory] = useState<CategoryType>(targetCategory);
  const [editingSubcat, setEditingSubcat] = useState<string | null>(null);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setActiveCategory(targetCategory);
    setEditingSubcat(null);
    setInputAmount('');
    setInputError(null);
    setIsSaving(false);
  }, [targetCategory, isOpen]);

  if (!isOpen) return null;

  const currentSubcats = subcategories.filter((s) => s.category === activeCategory);

  const handleStartEdit = (subcat: Subcategory, currentBudget: number) => {
    setInputError(null);
    setEditingSubcat(subcat.name);
    setInputAmount(currentBudget > 0 ? String(currentBudget) : '');
  };

  const handleCancelEdit = () => {
    setEditingSubcat(null);
    setInputAmount('');
    setInputError(null);
  };

  const handleClose = () => {
    setEditingSubcat(null);
    setInputAmount('');
    setInputError(null);
    setIsSaving(false);
    onClose();
  };

  const handleSaveBudget = async (subcategoryName: string) => {
    if (isSaving) return;
    setInputError(null);

    const trimmed = inputAmount.trim();
    if (trimmed === '') {
      // Empty input treated as clearing/setting 0 budget cap
      setIsSaving(true);
      try {
        await setSubcategoryBudget(activeCategory, subcategoryName, 0, selectedMonth);
        setEditingSubcat(null);
        setInputAmount('');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const parsed = parseFloat(trimmed);
    if (isNaN(parsed) || parsed < 0) {
      setInputError('Please enter a valid amount (₹0 or greater).');
      return;
    }

    setIsSaving(true);
    try {
      await setSubcategoryBudget(activeCategory, subcategoryName, parsed, selectedMonth);
      setEditingSubcat(null);
      setInputAmount('');
    } catch (err: any) {
      setInputError(err?.message || 'Failed to save budget cap.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[var(--mv-surface)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl border border-[var(--mv-border)] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Back and Close */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={editingSubcat ? handleCancelEdit : handleClose}
              className="p-2 -ml-2 rounded-xl text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
              title={editingSubcat ? 'Cancel edit and back to list' : 'Back to budgets'}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-[var(--mv-text-primary)] tracking-tight">
                Subcategory Limits
              </h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">Budget every rupee at every level</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 -mr-2 rounded-xl text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category switcher */}
        <div className="px-6 pt-4 pb-2">
          <div className="grid grid-cols-3 p-1 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl">
            {(['Needs', 'Wants', 'Savings'] as CategoryType[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  handleCancelEdit();
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-[var(--mv-surface-elevated)] text-[var(--mv-primary)] shadow-sm border border-[var(--mv-primary)]/30'
                    : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Subcategories list */}
        <div className="p-6 overflow-y-auto space-y-3">
          {inputError && (
            <div className="p-3 bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373] text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{inputError}</span>
            </div>
          )}

          {currentSubcats.map((sub) => {
            const budgetItem = budgets.find(
              (b) =>
                b.subcategory.toLowerCase() === sub.name.toLowerCase() &&
                b.month === selectedMonth
            );
            const budgetAmount = budgetItem ? budgetItem.amount : 0;
            const spent = calculateSubcategorySpent(expenses, sub.name, activeCategory, selectedMonth);
            const remaining = budgetAmount - spent;
            const isEditing = editingSubcat === sub.name;

            return (
              <div
                key={sub.id}
                className="p-3.5 bg-[var(--mv-bg-secondary)] rounded-2xl border border-[var(--mv-border)] flex flex-col gap-2 hover:border-[var(--mv-border-strong)] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={activeCategory} name={sub.iconName} size={18} withContainer />
                    <div>
                      <span className="block text-sm font-bold text-[var(--mv-text-primary)]">{sub.name}</span>
                      <span className="block text-xs text-[var(--mv-text-secondary)] font-medium tabular-nums">
                        Spent: {formatINR(spent)}{' '}
                        {budgetAmount > 0 &&
                          `· ${
                            remaining >= 0 ? `${formatINR(remaining)} left` : `${formatINR(Math.abs(remaining))} over`
                          }`}
                      </span>
                    </div>
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(sub, budgetAmount)}
                      className="flex flex-col items-end group cursor-pointer"
                    >
                      <span className="text-xs font-bold text-[var(--mv-text-primary)] group-hover:text-[var(--mv-primary)] transition-colors tabular-nums">
                        {budgetAmount > 0 ? formatINR(budgetAmount) : 'Set limit'}
                      </span>
                      <span className="text-[10px] text-[var(--mv-text-secondary)]">Tap to edit</span>
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-2 pt-2 border-t border-[var(--mv-border)] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center bg-[var(--mv-surface)] border border-[var(--mv-primary)] rounded-xl px-2.5 py-1.5 flex-1 min-w-[120px]">
                      <span className="text-xs font-bold text-[var(--mv-text-secondary)] mr-1">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        autoFocus
                        value={inputAmount}
                        onChange={(e) => setInputAmount(e.target.value)}
                        className="w-full text-left text-xs font-bold text-[var(--mv-text-primary)] bg-transparent focus:outline-none tabular-nums"
                        placeholder="e.g. 5000"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveBudget(sub.name);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="px-3 py-1.5 rounded-xl border border-[var(--mv-border)] hover:bg-[var(--mv-surface-hover)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveBudget(sub.name)}
                        disabled={isSaving}
                        className="px-3.5 py-1.5 bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Check size={13} strokeWidth={3} />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--mv-border)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary flex-1 py-3 px-4 rounded-2xl text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="btn-primary flex-1 py-3 px-6 rounded-2xl text-xs font-black cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
