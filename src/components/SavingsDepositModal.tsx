import React,{ useState,useEffect,useRef } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { SavingsRecord,SavingsType } from '../types';
import { toDateString } from '../utils/calculations';
import { Wallet,X,Trash2,CheckCircle2 } from 'lucide-react';

interface SavingsDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSaving?: SavingsRecord | null;
}

const SAVINGS_TYPES: SavingsType[] = [
  'Savings Account',
  'Fixed Deposit',
  'Recurring Deposit',
  'Cash Reserve',
  'Emergency Fund',
  'Other',
];

export const SavingsDepositModal: React.FC<SavingsDepositModalProps> = ({
  isOpen,
  onClose,
  editingSaving = null,
}) => {
  const { addSavings, updateSavings, deleteSavings } = useFinTraQ();

  const [accountName, setAccountName] = useState('');
  const [type, setType] = useState<SavingsType>('Savings Account');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(toDateString(new Date()));
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingSaving) {
        setAccountName(editingSaving.accountName);
        setType(editingSaving.type);
        setAmountStr(String(editingSaving.amount));
        setDate(editingSaving.date || toDateString(new Date()));
        setNote(editingSaving.note || '');
      } else {
        setAccountName('');
        setType('Savings Account');
        setAmountStr('');
        setDate(toDateString(new Date()));
        setNote('');
      }
      setErrorMsg('');
      setConfirmDelete(false);
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, editingSaving]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedAccount = accountName.trim();
    if (!trimmedAccount) {
      setErrorMsg('Please enter an account or deposit name');
      return;
    }

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a deposit amount greater than ₹ 0');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSaving) {
        await updateSavings({
          ...editingSaving,
          accountName: trimmedAccount,
          type,
          amount: Math.round(amt),
          date,
          note: note.trim() || undefined,
        });
      } else {
        await addSavings({
          accountName: trimmedAccount,
          type,
          amount: Math.round(amt),
          date,
          note: note.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save savings record:', err);
      setErrorMsg(err.message || 'Failed to save savings deposit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingSaving) return;
    setIsSubmitting(true);
    try {
      await deleteSavings(editingSaving.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete savings record');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--mv-border-subtle)] flex items-center justify-between bg-[var(--mv-surface-elevated)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--mv-green)]/15 text-[var(--mv-green)] flex items-center justify-center border border-[var(--mv-green)]/30">
              <Wallet size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">
                {editingSaving ? 'Edit Savings Record' : 'Deposit to Savings Vault'}
              </h2>
              <p className="text-[11px] text-[var(--mv-text-secondary)]">
                Capital preservation & liquid reserves • Does not register as an expense
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

          {/* Account / Vault Name */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Account / Vault Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              placeholder="e.g. HDFC High Yield Savings, Physical Cash Reserve, ICICI FD #402"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-green)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-green)] text-[var(--mv-text-primary)] transition-all"
            />
          </div>

          {/* Savings Type */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Savings Instrument / Bucket <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {SAVINGS_TYPES.map((t) => {
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 px-2 rounded-xl text-center font-bold text-[11px] border transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-[var(--mv-green)] text-[#0B0D0C] border-[var(--mv-green)] shadow-sm'
                        : 'bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] border-[var(--mv-border)] hover:border-[var(--mv-border-strong)]'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Deposit Amount (₹) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[var(--mv-text-muted)]">₹</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="25000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-black text-sm tabular-nums focus:border-[var(--mv-green)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-green)] text-[var(--mv-text-primary)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Deposit Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-green)] focus:outline-none text-[var(--mv-text-primary)]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Notes / Purpose <span className="font-normal text-[var(--mv-text-muted)]">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly salary savings surplus allocation"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-green)] focus:outline-none text-[var(--mv-text-primary)]"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[var(--mv-border-subtle)] flex items-center justify-between gap-3">
            {editingSaving ? (
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
                  <span>Delete Record</span>
                </button>
              )
            ) : (
              <span className="text-[11px] text-[var(--mv-text-muted)] flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Added to Accumulated Savings</span>
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
                className="px-5 py-2.5 bg-[var(--mv-green)] hover:brightness-110 text-[#0B0D0C] rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Wallet size={14} />
                <span>{editingSaving ? 'Update Deposit' : 'Deposit Savings'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
