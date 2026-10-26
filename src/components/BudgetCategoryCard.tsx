import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { CategorySummary, CategoryType } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatINR, calculateSubcategorySpent, calculateBudgetStatus } from '../utils/calculations';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';

interface BudgetCategoryCardProps {
  summary: CategorySummary;
  onConfigureLimits: (category: CategoryType) => void;
  defaultExpanded?: boolean;
}

export const BudgetCategoryCard: React.FC<BudgetCategoryCardProps> = ({
  summary,
  onConfigureLimits,
  defaultExpanded = false,
}) => {
  const { subcategories, budgets, selectedMonth, expenses } = useFinTraQ();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const relevantSubcategories = subcategories.filter((s) => s.category === summary.category);
  const categoryBudgets = budgets.filter(
    (b) => b.category === summary.category && b.month === selectedMonth && b.amount > 0
  );

  const remaining = summary.remaining;
  const isOver = summary.isOverBudget;
  const barPercent = Math.min(Math.max(summary.percentageUsed, 0), 100);

  let barColor = 'bg-[#64D8FF]';
  if (summary.category === 'Wants') barColor = 'bg-[#FFB84D]';
  if (summary.category === 'Savings') barColor = 'bg-[#78D64B]';
  if (isOver) barColor = 'bg-[#FF7373]';

  return (
    <div className="vault-panel rounded-3xl p-5 border border-[var(--mv-border)] transition-all hover:border-[var(--mv-border-strong)]">
      {/* Category Card Header */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <CategoryIcon category={summary.category} withContainer size={20} />
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-[var(--mv-text-primary)]">{summary.category}</span>
            {isExpanded ? (
              <ChevronUp size={16} className="text-[var(--mv-text-secondary)]" />
            ) : (
              <ChevronDown size={16} className="text-[var(--mv-text-secondary)]" />
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-base font-black text-[var(--mv-text-primary)] tabular-nums">
              {isOver ? formatINR(Math.abs(remaining)) : formatINR(remaining)}
            </span>
            <span
              className={`text-xs font-bold ${
                isOver ? 'text-[#FF7373]' : 'text-[var(--mv-text-secondary)]'
              }`}
            >
              {isOver ? 'over' : `${summary.percentage}%`}
            </span>
          </div>
          <span className="text-[11px] font-medium text-[var(--mv-text-secondary)] block tabular-nums">
            {isOver
              ? `over budget of ${formatINR(summary.budget)}`
              : `left of ${formatINR(summary.budget)}`}
          </span>
        </div>
      </div>

      {/* Main Category Progress Bar */}
      <div className="mt-3.5 h-2 rounded-full bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] overflow-hidden relative">
        <div
          style={{ width: `${barPercent}%` }}
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
        />
      </div>

      {/* Expanded Subcategories Breakdown */}
      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-[var(--mv-border)] space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--mv-text-secondary)]">
              Subcategory limits
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConfigureLimits(summary.category);
              }}
              className="text-xs font-bold text-[#A8F34A] hover:text-[#B8FF62] flex items-center gap-1 cursor-pointer"
            >
              <Settings2 size={13} />
              <span>Edit limits</span>
            </button>
          </div>

          {relevantSubcategories
            .map((sub) => {
              const budgetItem = categoryBudgets.find(
                (b) => b.subcategory.toLowerCase() === sub.name.toLowerCase()
              );
              const budgetAmount = budgetItem ? budgetItem.amount : 0;
              const spent = calculateSubcategorySpent(
                expenses,
                sub.name,
                summary.category,
                selectedMonth
              );
              const status = calculateBudgetStatus(budgetAmount, spent);
              return { sub, budgetAmount, spent, status };
            })
            .filter((item) => item.budgetAmount > 0 || item.spent > 0)
            .map(({ sub, budgetAmount, spent, status }) => {
              const subPercent =
                budgetAmount > 0 ? Math.min(Math.round((spent / budgetAmount) * 100), 100) : spent > 0 ? 100 : 0;
              return (
                <div key={sub.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--mv-text-primary)]">{sub.name}</span>
                    <div className="text-right">
                      {budgetAmount > 0 ? (
                        <span className="font-bold text-[var(--mv-text-primary)] tabular-nums">
                          {status.isOverBudget
                            ? `${formatINR(status.overAmount)} over budget`
                            : `${formatINR(status.remaining)} left of ${formatINR(budgetAmount)}`}
                        </span>
                      ) : (
                        <span className="font-medium text-[var(--mv-text-secondary)] tabular-nums">
                          {formatINR(spent)} spent (no limit)
                        </span>
                      )}
                    </div>
                  </div>
                  {budgetAmount > 0 && (
                    <div className="h-1.5 rounded-full bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] overflow-hidden">
                      <div
                        style={{ width: `${subPercent}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          status.isOverBudget ? 'bg-[#FF7373]' : barColor
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          {categoryBudgets.length === 0 && (
            <div className="py-2 text-center">
              <p className="text-xs text-[var(--mv-text-secondary)]">No subcategory limits configured yet.</p>
              <button
                type="button"
                onClick={() => onConfigureLimits(summary.category)}
                className="mt-1.5 text-xs font-bold text-[#A8F34A] hover:text-[#B8FF62] cursor-pointer"
              >
                + Set limits for {summary.category}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
