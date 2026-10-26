import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR, toDateString, formatDisplayDate } from '../utils/calculations';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';

export const FinancialCalendarScreen: React.FC = () => {
  const {
    incomes,
    allowances,
    bonuses,
    bills,
    loans,
    moneyOwed,
    reminders,
    savings,
    investments,
    goals,
    selectedMonth,
  } = useFinTraQ();

  const [currentYear, setCurrentYear] = useState(parseInt(selectedMonth.split('-')[0], 10) || 2026);
  const [currentMonth, setCurrentMonth] = useState(parseInt(selectedMonth.split('-')[1], 10) - 1 || 8);
  const [selectedDayStr, setSelectedDayStr] = useState<string>(toDateString(new Date()));

  const monthDate = new Date(currentYear, currentMonth, 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Build events calendar map by date string YYYY-MM-DD
  const eventsByDate: Record<string, { type: 'expected' | 'due' | 'reminder' | 'goal'; title: string; amount?: number }[]> = {};

  const addEvent = (date: string, type: 'expected' | 'due' | 'reminder' | 'goal', title: string, amount?: number) => {
    if (!date) return;
    if (!eventsByDate[date]) eventsByDate[date] = [];
    eventsByDate[date].push({ type, title, amount });
  };

  // 1. 🟢 Money Expected (Salary, allowances, bonuses, money to receive)
  incomes.forEach((i) => addEvent(i.date, 'expected', `${i.source} (${i.type})`, i.amount));
  allowances.forEach((a) => addEvent(a.date, 'expected', `${a.name} Allowance`, a.amount));
  bonuses.forEach((b) => addEvent(b.date, 'expected', `${b.name} Bonus`, b.amount));
  moneyOwed
    .filter((m) => m.type === 'lent' && m.status !== 'Settled')
    .forEach((m) => addEvent(m.dueDate, 'expected', `From ${m.personName}`, m.remainingAmount));

  // 2. 🔴 Payment Due (Bills, EMIs, money to repay)
  bills
    .filter((b) => !b.paid)
    .forEach((b) => addEvent(b.dueDate, 'due', `${b.name} Bill`, b.amount));
  loans
    .filter((l) => l.status === 'Active')
    .forEach((l) => addEvent(l.nextPaymentDate || l.dueDate, 'due', `${l.name} EMI`, l.emiAmount));
  moneyOwed
    .filter((m) => m.type === 'borrowed' && m.status !== 'Settled')
    .forEach((m) => addEvent(m.dueDate, 'due', `Repay ${m.personName}`, m.remainingAmount));

  // 3. 🟡 Reminder (Subscriptions, renewals, taxes)
  reminders
    .filter((r) => r.status !== 'Paid')
    .forEach((r) => addEvent(r.dueDate, 'reminder', r.title, r.amount));

  // 4. 🟣 Goal (deadlines)
  goals.forEach((g) => addEvent(g.targetDate, 'goal', `${g.name} Deadline`, g.targetAmount));

  // Calendar grid calculations
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const selectedEvents = eventsByDate[selectedDayStr] || [];

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2">
              <CalendarIcon className="text-[var(--mv-primary)]" size={28} />
              <span>Financial Event Calendar</span>
            </h1>
            <span className="text-[10px] font-bold text-[var(--mv-primary)] bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 px-2.5 py-0.5 rounded-full">
              Timeline Grid
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-1">
            Visualize income inflows, debt EMIs, bills, and deadlines on a chronological calendar.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="p-3.5 vault-panel rounded-2xl border border-[var(--mv-border)] flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[var(--mv-text-secondary)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#78D64B]" />
          <span className="text-[var(--mv-text-primary)]">Inflow Expected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF7373]" />
          <span className="text-[var(--mv-text-primary)]">Payment Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F4D35E]" />
          <span className="text-[var(--mv-text-primary)]">Reminder</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C084FC]" />
          <span className="text-[var(--mv-text-primary)]">Goal Deadline</span>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="vault-panel rounded-3xl p-5 sm:p-6 border border-[var(--mv-border)] space-y-4">
        {/* Month Stepper */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[var(--mv-text-primary)] tracking-tight">{monthName}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)] transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)] transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {daysArray.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} className="h-16 rounded-xl bg-[var(--mv-bg-secondary)]/40 border border-transparent" />;
            }

            const dayString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
              dayNum
            ).padStart(2, '0')}`;
            const events = eventsByDate[dayString] || [];
            const isSelected = selectedDayStr === dayString;
            const isToday = toDateString(new Date()) === dayString;

            return (
              <div
                key={dayString}
                onClick={() => setSelectedDayStr(dayString)}
                className={`h-16 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[var(--mv-primary)] bg-[var(--mv-primary)]/15 shadow-sm'
                    : isToday
                    ? 'border-[var(--mv-border-strong)] bg-[var(--mv-surface-elevated)]'
                    : 'border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] hover:bg-[var(--mv-surface)] hover:border-[var(--mv-border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold ${
                      isSelected
                        ? 'text-[var(--mv-primary)]'
                        : isToday
                        ? 'text-[var(--mv-text-primary)] underline'
                        : 'text-[var(--mv-text-secondary)]'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {events.length > 0 && (
                    <span className="text-[9px] font-black text-[var(--mv-text-secondary)]">
                      {events.length}
                    </span>
                  )}
                </div>

                {/* Event color dot markers */}
                <div className="flex items-center gap-1 flex-wrap">
                  {events.slice(0, 4).map((ev, i) => {
                    let dotColor = 'bg-[var(--mv-text-muted)]';
                    if (ev.type === 'expected') dotColor = 'bg-[var(--mv-income)]';
                    if (ev.type === 'due') dotColor = 'bg-[var(--mv-danger)]';
                    if (ev.type === 'reminder') dotColor = 'bg-[var(--mv-warning)]';
                    if (ev.type === 'goal') dotColor = 'bg-[var(--mv-violet)]';
                    return <span key={i} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Detail */}
      <div className="vault-panel rounded-3xl p-5 sm:p-6 border border-[var(--mv-border)] space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--mv-border)] pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-[var(--mv-primary)]" />
            <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">
              Agenda for {formatDisplayDate(selectedDayStr)}
            </h3>
          </div>
          <span className="text-xs font-bold text-[var(--mv-text-secondary)]">
            {selectedEvents.length} event(s)
          </span>
        </div>

        {selectedEvents.length === 0 ? (
          <p className="text-xs text-[var(--mv-text-secondary)] p-6 text-center">
            No payments, reminders, or goals scheduled for this date.
          </p>
        ) : (
          <div className="space-y-2.5">
            {selectedEvents.map((ev, i) => {
              let dotBg = 'bg-[var(--mv-bg-secondary)] border-[var(--mv-border)] text-[var(--mv-text-primary)]';
              if (ev.type === 'expected') dotBg = 'bg-[var(--mv-income)]/15 text-[var(--mv-income)] border border-[var(--mv-income)]/30';
              if (ev.type === 'due') dotBg = 'bg-[var(--mv-danger)]/15 text-[var(--mv-danger)] border border-[var(--mv-danger)]/30';
              if (ev.type === 'reminder') dotBg = 'bg-[var(--mv-warning)]/15 text-[var(--mv-warning)] border border-[var(--mv-warning)]/30';
              if (ev.type === 'goal') dotBg = 'bg-[var(--mv-violet)]/15 text-[var(--mv-violet)] border border-[var(--mv-violet)]/30';

              return (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold ${dotBg}`}
                >
                  <span>{ev.title}</span>
                  {ev.amount !== undefined && (
                    <span className="tabular-nums font-black">{formatINR(ev.amount)}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
