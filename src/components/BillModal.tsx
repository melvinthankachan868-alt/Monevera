import React, { useState, useEffect, useRef } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { Bill, BillCategory, RecurringFrequency, PaymentMethod } from '../types';
import { formatINR, toDateString } from '../utils/calculations';
import { CalendarCheck, X, Trash2, Calendar, CheckCircle2, Repeat, Bell, CreditCard } from 'lucide-react';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBill?: Bill | null;
}

const BILL_CATEGORIES: BillCategory[] = [
  'Electricity',
  'Water',
  'Internet',
  'Mobile',
  'Rent',
  'Insurance',
  'Credit card',
  'Education',
  'Tax',
  'Other',
];

const FREQUENCIES: RecurringFrequency[] = [
  'Monthly',
  'Quarterly',
  'Half-yearly',
  'Yearly',
  'Weekly',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'Cash',
  'Other',
];

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  editingBill = null,
}) => {
  const { addBill, updateBill, deleteBill } = useFinTraQ();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<BillCategory>('Internet');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState(toDateString(new Date(Date.now() + 7 * 86400000)));
  const [paid, setPaid] = useState(false);
  const [recurring, setRecurring] = useState(true);
  const [frequency, setFrequency] = useState<RecurringFrequency>('Monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingBill) {
        setName(editingBill.name);
        setCategory(editingBill.category);
        setAmountStr(String(editingBill.amount));
        setDueDate(editingBill.dueDate || toDateString(new Date(Date.now() + 7 * 86400000)));
        setPaid(!!editingBill.paid);
        setRecurring(editingBill.recurring !== false);
        setFrequency(editingBill.frequency || 'Monthly');
        setPaymentMethod(editingBill.paymentMethod || 'UPI');
        setReminderEnabled(editingBill.reminderEnabled !== false);
        setNote(editingBill.note || '');
      } else {
        setName('');
        setCategory('Internet');
        setAmountStr('');
        setDueDate(toDateString(new Date(Date.now() + 7 * 86400000)));
        setPaid(false);
        setRecurring(true);
        setFrequency('Monthly');
        setPaymentMethod('UPI');
        setReminderEnabled(true);
        setNote('');
      }
      setErrorMsg('');
      setConfirmDelete(false);
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, editingBill]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Please enter a bill or utility name');
      return;
    }

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid bill amount greater than ₹ 0');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBill) {
        await updateBill({
          ...editingBill,
          name: trimmedName,
          category,
          amount: Math.round(amt),
          dueDate,
          paid,
          recurring,
          frequency: recurring ? frequency : undefined,
          paymentMethod: paid ? paymentMethod : undefined,
          paymentDate: paid ? (editingBill.paymentDate || toDateString(new Date())) : undefined,
          reminderEnabled,
          note: note.trim() || undefined,
        });
      } else {
        await addBill({
          name: trimmedName,
          category,
          amount: Math.round(amt),
          dueDate,
          paid,
          recurring,
          frequency: recurring ? frequency : undefined,
          paymentMethod: paid ? paymentMethod : undefined,
          paymentDate: paid ? toDateString(new Date()) : undefined,
          reminderEnabled,
          note: note.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      setErrorMsg(err.message || 'Failed to save bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBill) return;
    setIsSubmitting(true);
    try {
      await deleteBill(editingBill.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete bill');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--mv-border-subtle)] flex items-center justify-between bg-[var(--mv-surface-elevated)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--mv-amber)]/15 text-[var(--mv-amber)] flex items-center justify-center border border-[var(--mv-amber)]/30">
              <CalendarCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">
                {editingBill ? 'Edit Scheduled Bill' : 'Add Scheduled Bill'}
              </h2>
              <p className="text-[11px] text-[var(--mv-text-secondary)]">
                Recurring utilities & scheduled commitments • Proactive due date tracking
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {/* Bill Name */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Bill / Obligation Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              placeholder="e.g. BESCOM Electricity, Airtel Fiber 1Gbps, House Rent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-amber)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-amber)] text-[var(--mv-text-primary)] transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Bill Category <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {BILL_CATEGORIES.map((c) => {
                const isSelected = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`py-2 px-2 rounded-xl text-center font-bold text-[11px] border transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-[var(--mv-amber)] text-[#0B0D0C] border-[var(--mv-amber)] shadow-sm'
                        : 'bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] border-[var(--mv-border)] hover:border-[var(--mv-border-strong)]'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Bill Amount (₹) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[var(--mv-text-muted)]">₹</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="1499"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-black text-sm tabular-nums focus:border-[var(--mv-amber)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-amber)] text-[var(--mv-text-primary)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Next Due Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-amber)] focus:outline-none text-[var(--mv-text-primary)]"
              />
            </div>
          </div>

          {/* Recurrence & Frequency */}
          <div className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[var(--mv-text-primary)] block">Recurring Obligation</span>
                <span className="text-[10px] text-[var(--mv-text-muted)]">Automatically schedules the next cycle when marked paid</span>
              </div>
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--mv-amber)] focus:ring-[var(--mv-amber)] accent-[var(--mv-amber)] cursor-pointer"
              />
            </div>

            {recurring && (
              <div>
                <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">Frequency</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {FREQUENCIES.map((f) => {
                    const isSelected = frequency === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFrequency(f)}
                        className={`py-1.5 px-2 rounded-xl text-center font-bold text-[10px] border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--mv-surface-elevated)] text-[var(--mv-text-primary)] border-[var(--mv-amber)] shadow-sm'
                            : 'bg-[var(--mv-surface)] text-[var(--mv-text-muted)] border-[var(--mv-border)]'
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Payment Status Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)]">
            <div>
              <span className="font-bold text-[var(--mv-text-primary)] block">Payment Status</span>
              <span className="text-[10px] text-[var(--mv-text-muted)]">
                {paid ? 'Marked as Paid for this billing cycle' : 'Unpaid • Due on scheduled date'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPaid(!paid)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                paid
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-[var(--mv-amber)]/15 text-[var(--mv-amber)] border-[var(--mv-amber)]/30'
              }`}
            >
              {paid ? 'Paid ✓' : 'Unpaid'}
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Notes / Account Number <span className="font-normal text-[var(--mv-text-muted)]">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Consumer ID #98765432, Auto-debit active"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-amber)] focus:outline-none text-[var(--mv-text-primary)]"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[var(--mv-border-subtle)] flex items-center justify-between gap-3">
            {editingBill ? (
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
                  <span>Delete Bill</span>
                </button>
              )
            ) : (
              <span className="text-[11px] text-[var(--mv-text-muted)] flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Tracked in Bills & Due Calendar</span>
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
                className="px-5 py-2.5 bg-[var(--mv-amber)] hover:brightness-110 text-[#0B0D0C] rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CalendarCheck size={14} />
                <span>{editingBill ? 'Update Bill' : 'Save Bill'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
