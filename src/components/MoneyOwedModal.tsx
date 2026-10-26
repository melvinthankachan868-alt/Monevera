import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { MoneyOwed, MoneyOwedType, PaymentMethod } from '../types';
import { formatINR, toDateString } from '../utils/calculations';
import { X, User, Calendar, CreditCard, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface MoneyOwedModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: MoneyOwedType;
  editingItem?: MoneyOwed | null;
}

export const MoneyOwedModal: React.FC<MoneyOwedModalProps> = ({
  isOpen,
  onClose,
  initialType = 'lent',
  editingItem = null,
}) => {
  const { addMoneyOwed, recordMoneyOwedPayment } = useFinTraQ();

  const [type, setType] = useState<MoneyOwedType>(editingItem ? editingItem.type : initialType);
  const [personName, setPersonName] = useState(editingItem ? editingItem.personName : '');
  const [amountStr, setAmountStr] = useState(editingItem ? String(editingItem.originalAmount) : '');
  const [dateGivenOrBorrowed, setDateGivenOrBorrowed] = useState(
    editingItem ? editingItem.dateGivenOrBorrowed : toDateString(new Date())
  );
  const [dueDate, setDueDate] = useState(
    editingItem ? editingItem.dueDate : toDateString(new Date(Date.now() + 30 * 86400000))
  );
  const [description, setDescription] = useState(editingItem?.description || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editingItem?.paymentMethod || 'UPI');
  const [note, setNote] = useState(editingItem?.note || '');
  const [reminderEnabled, setReminderEnabled] = useState(editingItem ? editingItem.reminderEnabled : true);
  const [errorMsg, setErrorMsg] = useState('');

  // Payment Recording state (if editing and recording payment)
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentMethodForPay, setPaymentMethodForPay] = useState<PaymentMethod>('UPI');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    if (!personName.trim()) {
      setErrorMsg('Please enter the person’s name.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹ 0.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('Please select an expected return/due date.');
      return;
    }

    try {
      await addMoneyOwed({
        type,
        personName: personName.trim(),
        originalAmount: Math.round(amount),
        remainingAmount: Math.round(amount),
        dateGivenOrBorrowed,
        dueDate,
        description: description.trim() || undefined,
        paymentMethod,
        note: note.trim() || undefined,
        status: 'Pending',
        reminderEnabled,
        reminderDaysBefore: 3,
        updatedAt: Date.now(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error saving money owed record.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const pAmt = parseFloat(paymentAmountStr);
    if (isNaN(pAmt) || pAmt <= 0) {
      setErrorMsg('Please enter a payment amount greater than ₹ 0.');
      return;
    }
    if (pAmt > editingItem.remainingAmount) {
      setErrorMsg(`Payment amount cannot exceed remaining balance of ${formatINR(editingItem.remainingAmount)}.`);
      return;
    }

    try {
      await recordMoneyOwedPayment(editingItem.id, pAmt, paymentMethodForPay, paymentNote);
      setIsRecordingPayment(false);
      setPaymentAmountStr('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error recording payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="vault-panel rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[var(--mv-border)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                type === 'lent'
                  ? 'bg-[#142018] text-[#78D64B] border border-[#78D64B]/30'
                  : 'bg-[#1C1A14] text-[#F4D35E] border border-[#F4D35E]/30'
              }`}
            >
              {type === 'lent' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--mv-text-primary)]">
                {editingItem
                  ? isRecordingPayment
                    ? 'Record Settlement / Payment'
                    : 'Money Owed Details'
                  : type === 'lent'
                  ? 'Money I Lent (To Receive)'
                  : 'Money I Borrowed (To Repay)'}
              </h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">
                Informal personal transfer — separate from normal income/expenses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] hover:bg-[#252B27] flex items-center justify-center text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* If viewing existing record with payments */}
          {editingItem && !isRecordingPayment ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--mv-text-secondary)]">
                    {editingItem.type === 'lent' ? 'Money to receive from' : 'Money to repay to'}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      editingItem.status === 'Settled'
                        ? 'bg-[#142018] text-[#78D64B] border border-[#78D64B]/30'
                        : editingItem.status === 'Overdue'
                        ? 'bg-[#2D1616] text-[#FF7373] border border-[#FF7373]/30'
                        : 'bg-[#1C1A14] text-[#F4D35E] border border-[#F4D35E]/30'
                    }`}
                  >
                    {editingItem.status}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-[var(--mv-text-primary)]">{editingItem.personName}</h3>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--mv-border)] text-center">
                  <div>
                    <span className="text-[10px] text-[var(--mv-text-secondary)] font-bold block">Original</span>
                    <span className="text-sm font-extrabold text-[var(--mv-text-primary)] tabular-nums">
                      {formatINR(editingItem.originalAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--mv-text-secondary)] font-bold block">
                      {editingItem.type === 'lent' ? 'Received' : 'Paid'}
                    </span>
                    <span className="text-sm font-extrabold text-[#78D64B] tabular-nums">
                      {formatINR(editingItem.amountSettled || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--mv-text-secondary)] font-bold block">Remaining</span>
                    <span className="text-sm font-extrabold text-[#F4D35E] tabular-nums">
                      {formatINR(editingItem.remainingAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--mv-text-secondary)]">
                    Settlement History
                  </span>
                  {editingItem.status !== 'Settled' && (
                    <button
                      type="button"
                      onClick={() => setIsRecordingPayment(true)}
                      className="text-xs font-bold text-[#A8F34A] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Record Payment</span>
                    </button>
                  )}
                </div>

                {(!editingItem.payments || editingItem.payments.length === 0) ? (
                  <p className="text-xs text-[var(--mv-text-secondary)] p-3 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-center">
                    No installments recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#252B27] border border-[var(--mv-border)] rounded-2xl overflow-hidden">
                    {editingItem.payments.map((p) => (
                      <div key={p.id} className="p-3 bg-[var(--mv-surface)] flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[var(--mv-text-primary)] block tabular-nums">{formatINR(p.amount)}</span>
                          <span className="text-[10px] text-[var(--mv-text-secondary)]">
                            {p.date} · {p.paymentMethod || 'UPI'} {p.note && `(${p.note})`}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-[#78D64B] bg-[#142018] border border-[#78D64B]/30 px-2 py-0.5 rounded-full">
                          Recorded
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : isRecordingPayment ? (
            /* Record Payment Form */
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#1C1A14] border border-[#F4D35E]/30 text-xs text-[#F4D35E]">
                Recording settlement on <b>{editingItem?.personName}</b>. Remaining balance:{' '}
                <b>{formatINR(editingItem?.remainingAmount)}</b>.
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  max={editingItem?.remainingAmount}
                  step="any"
                  value={paymentAmountStr}
                  onChange={(e) => setPaymentAmountStr(e.target.value)}
                  placeholder={`Up to ${editingItem?.remainingAmount}`}
                  className="w-full px-3.5 py-2.5 text-base font-extrabold text-[var(--mv-text-primary)] bg-[var(--mv-bg-secondary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[#A8F34A] tabular-nums"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Payment Method</label>
                  <select
                    value={paymentMethodForPay}
                    onChange={(e) => setPaymentMethodForPay(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] font-semibold focus:outline-none focus:border-[#A8F34A]"
                  >
                    <option value="UPI" className="bg-[var(--mv-surface)]">UPI</option>
                    <option value="Bank Transfer" className="bg-[var(--mv-surface)]">Bank Transfer</option>
                    <option value="Cash" className="bg-[var(--mv-surface)]">Cash</option>
                    <option value="Credit Card" className="bg-[var(--mv-surface)]">Credit Card</option>
                    <option value="Other" className="bg-[var(--mv-surface)]">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Part 1 repaid"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373] text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecordingPayment(false)}
                  className="btn-secondary flex-1 py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 py-2.5 px-4 rounded-xl text-xs font-black cursor-pointer shadow-md"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          ) : (
            /* Create New Money Owed Form */
            <form onSubmit={handleSave} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-2">
                  Transfer Type
                </label>
                <div className="grid grid-cols-2 p-1 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setType('lent')}
                    className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      type === 'lent'
                        ? 'bg-[#142018] text-[#78D64B] border border-[#78D64B]/30 shadow-xs'
                        : 'text-[var(--mv-text-secondary)] hover:text-[#78D64B]'
                    }`}
                  >
                    <ArrowDownLeft size={14} />
                    <span>I Lent (To Receive)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('borrowed')}
                    className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      type === 'borrowed'
                        ? 'bg-[#1C1A14] text-[#F4D35E] border border-[#F4D35E]/30 shadow-xs'
                        : 'text-[var(--mv-text-secondary)] hover:text-[#F4D35E]'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    <span>I Borrowed (To Repay)</span>
                  </button>
                </div>
              </div>

              {/* Person Name */}
              <div>
                <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                  {type === 'lent' ? 'Who did you lend to?' : 'Who did you borrow from?'}
                </label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3.5 text-[var(--mv-text-muted)]" />
                  <input
                    type="text"
                    placeholder="e.g. Rahul, Arun, Anu"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[var(--mv-bg-secondary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[#A8F34A] font-semibold text-[var(--mv-text-primary)] placeholder-[#69716B]"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 10000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-extrabold text-[var(--mv-text-primary)] bg-[var(--mv-bg-secondary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[#A8F34A] tabular-nums placeholder-[#69716B]"
                  required
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                    {type === 'lent' ? 'Date Given' : 'Date Borrowed'}
                  </label>
                  <input
                    type="date"
                    value={dateGivenOrBorrowed}
                    onChange={(e) => setDateGivenOrBorrowed(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] font-semibold focus:outline-none focus:border-[#A8F34A]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                    Expected Return / Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] font-semibold focus:outline-none focus:border-[#A8F34A]"
                    required
                  />
                </div>
              </div>

              {/* Payment Method & Description */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] font-semibold focus:outline-none focus:border-[#A8F34A]"
                  >
                    <option value="UPI" className="bg-[var(--mv-surface)]">UPI</option>
                    <option value="Bank Transfer" className="bg-[var(--mv-surface)]">Bank Transfer</option>
                    <option value="Cash" className="bg-[var(--mv-surface)]">Cash</option>
                    <option value="Credit Card" className="bg-[var(--mv-surface)]">Credit Card</option>
                    <option value="Other" className="bg-[var(--mv-surface)]">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Description / Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Travel emergency, laptop repair"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]"
                  />
                </div>
              </div>

              {/* Accounting Rule Info Banner */}
              <div className="p-3 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[11px] text-[var(--mv-text-secondary)] leading-relaxed">
                <b>Accounting Note:</b> This informal loan is tracked as an outstanding transfer and will{' '}
                <b>not</b> immediately distort your normal monthly budget spending or salary income.
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373] text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-3 px-4 rounded-2xl text-xs font-black transition-all shadow-md active:scale-98 cursor-pointer"
              >
                {type === 'lent' ? 'Track Money to Receive' : 'Track Money to Repay'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
