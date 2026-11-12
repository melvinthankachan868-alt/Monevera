import React,{ useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { Loan,LoanType } from '../types';
import { formatINR,calculateDueDateStatus,formatDisplayDate,toDateString } from '../utils/calculations';
import {
CreditCard,
Plus,Trash2,X
} from 'lucide-react';

const LOAN_TYPES: LoanType[] = [
  'Vehicle loan',
  'Personal borrowing',
  'Bank loan',
  'Education loan',
  'Credit card outstanding',
  'Other liability',
];

export const LoansDebtScreen: React.FC = () => {
  const { loans, addLoan, recordLoanPayment, deleteLoan } = useFinTraQ();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<LoanType>('Vehicle loan');
  const [originalAmountStr, setOriginalAmountStr] = useState('');
  const [outstandingAmountStr, setOutstandingAmountStr] = useState('');
  const [interestRateStr, setInterestRateStr] = useState('0');
  const [emiAmountStr, setEmiAmountStr] = useState('');
  const [dueDate, setDueDate] = useState('5');
  const [nextPaymentDate, setNextPaymentDate] = useState(toDateString(new Date(Date.now() + 5 * 86400000)));
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const totalOutstanding = loans
    .filter((l) => l.status === 'Active')
    .reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);

  const totalMonthlyEmi = loans
    .filter((l) => l.status === 'Active')
    .reduce((sum, l) => sum + (l.emiAmount || 0), 0);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const orig = parseFloat(originalAmountStr);
    const out = parseFloat(outstandingAmountStr) || orig;
    const emi = parseFloat(emiAmountStr) || 0;
    const rate = parseFloat(interestRateStr) || 0;

    if (!name.trim()) {
      setErrorMsg('Please enter a name for the loan.');
      return;
    }
    if (isNaN(orig) || orig <= 0) {
      setErrorMsg('Please enter a valid original amount.');
      return;
    }

    try {
      await addLoan({
        name: name.trim(),
        type,
        originalAmount: Math.round(orig),
        outstandingAmount: Math.round(out),
        interestRate: rate,
        emiAmount: Math.round(emi),
        dueDate: dueDate || '5',
        startDate: toDateString(new Date()),
        nextPaymentDate,
        frequency: 'Monthly',
        status: 'Active',
        reminderDaysBefore: 3,
        reminderEnabled: true,
        notes: notes.trim() || undefined,
      });

      setIsAdding(false);
      setName('');
      setOriginalAmountStr('');
      setOutstandingAmountStr('');
      setInterestRateStr('0');
      setEmiAmountStr('');
      setNotes('');
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving loan.');
    }
  };

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForPayment) return;
    const amt = parseFloat(paymentAmountStr);
    if (!amt || amt <= 0) return;

    await recordLoanPayment(selectedLoanForPayment.id, amt, 'Bank Transfer', paymentNote);
    setSelectedLoanForPayment(null);
    setPaymentAmountStr('');
    setPaymentNote('');
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2">
              <CreditCard className="text-[#FF7373]" size={28} />
              <span>Loans & Debt Management</span>
            </h1>
            <span className="text-[10px] font-bold text-[#FF7373] bg-[#2D1616] border border-[#FF7373]/30 px-2.5 py-0.5 rounded-full">
              Formal Liabilities
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-1">
            Track bank loans, vehicle EMIs, education loans, and debt obligations with dynamic amortization.
          </p>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 self-start sm:self-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Loan / Debt</span>
          </button>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="vault-panel p-4.5 rounded-2xl border border-[var(--mv-border)] space-y-1">
          <span className="text-[10.5px] font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block">
            TOTAL OUTSTANDING DEBT
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#FF7373] tabular-nums">
            {formatINR(totalOutstanding)}
          </div>
          <span className="text-[11px] text-[var(--mv-text-secondary)] block font-medium">
            {loans.filter((l) => l.status === 'Active').length} active liability account(s)
          </span>
        </div>

        <div className="vault-panel p-4.5 rounded-2xl bg-[#1C1A14] border border-[#F4D35E]/20 space-y-1">
          <span className="text-[10.5px] font-bold text-[#F4D35E] uppercase tracking-wider block">
            MONTHLY EMI COMMITMENT
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#F4D35E] tabular-nums">
            {formatINR(totalMonthlyEmi)}
          </div>
          <span className="text-[11px] text-[var(--mv-text-secondary)] block font-medium">
            Recurring monthly repayments
          </span>
        </div>

        <div className="vault-panel p-4.5 rounded-2xl border border-[var(--mv-border)] space-y-1">
          <span className="text-[10.5px] font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block">
            NEXT UPCOMING PAYMENT
          </span>
          {loans.filter((l) => l.status === 'Active').length > 0 ? (
            <div>
              <div className="text-lg font-extrabold text-[var(--mv-text-primary)] truncate">
                {loans[0].name}
              </div>
              <span className="text-xs text-[#F4D35E] font-bold tabular-nums">
                {formatINR(loans[0].emiAmount)} due {formatDisplayDate(loans[0].nextPaymentDate || loans[0].dueDate)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[var(--mv-text-secondary)] block pt-1">No debts recorded.</span>
          )}
        </div>
      </div>

      {/* Add Loan Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateLoan}
          className="vault-panel rounded-3xl p-6 border border-[var(--mv-border)] shadow-xl space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-[var(--mv-border)] pb-3">
            <h2 className="text-sm font-extrabold text-[var(--mv-text-primary)] flex items-center gap-2">
              <CreditCard size={18} className="text-[#A8F34A]" />
              <span>Record Loan / Debt Obligation</span>
            </h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Loan / Debt Name</label>
              <input
                type="text"
                placeholder="e.g. Bike Loan, Home Loan, Credit Card"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Debt Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[#A8F34A]"
              >
                {LOAN_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[var(--mv-surface)] text-[var(--mv-text-primary)]">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Original Principal (₹)</label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="180000"
                value={originalAmountStr}
                onChange={(e) => setOriginalAmountStr(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-bold tabular-nums text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Outstanding Balance (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="174500"
                value={outstandingAmountStr}
                onChange={(e) => setOutstandingAmountStr(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-bold tabular-nums text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Monthly EMI (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="5500"
                value={emiAmountStr}
                onChange={(e) => setEmiAmountStr(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-bold tabular-nums text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                Interest Rate % (0% for 0% personal loans)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="0"
                value={interestRateStr}
                onChange={(e) => setInterestRateStr(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl tabular-nums text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Next Payment Date</label>
              <input
                type="date"
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-[var(--mv-text-primary)] focus:outline-none focus:border-[#A8F34A]"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Loan account #1234, 36 months tenure"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373] text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-3 px-4 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
          >
            Save Loan Account
          </button>
        </form>
      )}

      {/* Loans List */}
      {loans.length === 0 && !isAdding ? (
        <div className="vault-panel rounded-3xl p-10 text-center border border-[var(--mv-border)] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[#FF7373] flex items-center justify-center mx-auto">
            <CreditCard size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--mv-text-primary)]">No loans or debts recorded</h3>
            <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
              Add vehicle loans, personal borrowings (with 0% or positive interest), or credit card outstandings to schedule and track EMI payments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="btn-primary py-2.5 px-5 rounded-xl text-xs font-black cursor-pointer"
          >
            + Add Loan or EMI
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const dueStatus = calculateDueDateStatus(loan.nextPaymentDate || loan.dueDate);
            const isClosed = loan.status === 'Closed';

            let badgeClass = 'bg-[var(--mv-surface-elevated)] text-[var(--mv-text-secondary)] border border-[var(--mv-border)]';
            if (isClosed) {
              badgeClass = 'bg-[var(--mv-income)]/15 text-[var(--mv-income)] border border-[var(--mv-income)]/30';
            } else if (dueStatus.isOverdue) {
              badgeClass = 'bg-[var(--mv-danger)]/15 text-[var(--mv-danger)] border border-[var(--mv-danger)]/30 animate-pulse';
            } else if (dueStatus.isDueToday) {
              badgeClass = 'bg-[var(--mv-warning)]/15 text-[var(--mv-warning)] border border-[var(--mv-warning)]/30';
            } else if (dueStatus.isDueSoon) {
              badgeClass = 'bg-[var(--mv-warning)]/15 text-[var(--mv-warning)] border border-[var(--mv-warning)]/30';
            }

            const pctRepaid =
              loan.originalAmount > 0
                ? Math.min(
                    100,
                    Math.round(((loan.originalAmount - loan.outstandingAmount) / loan.originalAmount) * 100)
                  )
                : 0;

            return (
              <div
                key={loan.id}
                className="vault-panel rounded-3xl p-5 border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#1C1A14] border border-[#F4D35E]/20 text-[#F4D35E] flex items-center justify-center shrink-0">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-[var(--mv-text-primary)]">{loan.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-surface-elevated)] text-[var(--mv-text-secondary)] border border-[var(--mv-border)]">
                          {loan.type}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                          {isClosed ? 'Closed' : dueStatus.label}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--mv-text-secondary)] block mt-1">
                        Monthly EMI: <strong className="text-[var(--mv-text-primary)]">{formatINR(loan.emiAmount)}</strong>
                        {' · '}
                        Interest: <strong className="text-[var(--mv-text-secondary)]">{loan.interestRate || 0}%</strong>
                        {' · '}
                        Next Due:{' '}
                        <strong className="text-[var(--mv-text-primary)]">
                          {formatDisplayDate(loan.nextPaymentDate || loan.dueDate)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="text-lg font-black text-[#FF7373] block tabular-nums">
                      {formatINR(loan.outstandingAmount)}
                    </span>
                    <span className="text-xs text-[var(--mv-text-secondary)] block mt-0.5">
                      of {formatINR(loan.originalAmount)} original
                    </span>
                  </div>
                </div>

                {/* Repayment Progress */}
                {loan.originalAmount > 0 && (
                  <div className="vault-card p-3 rounded-2xl border border-[var(--mv-border)] space-y-2">
                    <div className="flex justify-between text-xs text-[var(--mv-text-secondary)]">
                      <span>
                        Repaid: <strong className="text-[#78D64B]">{formatINR(loan.originalAmount - loan.outstandingAmount)}</strong>
                      </span>
                      <span className="text-[var(--mv-text-primary)] font-bold tabular-nums">
                        {pctRepaid}% paid off
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--mv-bg-secondary)] overflow-hidden border border-[var(--mv-border)]">
                      <div
                        style={{ width: `${pctRepaid}%` }}
                        className="h-full bg-gradient-to-r from-[#F4D35E] to-[#78D64B] rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                )}

                {loan.notes && (
                  <p className="text-xs text-[var(--mv-text-secondary)] italic bg-[var(--mv-bg-secondary)] p-2.5 rounded-xl border border-[var(--mv-border)]">
                    "{loan.notes}"
                  </p>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-[var(--mv-border)] text-xs">
                  <span className="text-[11px] text-[var(--mv-text-muted)]">
                    Frequency: {loan.frequency}
                  </span>

                  <div className="flex items-center gap-2">
                    {!isClosed && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLoanForPayment(loan);
                          setPaymentAmountStr(String(loan.emiAmount));
                        }}
                        className="btn-primary py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                      >
                        Record Repayment
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteLoan(loan.id)}
                      className="p-1.5 text-[var(--mv-text-muted)] hover:text-[#FF7373] transition-colors cursor-pointer"
                      title="Delete loan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Repayment Modal */}
      {selectedLoanForPayment && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="vault-panel rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-[var(--mv-border)] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--mv-border)] pb-3">
              <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">
                Record Repayment on {selectedLoanForPayment.name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLoanForPayment(null)}
                className="text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[var(--mv-text-secondary)]">
              Outstanding balance:{' '}
              <strong className="text-[#FF7373]">{formatINR(selectedLoanForPayment.outstandingAmount)}</strong>
            </p>

            <form onSubmit={handleMakePayment} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Repayment Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedLoanForPayment.outstandingAmount}
                  step="any"
                  value={paymentAmountStr}
                  onChange={(e) => setPaymentAmountStr(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-bold bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl tabular-nums text-[var(--mv-text-primary)] focus:outline-none focus:border-[#A8F34A]"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. October EMI payment"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLoanForPayment(null)}
                  className="btn-secondary flex-1 py-2.5 px-3 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 py-2.5 px-3 font-black text-xs rounded-xl cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
