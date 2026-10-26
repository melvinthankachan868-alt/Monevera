import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Receipt,
  Users,
  Calendar,
  Tag,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  PieChart,
  Percent,
  Hash,
  Scale,
  Sparkles,
  Camera,
} from 'lucide-react';
import { useFinTraQ } from '../../context/FinTraQContext';
import { SplitGroup, GroupExpense, SplitMethod, SplitExpensePayment, SplitParticipant } from '../../types/splitExpenses';
import { SplitSettlementEngine } from '../../services/splitSettlementEngine';
import { toDateString } from '../../utils/calculations';

interface AddGroupExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: SplitGroup;
  editingExpense?: GroupExpense | null;
}

const CATEGORIES = [
  'Accommodation',
  'Food & Dining',
  'Transport',
  'Travel',
  'Shopping',
  'Entertainment',
  'Groceries',
  'Bills & Utilities',
  'Other',
];

export const AddGroupExpenseModal: React.FC<AddGroupExpenseModalProps> = ({
  isOpen,
  onClose,
  group,
  editingExpense,
}) => {
  const { addGroupExpense, updateGroupExpense, user } = useFinTraQ();

  // Basic Info
  const [title, setTitle] = useState(editingExpense?.title || '');
  const [amountStr, setAmountStr] = useState(editingExpense ? String(editingExpense.amount) : '');
  const [date, setDate] = useState(editingExpense?.date || toDateString(new Date()));
  const [category, setCategory] = useState(editingExpense?.category || 'Food & Dining');
  const [notes, setNotes] = useState(editingExpense?.notes || '');

  // Payer Mode: 'single' vs 'multiple'
  const isMultiPayerInitial = (editingExpense?.paidBy?.length || 1) > 1;
  const [isMultiPayer, setIsMultiPayer] = useState(isMultiPayerInitial);

  // Single Payer
  const defaultPayerId = group.members.find((m) => m.isCurrentUser)?.id || group.members[0]?.id || '';
  const [singlePayerId, setSinglePayerId] = useState<string>(
    editingExpense?.paidBy?.[0]?.memberId || defaultPayerId
  );

  // Multi Payer amounts
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    group.members.forEach((m) => {
      const existing = editingExpense?.paidBy?.find((p) => p.memberId === m.id);
      map[m.id] = existing ? String(existing.amount) : '';
    });
    return map;
  });

  // Participating Members
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    if (editingExpense) return editingExpense.splitBetween;
    return group.members.filter((m) => !m.isInactive).map((m) => m.id);
  });

  // Split Method
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(editingExpense?.splitMethod || 'equal');

  // Custom Split inputs
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    group.members.forEach((m) => {
      const existing = editingExpense?.splits?.find((s) => s.memberId === m.id);
      map[m.id] = existing ? String(existing.shareAmount) : '';
    });
    return map;
  });

  const [percentages, setPercentages] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    group.members.forEach((m) => {
      const existing = editingExpense?.splits?.find((s) => s.memberId === m.id);
      map[m.id] = existing?.percentage !== undefined ? String(existing.percentage) : '';
    });
    return map;
  });

  const [shares, setShares] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    group.members.forEach((m) => {
      const existing = editingExpense?.splits?.find((s) => s.memberId === m.id);
      map[m.id] = existing?.shares !== undefined ? String(existing.shares) : '1';
    });
    return map;
  });

  const [error, setError] = useState<string | null>(null);

  // Numeric amount
  const parsedAmount = useMemo(() => {
    const val = parseFloat(amountStr);
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [amountStr]);

  // Sync / Auto-fill percentages or shares when participants change
  useEffect(() => {
    if (splitMethod === 'percentage' && selectedMemberIds.length > 0) {
      const equalPct = Math.round((100 / selectedMemberIds.length) * 100) / 100;
      setPercentages((prev) => {
        const next = { ...prev };
        selectedMemberIds.forEach((id) => {
          if (!next[id]) next[id] = String(equalPct);
        });
        return next;
      });
    }
  }, [splitMethod, selectedMemberIds]);

  if (!isOpen) return null;

  // Toggle participant
  const handleToggleParticipant = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  };

  const handleSelectAllParticipants = () => {
    setSelectedMemberIds(group.members.filter((m) => !m.isInactive).map((m) => m.id));
  };

  // Compute calculated splits based on current method
  const calculatedSplits = useMemo((): {
    splits: SplitParticipant[];
    isValid: boolean;
    validationMessage?: string;
  } => {
    if (parsedAmount <= 0 || selectedMemberIds.length === 0) {
      return { splits: [], isValid: false, validationMessage: 'Enter an expense amount' };
    }

    if (splitMethod === 'equal') {
      const splits = SplitSettlementEngine.calculateEqualSplit(parsedAmount, selectedMemberIds);
      return { splits, isValid: true };
    }

    if (splitMethod === 'exact') {
      const items = selectedMemberIds.map((id) => ({
        memberId: id,
        amount: parseFloat(exactAmounts[id] || '0') || 0,
      }));
      const res = SplitSettlementEngine.calculateExactSplit(parsedAmount, items);
      return {
        splits: res.splits,
        isValid: res.isValid,
        validationMessage: res.error,
      };
    }

    if (splitMethod === 'percentage') {
      const items = selectedMemberIds.map((id) => ({
        memberId: id,
        percentage: parseFloat(percentages[id] || '0') || 0,
      }));
      const res = SplitSettlementEngine.calculatePercentageSplit(parsedAmount, items);
      return {
        splits: res.splits,
        isValid: res.isValid,
        validationMessage: res.error,
      };
    }

    if (splitMethod === 'shares') {
      const items = selectedMemberIds.map((id) => ({
        memberId: id,
        shares: parseFloat(shares[id] || '0') || 0,
      }));
      const res = SplitSettlementEngine.calculateSharesSplit(parsedAmount, items);
      return {
        splits: res.splits,
        isValid: res.isValid,
        validationMessage: res.error,
      };
    }

    return { splits: [], isValid: false };
  }, [parsedAmount, selectedMemberIds, splitMethod, exactAmounts, percentages, shares]);

  // Payments verification
  const payerValidation = useMemo(() => {
    if (parsedAmount <= 0) return { isValid: false, paidSum: 0 };
    if (!isMultiPayer) {
      return { isValid: !!singlePayerId, paidSum: parsedAmount };
    }

    let paidSum = 0;
    const paymentsList: SplitExpensePayment[] = [];
    group.members.forEach((m) => {
      const val = parseFloat(payerAmounts[m.id] || '0') || 0;
      if (val > 0) {
        paidSum += val;
        paymentsList.push({ memberId: m.id, amount: val });
      }
    });

    const res = SplitSettlementEngine.validateExpensePayments(parsedAmount, paymentsList);
    return {
      isValid: res.isValid,
      paidSum,
      paymentsList,
      error: res.error,
    };
  }, [parsedAmount, isMultiPayer, singlePayerId, payerAmounts, group.members]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a title for this expense (e.g. Hotel, Dinner, Taxi).');
      return;
    }
    if (parsedAmount <= 0) {
      setError('Please provide a valid expense amount in ₹ INR.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setError('Please select at least 1 person to split with.');
      return;
    }

    // Validate splits
    if (!calculatedSplits.isValid) {
      setError(calculatedSplits.validationMessage || 'Split calculation does not match total amount.');
      return;
    }

    // Validate payers
    let finalPaidBy: SplitExpensePayment[] = [];
    if (!isMultiPayer) {
      if (!singlePayerId) {
        setError('Please select who paid for this expense.');
        return;
      }
      finalPaidBy = [{ memberId: singlePayerId, amount: parsedAmount }];
    } else {
      if (!payerValidation.isValid) {
        setError(payerValidation.error || 'Total amount paid by members must equal expense total.');
        return;
      }
      finalPaidBy = payerValidation.paymentsList || [];
    }

    try {
      if (editingExpense) {
        await updateGroupExpense({
          ...editingExpense,
          title: title.trim(),
          amount: parsedAmount,
          date,
          category,
          notes: notes.trim() || undefined,
          paidBy: finalPaidBy,
          splitMethod,
          splitBetween: selectedMemberIds,
          splits: calculatedSplits.splits,
        });
      } else {
        await addGroupExpense({
          groupId: group.id,
          title: title.trim(),
          amount: parsedAmount,
          date,
          category,
          notes: notes.trim() || undefined,
          paidBy: finalPaidBy,
          splitMethod,
          splitBetween: selectedMemberIds,
          splits: calculatedSplits.splits,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record group expense.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--mv-text-primary)]">
                {editingExpense ? 'Edit Group Expense' : 'Add Group Expense'}
              </h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">
                {group.name} • Safe paise accounting in ₹ INR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] rounded-full hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-2xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1.5">
                Expense Name *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hotel Stay, Dinner, Fuel"
                className="w-full px-4 py-2.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-sm font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1.5">
                Total Amount (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-black text-[var(--mv-text-muted)]">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-sm font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag size={13} />
                <span>Category</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ========================================================
              SECTION: PAID BY (Single vs Multi-Payer)
          ======================================================== */}
          <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--mv-text-primary)] uppercase tracking-wider">
                Who Paid?
              </label>
              <div className="flex items-center gap-1 bg-[var(--mv-surface)] p-1 rounded-xl border border-[var(--mv-border)] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setIsMultiPayer(false)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    !isMultiPayer
                      ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C]'
                      : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
                  }`}
                >
                  One Person
                </button>
                <button
                  type="button"
                  onClick={() => setIsMultiPayer(true)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    isMultiPayer
                      ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C]'
                      : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
                  }`}
                >
                  Multiple People
                </button>
              </div>
            </div>

            {!isMultiPayer ? (
              <div>
                <select
                  value={singlePayerId}
                  onChange={(e) => setSinglePayerId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                >
                  {group.members
                    .filter((m) => !m.isInactive)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.isCurrentUser ? '(You)' : ''}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] text-[var(--mv-text-secondary)] font-medium">
                  Enter exact amounts paid by each member. Must sum to ₹{parsedAmount.toFixed(2)}.
                </div>
                {group.members
                  .filter((m) => !m.isInactive)
                  .map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-[var(--mv-text-primary)] truncate">
                        {m.name} {m.isCurrentUser ? '(You)' : ''}
                      </span>
                      <div className="relative w-36">
                        <span className="absolute left-2.5 top-1.5 text-xs text-[var(--mv-text-muted)] font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={payerAmounts[m.id] || ''}
                          onChange={(e) =>
                            setPayerAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          className="w-full pl-6 pr-3 py-1.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                        />
                      </div>
                    </div>
                  ))}

                <div className="pt-2 flex items-center justify-between text-xs font-bold border-t border-[var(--mv-border)]">
                  <span>Total Paid:</span>
                  <span
                    className={
                      payerValidation.isValid
                        ? 'text-emerald-500'
                        : 'text-amber-500'
                    }
                  >
                    ₹{payerValidation.paidSum.toFixed(2)} / ₹{parsedAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              SECTION: SPLIT BETWEEN (Select Participants)
          ======================================================== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">
                Split Between ({selectedMemberIds.length} of {group.members.filter((m) => !m.isInactive).length})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllParticipants}
                  className="text-[11px] font-bold text-[var(--mv-primary)] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[10px] text-[var(--mv-text-muted)]">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds([])}
                  className="text-[11px] font-bold text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {group.members
                .filter((m) => !m.isInactive)
                .map((m) => {
                  const isSelected = selectedMemberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleToggleParticipant(m.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs'
                          : 'bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-black border ${
                        isSelected ? 'bg-black/20 border-transparent text-white dark:text-[#0B0D0C]' : 'border-[var(--mv-border)] text-transparent'
                      }`}>
                        ✓
                      </span>
                      <span>{m.name}</span>
                      {m.isCurrentUser && <span className="text-[10px] opacity-75">(You)</span>}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* ========================================================
              SECTION: SPLIT METHOD
          ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">
                Split Method
              </label>
              <span className="text-[11px] font-semibold text-[var(--mv-text-muted)]">
                Decimal-safe integer paise
              </span>
            </div>

            {/* Split Method Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[var(--mv-bg-secondary)] rounded-2xl border border-[var(--mv-border)] text-xs font-bold">
              <button
                type="button"
                onClick={() => setSplitMethod('equal')}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  splitMethod === 'equal'
                    ? 'bg-[var(--mv-surface)] text-[var(--mv-text-primary)] shadow-xs'
                    : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
                }`}
              >
                <Scale size={13} />
                <span>Equal</span>
              </button>
              <button
                type="button"
                onClick={() => setSplitMethod('exact')}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  splitMethod === 'exact'
                    ? 'bg-[var(--mv-surface)] text-[var(--mv-text-primary)] shadow-xs'
                    : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
                }`}
              >
                <DollarSign size={13} />
                <span>Exact</span>
              </button>
              <button
                type="button"
                onClick={() => setSplitMethod('percentage')}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  splitMethod === 'percentage'
                    ? 'bg-[var(--mv-surface)] text-[var(--mv-text-primary)] shadow-xs'
                    : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
                }`}
              >
                <Percent size={13} />
                <span>% Split</span>
              </button>
              <button
                type="button"
                onClick={() => setSplitMethod('shares')}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  splitMethod === 'shares'
                    ? 'bg-[var(--mv-surface)] text-[var(--mv-text-primary)] shadow-xs'
                    : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
                }`}
              >
                <Hash size={13} />
                <span>Shares</span>
              </button>
            </div>

            {/* Method Details & Inputs */}
            <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-2.5">
              {splitMethod === 'equal' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--mv-text-secondary)]">
                    <span>Each person pays:</span>
                    <span className="text-[var(--mv-text-primary)] text-sm">
                      {selectedMemberIds.length > 0 && parsedAmount > 0
                        ? `₹${(parsedAmount / selectedMemberIds.length).toFixed(2)}`
                        : '₹0.00'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--mv-text-muted)]">
                    {parsedAmount > 0 && (
                      <span>
                        ₹{parsedAmount.toFixed(2)} distributed equally among {selectedMemberIds.length} members with zero remainder paise loss.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {splitMethod === 'exact' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[var(--mv-text-muted)] font-medium">
                    Specify exact amount in ₹ INR for each person (must sum to ₹{parsedAmount.toFixed(2)}).
                  </div>
                  {selectedMemberIds.map((id) => {
                    const m = group.members.find((mem) => mem.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-[var(--mv-text-primary)] truncate">
                          {m?.name} {m?.isCurrentUser ? '(You)' : ''}
                        </span>
                        <div className="relative w-36">
                          <span className="absolute left-2.5 top-1.5 text-xs text-[var(--mv-text-muted)] font-bold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={exactAmounts[id] || ''}
                            onChange={(e) =>
                              setExactAmounts((prev) => ({ ...prev, [id]: e.target.value }))
                            }
                            placeholder="0.00"
                            className="w-full pl-6 pr-3 py-1.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {splitMethod === 'percentage' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[var(--mv-text-muted)] font-medium">
                    Specify % share per person (must sum to 100%).
                  </div>
                  {selectedMemberIds.map((id) => {
                    const m = group.members.find((mem) => mem.id === id);
                    const calculatedShare =
                      parsedAmount > 0
                        ? (parsedAmount * (parseFloat(percentages[id] || '0') || 0)) / 100
                        : 0;
                    return (
                      <div key={id} className="flex items-center justify-between gap-3 text-xs">
                        <div className="truncate">
                          <span className="font-bold text-[var(--mv-text-primary)]">
                            {m?.name} {m?.isCurrentUser ? '(You)' : ''}
                          </span>
                          <span className="ml-2 text-[11px] font-semibold text-[var(--mv-text-muted)]">
                            (₹{calculatedShare.toFixed(2)})
                          </span>
                        </div>
                        <div className="relative w-28">
                          <input
                            type="number"
                            step="0.01"
                            value={percentages[id] || ''}
                            onChange={(e) =>
                              setPercentages((prev) => ({ ...prev, [id]: e.target.value }))
                            }
                            placeholder="0"
                            className="w-full pr-6 pl-3 py-1.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs text-[var(--mv-text-muted)] font-bold">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {splitMethod === 'shares' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[var(--mv-text-muted)] font-medium">
                    Assign proportional share units (e.g. 1 share, 2 shares).
                  </div>
                  {selectedMemberIds.map((id) => {
                    const m = group.members.find((mem) => mem.id === id);
                    const splitObj = calculatedSplits.splits.find((s) => s.memberId === id);
                    return (
                      <div key={id} className="flex items-center justify-between gap-3 text-xs">
                        <div className="truncate">
                          <span className="font-bold text-[var(--mv-text-primary)]">
                            {m?.name} {m?.isCurrentUser ? '(You)' : ''}
                          </span>
                          {splitObj && (
                            <span className="ml-2 text-[11px] font-semibold text-[var(--mv-text-muted)]">
                              (₹{splitObj.shareAmount.toFixed(2)})
                            </span>
                          )}
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={shares[id] || ''}
                            onChange={(e) =>
                              setShares((prev) => ({ ...prev, [id]: e.target.value }))
                            }
                            placeholder="1"
                            className="w-full px-3 py-1.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] text-center"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status Indicator */}
              <div className="pt-2 flex items-center justify-between text-xs border-t border-[var(--mv-border)]">
                <span className="font-semibold text-[var(--mv-text-muted)]">Calculation Status:</span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    calculatedSplits.isValid ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {calculatedSplits.isValid ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Reconciled 100%</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={13} />
                      <span>{calculatedSplits.validationMessage || 'Incomplete'}</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via Google Pay, includes service charge"
              className="w-full px-4 py-2 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-medium text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--mv-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-md hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>{editingExpense ? 'Save Changes' : 'Confirm & Split'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
