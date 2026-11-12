import React,{ useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { ReminderType } from '../types';
import { formatINR,formatDisplayDate,toDateString } from '../utils/calculations';
import {
CalendarCheck,
Plus,
Clock,
CheckCircle2,
Trash2,
Bell,Repeat,
AlertTriangle,Pencil
} from 'lucide-react';

const REMINDER_TYPES: ReminderType[] = [
  'Bill',
  'EMI',
  'Loan Payment',
  'Insurance',
  'Subscription',
  'Rent',
  'Tax',
  'Investment',
  'Savings',
  'Rent deposit',
  'Membership',
  'Annual renewal',
  'Vehicle insurance',
  'Health insurance',
  'Other',
];

export const BillsRemindersScreen: React.FC = () => {
  const {
    reminders,
    addReminder,
    markReminderPaid,
    deleteReminder,
    bills,
    markBillPaid,
    deleteBill,
    setEditingBill,
    setBillModalOpen,
    subscriptions,
    toggleSubscriptionActive,
    deleteSubscription,
    setEditingSubscription,
    setSubscriptionModalOpen,
    upcomingObligations,
    overdueObligations,
  } = useFinTraQ();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue' | 'subscriptions' | 'bills' | 'all'>('upcoming');
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  // Reminder form
  const [title, setTitle] = useState('');
  const [remType, setRemType] = useState<ReminderType>('Bill');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState(toDateString(new Date(Date.now() + 7 * 86400000)));
  const [frequency, setFrequency] = useState<any>('Monthly');

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountStr);
    if (!title.trim() || isNaN(amt) || amt <= 0) return;
    await addReminder({
      title: title.trim(),
      type: remType,
      amount: Math.round(amt),
      dueDate,
      frequency,
      reminderEnabled: true,
      reminderDaysBefore: 3,
      notificationChannels: 'both',
      status: 'Upcoming',
    });
    setIsAddingReminder(false);
    setTitle('');
    setAmountStr('');
  };

  // Subscriptions calculations
  const monthlySubCost = subscriptions
    .filter((s) => s.isActive)
    .reduce((sum, s) => {
      if (s.frequency === 'Yearly') return sum + Math.round(s.amount / 12);
      if (s.frequency === 'Quarterly') return sum + Math.round(s.amount / 3);
      return sum + s.amount;
    }, 0);

  const annualSubCost = monthlySubCost * 12;

  return (
    <div className="space-y-5 pb-24 text-[var(--mv-text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1 pt-1">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Bills & Subscriptions
          </h1>
          <p className="text-xs text-[var(--mv-text-secondary)] font-medium">
            Never miss rent, electricity, insurance, subscription renewals or scheduled obligations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingBill(null);
              setBillModalOpen(true);
            }}
            className="py-2 px-3.5 rounded-xl bg-[var(--mv-amber)] hover:brightness-110 text-[#0B0D0C] text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Add Bill</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingSubscription(null);
              setSubscriptionModalOpen(true);
            }}
            className="py-2 px-3.5 rounded-xl bg-[var(--mv-violet)] hover:brightness-110 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Add Subscription</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddingReminder(true)}
            className="py-2 px-3.5 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] text-[var(--mv-text-primary)] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Bell size={14} />
            <span>+ Reminder</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 p-1 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-[var(--mv-surface-elevated)] text-[var(--mv-text-primary)] shadow-xs'
              : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
          }`}
        >
          Upcoming ({upcomingObligations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'overdue'
              ? 'bg-[var(--mv-surface-elevated)] text-rose-500 shadow-xs'
              : 'text-[var(--mv-text-muted)] hover:text-rose-400'
          }`}
        >
          Overdue ({overdueObligations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-[var(--mv-surface-elevated)] text-[var(--mv-text-primary)] shadow-xs'
              : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
          }`}
        >
          Subscriptions ({subscriptions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bills')}
          className={`py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'bills'
              ? 'bg-[var(--mv-surface-elevated)] text-[var(--mv-text-primary)] shadow-xs'
              : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
          }`}
        >
          Bills ({bills.length})
        </button>
      </div>

      {/* Add Reminder Inline Form */}
      {isAddingReminder && (
        <form
          onSubmit={handleSaveReminder}
          className="vault-panel rounded-3xl p-6 border border-[var(--mv-border)] shadow-md space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[var(--mv-border-subtle)]">
            <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">New Financial Reminder</h3>
            <button
              type="button"
              onClick={() => setIsAddingReminder(false)}
              className="text-xs text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Obligation Title</label>
              <input
                type="text"
                placeholder="e.g. Rent, Vehicle Insurance, School Fee"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-[var(--mv-text-primary)] focus:outline-none"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Category / Type</label>
              <select
                value={remType}
                onChange={(e) => setRemType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)]"
              >
                {REMINDER_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[var(--mv-surface)] text-[var(--mv-text-primary)]">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Amount (₹)</label>
              <input
                type="number"
                min="1"
                placeholder="5000"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-bold tabular-nums text-[var(--mv-text-primary)]"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-[var(--mv-text-primary)]"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)]"
              >
                <option value="Once" className="bg-[var(--mv-surface)]">One-time</option>
                <option value="Monthly" className="bg-[var(--mv-surface)]">Monthly</option>
                <option value="Quarterly" className="bg-[var(--mv-surface)]">Quarterly</option>
                <option value="Half-yearly" className="bg-[var(--mv-surface)]">Half-yearly</option>
                <option value="Yearly" className="bg-[var(--mv-surface)]">Yearly</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--mv-primary)] text-[#0B0D0C] text-xs font-black transition-all shadow-xs cursor-pointer"
          >
            Save Reminder
          </button>
        </form>
      )}

      {/* 1. UPCOMING PAYMENTS TAB */}
      {activeTab === 'upcoming' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--mv-text-muted)]">
              CHRONOLOGICAL OBLIGATIONS (NEXT 30 DAYS)
            </span>
            <span className="text-xs font-bold text-[var(--mv-text-secondary)] tabular-nums">
              Total: {formatINR(upcomingObligations.reduce((sum, u) => sum + u.amount, 0))}
            </span>
          </div>

          {upcomingObligations.length === 0 ? (
            <div className="vault-panel rounded-3xl p-10 text-center shadow-sm space-y-2">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
              <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">All clear for the next 30 days!</h3>
              <p className="text-xs text-[var(--mv-text-muted)]">No scheduled obligations or bills upcoming.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingObligations.map((item) => {
                let badgeColor = 'bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)]';
                if (item.diffDays === 0) badgeColor = 'bg-[var(--mv-amber)]/15 text-[var(--mv-amber)] border border-[var(--mv-amber)]/30 font-bold';
                else if (item.diffDays === 1) badgeColor = 'bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold';

                return (
                  <div
                    key={item.id}
                    className="p-4 vault-panel rounded-3xl flex items-center justify-between gap-3 hover:border-[var(--mv-border-strong)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--mv-amber)]/15 text-[var(--mv-amber)] flex items-center justify-center shrink-0">
                        <Clock size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-[var(--mv-text-primary)]">{item.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)]">
                            {item.categoryOrType}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--mv-text-muted)] block mt-0.5">
                          Due: {formatDisplayDate(item.dueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-[var(--mv-text-primary)] block tabular-nums">
                        {formatINR(item.amount)}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-0.5 ${badgeColor}`}>
                        {item.dueLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. OVERDUE PAYMENTS TAB */}
      {activeTab === 'overdue' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              <span>OVERDUE OBLIGATIONS REQUIRING ATTENTION</span>
            </span>
          </div>

          {overdueObligations.length === 0 ? (
            <div className="vault-panel rounded-3xl p-10 text-center shadow-sm space-y-2">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
              <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">No overdue obligations</h3>
              <p className="text-xs text-[var(--mv-text-muted)]">All your EMIs, bills, and borrowings are up to date.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {overdueObligations.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-3xl flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-[var(--mv-text-primary)]">{item.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
                        {item.dueLabel}
                      </span>
                    </div>
                    <span className="text-xs text-rose-400/80 block">
                      Original Due Date: {formatDisplayDate(item.dueDate)}
                    </span>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <span className="text-base font-extrabold text-rose-500 block tabular-nums">
                      {formatINR(item.amount)}
                    </span>
                    {item.sourceType === 'bill' && (
                      <button
                        type="button"
                        onClick={() => markBillPaid(item.relatedRecord.id)}
                        className="py-1 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Mark as paid
                      </button>
                    )}
                    {item.sourceType === 'reminder' && (
                      <button
                        type="button"
                        onClick={() => markReminderPaid(item.relatedRecord.id)}
                        className="py-1 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Mark as paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. SUBSCRIPTIONS TAB */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="p-4 rounded-3xl vault-panel grid grid-cols-2 gap-4 text-center sm:text-left">
            <div>
              <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider block">
                MONTHLY SUBSCRIPTION COST
              </span>
              <div className="text-2xl font-extrabold text-[var(--mv-text-primary)] tabular-nums mt-0.5">
                {formatINR(monthlySubCost)}
              </div>
              <span className="text-[11px] text-[var(--mv-text-secondary)]">
                {subscriptions.filter((s) => s.isActive).length} active service(s)
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider block">
                ANNUAL COMMITMENT
              </span>
              <div className="text-2xl font-extrabold text-[var(--mv-text-primary)] tabular-nums mt-0.5">
                {formatINR(annualSubCost)}
              </div>
              <span className="text-[11px] text-[var(--mv-text-secondary)]">Projected yearly total</span>
            </div>
          </div>

          {/* Subscriptions List */}
          {subscriptions.length === 0 ? (
            <div className="vault-panel rounded-3xl p-12 text-center space-y-3">
              <Repeat size={28} className="text-[var(--mv-violet)] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[var(--mv-text-primary)]">No Subscriptions Tracked</h3>
              <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
                Track Netflix, Spotify, gym memberships, and cloud storage renewals with proactive alerts.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingSubscription(null);
                  setSubscriptionModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--mv-violet)] hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <Plus size={15} />
                <span>Add First Subscription</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--mv-border)] vault-panel rounded-3xl overflow-hidden shadow-xs">
              {subscriptions.map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between gap-3 text-xs hover:bg-[var(--mv-surface-hover)] transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[var(--mv-text-primary)]">{s.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)]">
                        {s.frequency}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-violet)]/15 text-[var(--mv-violet)]">
                        {s.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--mv-text-muted)] block mt-0.5">
                      Next renewal: {formatDisplayDate(s.nextBillingDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-[var(--mv-text-primary)] tabular-nums">
                      {formatINR(s.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSubscriptionActive(s.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer border ${
                        s.isActive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-[var(--mv-surface-hover)] text-[var(--mv-text-secondary)] border-[var(--mv-border)]'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Paused'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSubscription(s)}
                      className="p-1.5 text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] rounded-lg hover:bg-[var(--mv-bg-secondary)] transition-all cursor-pointer"
                      title="Edit subscription"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSubscription(s.id)}
                      className="p-1.5 text-[var(--mv-text-muted)] hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete subscription"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. BILLS TAB */}
      {activeTab === 'bills' && (
        <div className="space-y-3">
          {bills.length === 0 ? (
            <div className="vault-panel rounded-3xl p-12 text-center space-y-3">
              <CalendarCheck size={28} className="text-[var(--mv-amber)] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[var(--mv-text-primary)]">No Utility Bills Recorded</h3>
              <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
                Add electricity, water, internet, or rent bills to track schedules and never incur late fees.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingBill(null);
                  setBillModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--mv-amber)] hover:brightness-110 text-[#0B0D0C] rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
              >
                <Plus size={15} />
                <span>Add First Bill</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--mv-border)] vault-panel rounded-3xl overflow-hidden shadow-xs">
              {bills.map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between gap-3 text-xs hover:bg-[var(--mv-surface-hover)] transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[var(--mv-text-primary)]">{b.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)]">
                        {b.category}
                      </span>
                      {b.recurring && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-amber)]/15 text-[var(--mv-amber)]">
                          {b.frequency || 'Monthly'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--mv-text-muted)] block mt-0.5">
                      Due: {formatDisplayDate(b.dueDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-[var(--mv-text-primary)] tabular-nums">
                      {formatINR(b.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => markBillPaid(b.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer border ${
                        b.paid
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-[var(--mv-amber)] text-[#0B0D0C] hover:brightness-110'
                      }`}
                    >
                      {b.paid ? 'Paid ✓' : 'Mark Paid'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBill(b)}
                      className="p-1.5 text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] rounded-lg hover:bg-[var(--mv-bg-secondary)] transition-all cursor-pointer"
                      title="Edit bill"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBill(b.id)}
                      className="p-1.5 text-[var(--mv-text-muted)] hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete bill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
