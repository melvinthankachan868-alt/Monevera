import React from 'react';
import { DaySpending } from '../types';
import { formatINR } from '../utils/calculations';

interface WeeklyChartProps {
  days: DaySpending[];
  onSelectDay?: (date: string) => void;
  selectedDate?: string;
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({
  days,
  onSelectDay,
  selectedDate,
}) => {
  const maxAmount = Math.max(...days.map((d) => d.amount), 500);

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-2 items-end h-40 pt-6 px-1">
        {days.map((day) => {
          const heightPercent = Math.max(Math.round((day.amount / maxAmount) * 100), 6);
          const isSelected = selectedDate === day.fullDate;
          const isToday = day.isToday;

          return (
            <button
              key={day.fullDate}
              type="button"
              onClick={() => onSelectDay && onSelectDay(day.fullDate)}
              className="flex flex-col items-center justify-end h-full group focus:outline-none transition-transform cursor-pointer"
            >
              <span className="text-[10px] font-bold text-[var(--mv-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity mb-1 tabular-nums">
                {day.amount > 0 ? formatINR(day.amount) : '₹ 0'}
              </span>
              <div className="w-full max-w-[28px] bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-t-lg relative flex items-end overflow-hidden h-28">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-lg transition-all duration-500 ease-out ${
                    day.amount === 0
                      ? 'bg-[var(--mv-surface-elevated)]'
                      : isToday
                      ? 'bg-[var(--mv-primary)] shadow-[0_0_15px_rgba(21,128,61,0.2)] dark:shadow-[0_0_15px_rgba(168,243,74,0.3)]'
                      : isSelected
                      ? 'bg-[var(--mv-income)]'
                      : 'bg-[var(--mv-primary)]/70 group-hover:bg-[var(--mv-primary)]'
                  }`}
                />
              </div>
              <div className="mt-2 text-center">
                <span
                  className={`block text-[11px] font-bold ${
                    isToday
                      ? 'text-[var(--mv-primary)]'
                      : isSelected
                      ? 'text-[var(--mv-text-primary)]'
                      : 'text-[var(--mv-text-secondary)] group-hover:text-[var(--mv-text-primary)]'
                  }`}
                >
                  {day.dayName}
                </span>
                <span
                  className={`block text-[10px] mt-0.5 tabular-nums ${
                    isToday ? 'font-bold text-[var(--mv-primary)]' : 'text-[var(--mv-text-muted)]'
                  }`}
                >
                  {day.shortDate}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
