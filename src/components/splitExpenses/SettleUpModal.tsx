import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle2, ShieldCheck, DollarSign, Calendar, Tag, CreditCard } from 'lucide-react';
import { useFinTraQ } from '../../context/FinTraQContext';
import { SplitGroup, SettlementRecommendation } from '../../types/splitExpenses';
import { toDateString } from '../../utils/calculations';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: SplitGroup;
  initialRecommendation?: SettlementRecommendation | null;
}

const SETTLEMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Other'];

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  group,
  initialRecommendation,
}) => {
  const { recordGroupSettlement, user } = useFinTraQ();

  const activeMembers = group.members.filter((m) => !m.isInactive);
  const defaultFrom = initialRecommendation?.fromMemberId || activeMembers[0]?.id || '';
  const defaultTo = initialRecommendation?.toMemberId || activeMembers[1]?.id || '';

  const [fromMemberId, setFromMemberId] = useState(defaultFrom);
  const [toMemberId, setToMemberId] = useState(defaultTo);
  const [amountStr, setAmountStr] = useState(initialRecommendation ? String(initialRecommendation.amount) : '');
  const [date, setDate] = useState(toDateString(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      setError('Please provide a valid settlement amount in ₹ INR.');
      return;
    }

    if (!fromMemberId || !toMemberId) {
      setError('Please specify both the payer and payee.');
      return;
    }

    if (fromMemberId === toMemberId) {
      setError('Payer and payee cannot be the same member.');
      return;
    }

    try {
      await recordGroupSettlement({
        groupId: group.id,
        fromMemberId,
        toMemberId,
        amount: val,
        date,
        paymentMethod,
        notes: notes.trim() || undefined,
        status: 'recorded',
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record settlement.');
    }
  };

  const fromMember = group.members.find((m) => m.id === fromMemberId);
  const toMember = group.members.find((m) => m.id === toMemberId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--mv-text-primary)]">Settle Up Balances</h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">Record a payment or partial settlement</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-2xl">
              {error}
            </div>
          )}

          {/* Visual Settlement Header */}
          <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-between gap-2">
            <div className="flex-1 text-center">
              <div className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider mb-1">
                Payer (Owes)
              </div>
              <div className="text-sm font-black text-[var(--mv-text-primary)] truncate">
                {fromMember?.name || 'Select'}
              </div>
            </div>

            <div className="flex flex-col items-center shrink-0 px-2 text-emerald-500">
              <ArrowRight size={18} />
              <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">Pays</span>
            </div>

            <div className="flex-1 text-center">
              <div className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider mb-1">
                Receiver (Gets)
              </div>
              <div className="text-sm font-black text-[var(--mv-text-primary)] truncate">
                {toMember?.name || 'Select'}
              </div>
            </div>
          </div>

          {/* Member Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1">
                From (Who paid)
              </label>
              <select
                value={fromMemberId}
                onChange={(e) => setFromMemberId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              >
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isCurrentUser ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1">
                To (Who received)
              </label>
              <select
                value={toMemberId}
                onChange={(e) => setToMemberId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              >
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isCurrentUser ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount (Supports Partial Settlements) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">
                Settlement Amount (₹ INR) *
              </label>
              <span className="text-[10px] font-semibold text-[var(--mv-text-muted)]">
                Partial settlements allowed
              </span>
            </div>
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
                autoFocus
              />
            </div>
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={12} />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1 flex items-center gap-1">
                <CreditCard size={12} />
                <span>Method</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              >
                {SETTLEMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1">
              Notes / Reference (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. GPay transaction ID, Cash given at airport"
              className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-medium text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
            />
          </div>

          {/* Accounting Disclosure Notice */}
          <div className="p-3 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[11px] text-[var(--mv-text-secondary)] leading-relaxed">
            💡 <strong>Money Vault Accounting Rule:</strong> Group settlement payments are balance sheet repayments and are <em>never</em> counted as taxable income.
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--mv-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              <span>Record Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
