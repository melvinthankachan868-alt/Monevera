import React,{ useState,useEffect,useRef } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { Subscription,PaymentMethod } from '../types';
import { toDateString } from '../utils/calculations';
import { Repeat,X,Trash2,CheckCircle2 } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSubscription?: Subscription | null;
}

const CATEGORIES = [
  'Entertainment',
  'Music',
  'Software',
  'Cloud & Storage',
  'Fitness & Gym',
  'News & Books',
  'Delivery & Food',
  'Productivity',
  'Other',
];

const FREQUENCIES: Array<'Monthly' | 'Quarterly' | 'Yearly'> = [
  'Monthly',
  'Quarterly',
  'Yearly',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'Other',
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  editingSubscription = null,
}) => {
  const { addSubscription, updateSubscription, deleteSubscription } = useFinTraQ();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [amountStr, setAmountStr] = useState('');
  const [frequency, setFrequency] = useState<'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [nextBillingDate, setNextBillingDate] = useState(
    toDateString(new Date(Date.now() + 14 * 86400000))
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [isActive, setIsActive] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingSubscription) {
        setName(editingSubscription.name);
        setCategory(editingSubscription.category || 'Entertainment');
        setAmountStr(String(editingSubscription.amount));
        setFrequency(editingSubscription.frequency || 'Monthly');
        setNextBillingDate(
          editingSubscription.nextBillingDate || toDateString(new Date(Date.now() + 14 * 86400000))
        );
        setPaymentMethod(editingSubscription.paymentMethod || 'Credit Card');
        setIsActive(editingSubscription.isActive !== false);
        setReminderEnabled(editingSubscription.reminderEnabled !== false);
        setReminderDaysBefore(editingSubscription.reminderDaysBefore || 3);
        setNote(editingSubscription.note || '');
      } else {
        setName('');
        setCategory('Entertainment');
        setAmountStr('');
        setFrequency('Monthly');
        setNextBillingDate(toDateString(new Date(Date.now() + 14 * 86400000)));
        setPaymentMethod('Credit Card');
        setIsActive(true);
        setReminderEnabled(true);
        setReminderDaysBefore(3);
        setNote('');
      }
      setErrorMsg('');
      setConfirmDelete(false);
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, editingSubscription]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Please enter a service name');
      return;
    }

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a subscription fee greater than ₹ 0');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSubscription) {
        await updateSubscription({
          ...editingSubscription,
          name: trimmedName,
          category,
          amount: Math.round(amt),
          frequency,
          nextBillingDate,
          paymentMethod,
          isActive,
          reminderEnabled,
          reminderDaysBefore,
          note: note.trim() || undefined,
        });
      } else {
        await addSubscription({
          name: trimmedName,
          category,
          amount: Math.round(amt),
          frequency,
          nextBillingDate,
          paymentMethod,
          isActive,
          reminderEnabled,
          reminderDaysBefore,
          note: note.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save subscription:', err);
      setErrorMsg(err.message || 'Failed to save subscription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingSubscription) return;
    setIsSubmitting(true);
    try {
      await deleteSubscription(editingSubscription.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete subscription');
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
              <Repeat size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">
                {editingSubscription ? 'Edit Subscription' : 'Add Subscription'}
              </h2>
              <p className="text-[11px] text-[var(--mv-text-secondary)]">
                Recurring digital memberships & services • Renewal notifications
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

          {/* Service Name */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Service / Membership Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              placeholder="e.g. Netflix Premium 4K, Spotify Family, Cult.fit Gym, AWS Cloud"
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
              {CATEGORIES.map((c) => {
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

          {/* Amount & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Fee / Amount (₹) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[var(--mv-text-muted)]">₹</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="649"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-black text-sm tabular-nums focus:border-[var(--mv-violet)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-violet)] text-[var(--mv-text-primary)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Billing Cycle <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1">
                {FREQUENCIES.map((f) => {
                  const isSelected = frequency === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={`py-2 px-1 rounded-xl text-center font-bold text-[11px] border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--mv-surface-elevated)] text-[var(--mv-text-primary)] border-[var(--mv-violet)] shadow-sm'
                          : 'bg-[var(--mv-bg-secondary)] text-[var(--mv-text-muted)] border-[var(--mv-border)]'
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Next Billing Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Next Billing Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-violet)] focus:outline-none text-[var(--mv-text-primary)]"
              />
            </div>

            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)] focus:border-[var(--mv-violet)] focus:outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m} className="bg-[var(--mv-surface)] text-[var(--mv-text-primary)]">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Status & Renewal Reminder */}
          <div className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[var(--mv-text-primary)] block">Subscription Status</span>
                <span className="text-[10px] text-[var(--mv-text-muted)]">
                  {isActive ? 'Active subscription • Included in monthly cost' : 'Paused / Cancelled'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                }`}
              >
                {isActive ? 'Active' : 'Paused'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--mv-border-subtle)]">
              <div>
                <span className="font-bold text-[var(--mv-text-primary)] block">Renewal Reminder</span>
                <span className="text-[10px] text-[var(--mv-text-muted)]">
                  Alert me {reminderDaysBefore} day(s) before next renewal date
                </span>
              </div>
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--mv-violet)] focus:ring-[var(--mv-violet)] accent-[var(--mv-violet)] cursor-pointer"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Notes <span className="font-normal text-[var(--mv-text-muted)]">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Shared with 4 family members, renewal auto-renews via credit card"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-violet)] focus:outline-none text-[var(--mv-text-primary)]"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[var(--mv-border-subtle)] flex items-center justify-between gap-3">
            {editingSubscription ? (
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
                  <span>Delete Subscription</span>
                </button>
              )
            ) : (
              <span className="text-[11px] text-[var(--mv-text-muted)] flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Tracked in Subscriptions list</span>
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
                <Repeat size={14} />
                <span>{editingSubscription ? 'Update Subscription' : 'Save Subscription'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
