import React,{ useMemo } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { CategoryType } from '../types';
import {
formatINR,
formatMonthName,
calculateBudgetOverviewModel,
} from '../utils/calculations';
import { PieChart,AlertCircle,ChevronRight,Sliders } from 'lucide-react';

interface BudgetOverviewProps {
  onAdjustSplit?: () => void;
  onConfigureLimits?: (category: CategoryType) => void;
  className?: string;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  onAdjustSplit,
  onConfigureLimits,
  className = '',
}) => {
  const { categorySummaries, budgets, expenses, selectedMonth, monthExpenses } = useFinTraQ();

  // Month label
  const monthLabel = useMemo(
    () => formatMonthName(selectedMonth) || selectedMonth,
    [selectedMonth]
  );

  // Compute ring models: owner's own limits win, otherwise guideline, with "Your limits" / "Guideline" labels
  const { rings, noCapCategories, totalModel, hasAnyCap } = useMemo(
    () => calculateBudgetOverviewModel(categorySummaries, budgets, expenses, selectedMonth),
    [categorySummaries, budgets, expenses, selectedMonth]
  );

  // Overall progress bar percentage clamped
  const totalBarPercent = totalModel.hasRing ? totalModel.clampedPercent : 0;

  return (
    <section
      aria-label={`Budget Overview for ${monthLabel}`}
      className={`vault-panel p-5 sm:p-6 rounded-2xl border border-[var(--mv-border)] space-y-6 ${className}`}
    >
      {/* 1. Header Line */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[var(--mv-border-subtle)]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--mv-text-secondary)]">
            Monthly Spending vs Caps
          </span>
          <h2 className="text-lg sm:text-xl font-black text-[var(--mv-text-primary)] tracking-tight">
            Budget Overview, {monthLabel}
          </h2>
        </div>

        {onAdjustSplit && (
          <button
            type="button"
            onClick={onAdjustSplit}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--mv-surface-elevated)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mv-primary)] cursor-pointer"
            title="Adjust Guideline Split"
          >
            <Sliders size={13} className="text-[var(--mv-primary)]" />
            <span>Adjust Split</span>
          </button>
        )}
      </div>

      {/* 5. Honest Empty State: appears ONLY when there are neither own limits nor a guideline */}
      {!hasAnyCap ? (
        <div className="p-8 text-center rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--mv-warning)]/10 text-[var(--mv-warning)] flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--mv-text-primary)]">
              No category budgets set for {monthLabel}
            </h3>
            <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto mt-1">
              Set your monthly salary split or allocate category caps to view real-time visual progress rings.
            </p>
          </div>
          {onAdjustSplit && (
            <button
              type="button"
              onClick={onAdjustSplit}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[var(--mv-primary)] text-[var(--mv-primary-text)] hover:brightness-110 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mv-primary)] cursor-pointer"
            >
              <PieChart size={14} />
              <span>Configure Budgets</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 2. Total Row */}
          <div className="p-4 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--mv-primary)]" />
                <span className="text-xs font-bold text-[var(--mv-text-primary)] uppercase tracking-wider">
                  Total Budget Allocation
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-xl font-black text-[var(--mv-text-primary)] tabular-nums">
                  {formatINR(totalModel.spent)}
                </span>
                <span className="text-xs font-semibold text-[var(--mv-text-secondary)]">
                  of {formatINR(totalModel.cap)}
                </span>
                <span
                  className={`text-xs font-bold tabular-nums ml-1 ${
                    totalModel.isOverBudget
                      ? 'text-[var(--mv-danger)]'
                      : totalModel.percentageUsed >= 85
                      ? 'text-[var(--mv-warning)]'
                      : 'text-[var(--mv-text-secondary)]'
                  }`}
                >
                  ({totalModel.percentageUsed}%)
                </span>
              </div>
            </div>

            {/* Total Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[var(--mv-surface-elevated)] overflow-hidden border border-[var(--mv-border-subtle)]">
              <div
                style={{ width: `${totalBarPercent}%` }}
                className={`h-full rounded-full transition-all duration-500 ease-out motion-reduce:transition-none ${
                  totalModel.isOverBudget
                    ? 'bg-[var(--mv-danger)]'
                    : totalModel.percentageUsed >= 85
                    ? 'bg-[var(--mv-warning)]'
                    : 'bg-[var(--mv-primary)]'
                }`}
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <span
                className={`font-semibold tabular-nums ${
                  totalModel.isOverBudget
                    ? 'text-[var(--mv-danger)] font-bold'
                    : 'text-[var(--mv-text-secondary)]'
                }`}
              >
                {totalModel.remainingText}
              </span>
              <span className="text-[11px] text-[var(--mv-text-muted)]">
                {monthExpenses.length} transaction{monthExpenses.length === 1 ? '' : 's'} recorded
              </span>
            </div>
          </div>

          {/* 3. Circular Progress Rings Grid (Responsive: 2 on mobile, 3 on desktop) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {rings.map(({ category, model, capTypeLabel }) => {
              const radius = 36;
              const strokeWidth = 7;
              const size = 96;
              const center = size / 2;

              return (
                <div
                  key={category}
                  className="vault-card p-4 rounded-xl border border-[var(--mv-border)] flex flex-col items-center text-center justify-between space-y-3 hover:border-[var(--mv-border-strong)] transition-colors"
                >
                  {/* SVG Circular Progress Ring */}
                  <div className="relative flex items-center justify-center my-1">
                    <svg
                      width={size}
                      height={size}
                      viewBox={`0 0 ${size} ${size}`}
                      role="img"
                      aria-label={model.ariaLabel}
                      className="overflow-visible"
                    >
                      {/* Background track circle */}
                      <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="var(--mv-border)"
                        strokeWidth={strokeWidth}
                        opacity={0.7}
                      />
                      {/* Progress animated arc */}
                      <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={model.statusColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={model.circumference}
                        strokeDashoffset={model.strokeDashoffset}
                        transform={`rotate(-90 ${center} ${center})`}
                        className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
                      />
                    </svg>

                    {/* Centre text showing the real un-clamped percentage (or min(99, rounded) when spent < cap) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                      <span className="text-base sm:text-lg font-black text-[var(--mv-text-primary)] tracking-tight tabular-nums">
                        {model.percentageUsed}%
                      </span>
                    </div>
                  </div>

                  {/* Below the ring details */}
                  <div className="w-full space-y-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: model.statusColor }}
                        />
                        <h4 className="text-xs sm:text-sm font-bold text-[var(--mv-text-primary)] truncate">
                          {category}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mv-text-muted)]">
                        {capTypeLabel}
                      </span>
                    </div>

                    <div className="text-[11px] font-medium text-[var(--mv-text-secondary)] tabular-nums truncate">
                      {model.spentOfCapText}
                    </div>

                    <div
                      className={`text-xs font-bold tabular-nums truncate ${
                        model.isOverBudget
                          ? 'text-[var(--mv-danger)]'
                          : 'text-[var(--mv-text-muted)]'
                      }`}
                    >
                      {model.remainingText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 4. Compact "No cap set" line/strip for categories with spent > 0 but cap === 0 */}
      {noCapCategories.length > 0 && (
        <div className="pt-2 border-t border-[var(--mv-border-subtle)]">
          <div className="p-3 rounded-xl bg-[var(--mv-surface-elevated)]/60 border border-[var(--mv-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider shrink-0">
                No cap set:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {noCapCategories.map(({ category, spent }) => (
                  <span
                    key={category}
                    className="text-xs text-[var(--mv-text-primary)] font-semibold inline-flex items-center gap-1.5"
                  >
                    <span>{category}</span>
                    <span className="text-[var(--mv-text-muted)] font-normal tabular-nums">
                      ({formatINR(spent)} spent)
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {noCapCategories.map(({ category }) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    if (onConfigureLimits) {
                      onConfigureLimits(category);
                    } else if (onAdjustSplit) {
                      onAdjustSplit();
                    }
                  }}
                  className="text-xs font-bold text-[var(--mv-primary)] hover:text-[var(--mv-primary-hover)] inline-flex items-center gap-0.5 cursor-pointer focus-visible:outline-none focus-visible:underline"
                >
                  <span>Set {category} cap</span>
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
