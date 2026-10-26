import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { MoneyOwed, MoneyOwedType } from '../types';
import { formatINR, calculateDueDateStatus, formatDisplayDate } from '../utils/calculations';
import { MoneyOwedModal } from '../components/MoneyOwedModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  History,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
  CreditCard,
  User,
  Users,
} from 'lucide-react';

export const MoneyOwedScreen: React.FC = () => {
  const { moneyOwed, deleteMoneyOwed, moneyOwedSummary } = useFinTraQ();

  const [activeTab, setActiveTab] = useState<'all' | 'lent' | 'borrowed'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<MoneyOwedType>('lent');
  const [editingItem, setEditingItem] = useState<MoneyOwed | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const openAddModal = (type: MoneyOwedType) => {
    setEditingItem(null);
    setModalInitialType(type);
    setModalOpen(true);
  };

  const openEditModal = (item: MoneyOwed) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const toggleHistory = (id: string) => {
    setExpandedHistoryId((prev) => (prev === id ? null : id));
  };

  const filteredItems = moneyOwed.filter((item) => {
    if (activeTab === 'lent') return item.type === 'lent';
    if (activeTab === 'borrowed') return item.type === 'borrowed';
    return true;
  });

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2">
              <Users className="text-[#A8F34A]" size={28} />
              <span>Money Lent & Borrowed</span>
            </h1>
            <span className="text-[10px] font-bold text-[#F4D35E] bg-[#292212] border border-[#F4D35E]/30 px-2.5 py-0.5 rounded-full">
              Personal Transfers
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-1">
            Track personal money transfers separately from normal income & expenses.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => openAddModal('lent')}
            className="btn-primary py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>+ I Lent Money</span>
          </button>
          <button
            type="button"
            onClick={() => openAddModal('borrowed')}
            className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>+ I Borrowed</span>
          </button>
        </div>
      </div>

      {/* Money-Owed Summary Cards */}
      <div className="vault-panel rounded-3xl p-6 relative overflow-hidden space-y-5 border border-[var(--mv-border)]">
        <div className="flex items-center justify-between border-b border-[var(--mv-border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#A8F34A] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--mv-text-secondary)]">
              Outstanding Personal Transfers
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--mv-text-muted)]">
            <Info size={13} />
            <span>Tracked separately from available cash</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* TO RECEIVE */}
          <div className="p-4.5 rounded-2xl bg-[#142018] border border-[#78D64B]/20 space-y-1">
            <div className="flex items-center gap-1.5 text-[#78D64B] font-bold text-xs uppercase tracking-wider">
              <ArrowDownLeft size={16} />
              <span>TO RECEIVE</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#78D64B] tabular-nums">
              {formatINR(moneyOwedSummary.toReceiveTotal)}
            </div>
            <span className="text-[11px] text-[var(--mv-text-secondary)] block">
              {moneyOwedSummary.lentRecords.filter((m) => m.status !== 'Settled').length} pending return to you
            </span>
          </div>

          {/* TO REPAY */}
          <div className="p-4.5 rounded-2xl bg-[#1C1A14] border border-[#F4D35E]/20 space-y-1">
            <div className="flex items-center gap-1.5 text-[#F4D35E] font-bold text-xs uppercase tracking-wider">
              <ArrowUpRight size={16} />
              <span>TO REPAY</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#F4D35E] tabular-nums">
              {formatINR(moneyOwedSummary.toRepayTotal)}
            </div>
            <span className="text-[11px] text-[var(--mv-text-secondary)] block">
              {moneyOwedSummary.borrowedRecords.filter((m) => m.status !== 'Settled').length} you need to return
            </span>
          </div>

          {/* NET OUTSTANDING */}
          <div className="p-4.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-1">
            <div className="text-[var(--mv-text-secondary)] font-bold text-xs uppercase tracking-wider">
              NET OUTSTANDING
            </div>
            <div
              className={`text-2xl sm:text-3xl font-black tabular-nums ${
                moneyOwedSummary.netOutstanding >= 0 ? 'text-[var(--mv-text-primary)]' : 'text-[#FF7373]'
              }`}
            >
              {formatINR(moneyOwedSummary.netOutstanding)}
            </div>
            <span className="text-[10.5px] text-[#F4D35E]/80 block leading-tight font-medium">
              *Not spendable cash (to receive − to repay)
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex p-1 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl text-xs font-bold max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[var(--mv-surface-elevated)] text-[#A8F34A] border border-[var(--mv-border)] shadow-xs'
              : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
          }`}
        >
          All ({moneyOwed.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lent')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'lent'
              ? 'bg-[#142018] text-[#78D64B] border border-[#78D64B]/30 shadow-xs'
              : 'text-[var(--mv-text-secondary)] hover:text-[#78D64B]'
          }`}
        >
          To Receive ({moneyOwedSummary.lentRecords.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('borrowed')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'borrowed'
              ? 'bg-[#1C1A14] text-[#F4D35E] border border-[#F4D35E]/30 shadow-xs'
              : 'text-[var(--mv-text-secondary)] hover:text-[#F4D35E]'
          }`}
        >
          To Repay ({moneyOwedSummary.borrowedRecords.length})
        </button>
      </div>

      {/* List of Money Owed records */}
      {filteredItems.length === 0 ? (
        <div className="vault-panel rounded-3xl p-10 text-center border border-[var(--mv-border)] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[#A8F34A] flex items-center justify-center mx-auto">
            <Clock size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--mv-text-primary)]">No records found</h3>
            <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
              Record money you lent to friends, family, or colleagues, or money you borrowed, with exact due dates and payment tracking.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => openAddModal('lent')}
              className="btn-primary py-2 px-4 rounded-xl text-xs font-black cursor-pointer"
            >
              + I Lent Money
            </button>
            <button
              type="button"
              onClick={() => openAddModal('borrowed')}
              className="btn-secondary py-2 px-4 rounded-xl text-xs font-bold cursor-pointer"
            >
              + I Borrowed Money
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isLent = item.type === 'lent';
            const dueStatus = calculateDueDateStatus(item.dueDate);
            const isSettled = item.status === 'Settled';
            const paymentsCount = item.payments?.length || 0;
            const isExpanded = expandedHistoryId === item.id;

            // Visual Status badge
            let badgeClass = 'bg-[var(--mv-surface-elevated)] text-[var(--mv-text-secondary)] border border-[var(--mv-border)]';
            if (isSettled) {
              badgeClass = 'bg-[var(--mv-income)]/15 text-[var(--mv-income)] border border-[var(--mv-income)]/30';
            } else if (dueStatus.isOverdue) {
              badgeClass = 'bg-[var(--mv-danger)]/15 text-[var(--mv-danger)] border border-[var(--mv-danger)]/30 animate-pulse';
            } else if (dueStatus.isDueToday) {
              badgeClass = 'bg-[var(--mv-warning)]/15 text-[var(--mv-warning)] border border-[var(--mv-warning)]/30';
            } else if (dueStatus.isDueSoon) {
              badgeClass = 'bg-[var(--mv-warning)]/15 text-[var(--mv-warning)] border border-[var(--mv-warning)]/30';
            }

            const pctSettled =
              item.originalAmount > 0
                ? Math.min(100, Math.round((item.amountSettled / item.originalAmount) * 100))
                : 0;

            return (
              <div
                key={item.id}
                className="vault-panel rounded-3xl p-5 border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        isLent
                          ? 'bg-[#142018] text-[#78D64B] border border-[#78D64B]/20'
                          : 'bg-[#1C1A14] text-[#F4D35E] border border-[#F4D35E]/20'
                      }`}
                    >
                      {isLent ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-[var(--mv-text-primary)]">{item.personName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isLent
                              ? 'bg-[#142018] text-[#78D64B] border border-[#78D64B]/30'
                              : 'bg-[#1C1A14] text-[#F4D35E] border border-[#F4D35E]/30'
                          }`}
                        >
                          {isLent ? 'To receive' : 'To repay'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                          {isSettled ? 'Settled' : dueStatus.label}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--mv-text-secondary)] block mt-1">
                        {isLent ? 'Given: ' : 'Borrowed: '}
                        <strong className="text-[var(--mv-text-primary)]">{formatDisplayDate(item.dateGivenOrBorrowed)}</strong>
                        {' · '}
                        Expected Return / Due: <strong className="text-[var(--mv-text-primary)]">{formatDisplayDate(item.dueDate)}</strong>
                        {item.paymentMethod && <span> · Via {item.paymentMethod}</span>}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span
                      className={`text-lg font-black block tabular-nums ${
                        isLent ? 'text-[#78D64B]' : 'text-[#F4D35E]'
                      }`}
                    >
                      {formatINR(item.remainingAmount)} {isLent ? 'to receive' : 'to repay'}
                    </span>
                    <span className="text-xs text-[var(--mv-text-secondary)] block mt-0.5">
                      Original: {formatINR(item.originalAmount)}
                    </span>
                  </div>
                </div>

                {/* Progress / Status display for partial returns */}
                {!isSettled && (
                  <div className="vault-card p-3 rounded-2xl border border-[var(--mv-border)] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--mv-text-secondary)]">
                        {isLent ? 'Received so far:' : 'Paid so far:'}{' '}
                        <strong className="text-[var(--mv-text-primary)]">{formatINR(item.amountSettled)}</strong>
                      </span>
                      <span className="text-[var(--mv-text-primary)] font-bold tabular-nums">
                        {pctSettled}% settled · {formatINR(item.remainingAmount)} remaining
                      </span>
                    </div>
                    <div className="w-full bg-[var(--mv-bg-secondary)] h-2 rounded-full overflow-hidden border border-[var(--mv-border)]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLent ? 'bg-[#78D64B]' : 'bg-[#F4D35E]'
                        }`}
                        style={{ width: `${pctSettled}%` }}
                      />
                    </div>
                  </div>
                )}

                {item.note && (
                  <div className="text-xs text-[var(--mv-text-secondary)] italic bg-[var(--mv-bg-secondary)] p-2.5 rounded-xl border border-[var(--mv-border)]">
                    "{item.note}"
                  </div>
                )}

                {/* Payment History Accordion */}
                {isExpanded && item.payments && item.payments.length > 0 && (
                  <div className="vault-card p-3.5 rounded-2xl border border-[var(--mv-border)] space-y-2 text-xs">
                    <div className="font-bold text-[var(--mv-text-secondary)] flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <History size={13} className="text-[#64D8FF]" />
                      <span>Installment & Settlement History</span>
                    </div>
                    <div className="divide-y divide-[#252B27]">
                      {item.payments.map((p) => (
                        <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-[var(--mv-text-primary)] tabular-nums">{formatINR(p.amount)}</span>
                            <span className="text-[var(--mv-text-secondary)] ml-2">{formatDisplayDate(p.date)}</span>
                            {p.paymentMethod && (
                              <span className="text-[var(--mv-text-muted)] ml-1.5 font-medium">({p.paymentMethod})</span>
                            )}
                            {p.note && <p className="text-[11px] text-[var(--mv-text-secondary)] mt-0.5">{p.note}</p>}
                          </div>
                          <span className="text-[#78D64B] font-bold text-[11px]">Recorded</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="pt-2 flex items-center justify-between border-t border-[var(--mv-border)]">
                  <button
                    type="button"
                    onClick={() => toggleHistory(item.id)}
                    className="text-xs font-semibold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <History size={14} />
                    <span>
                      {paymentsCount > 0
                        ? `${paymentsCount} payment installment(s)`
                        : 'No payments recorded yet'}
                    </span>
                    {paymentsCount > 0 && (isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </button>

                  <div className="flex items-center gap-2">
                    {!isSettled && (
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="btn-primary py-1.5 px-3.5 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
                      >
                        Record Settlement
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteMoneyOwed(item.id)}
                      className="p-1.5 text-[var(--mv-text-muted)] hover:text-[#FF7373] transition-colors cursor-pointer"
                      title="Delete record"
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

      {/* Money Owed Modal */}
      {modalOpen && (
        <MoneyOwedModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          initialType={modalInitialType}
          editingItem={editingItem}
        />
      )}
    </div>
  );
};
