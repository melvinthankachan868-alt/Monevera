import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR, formatDisplayDate } from '../utils/calculations';
import { FinancialGoal, GoalCategory } from '../types';
import {
  Target,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Pencil,
} from 'lucide-react';

export const GoalsScreen: React.FC = () => {
  const {
    goals,
    deleteGoal,
    setQuickAddOpen,
    setEditingGoal,
    setContributingGoal,
  } = useFinTraQ();

  const totalTarget = goals.reduce((acc, g) => acc + (Number(g.targetAmount) || 0), 0);
  const totalCurrent = goals.reduce((acc, g) => acc + (Number(g.currentAmount) || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalCurrent);
  const overallProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[var(--mv-text-primary)] tracking-tight">Financial Milestones & Goals</h1>
            <span className="text-[11px] font-semibold text-[var(--mv-violet)] bg-[var(--mv-violet)]/15 border border-[var(--mv-violet)]/30 px-2.5 py-0.5 rounded-full">
              Future Vault
            </span>
          </div>
          <p className="text-xs text-[var(--mv-text-secondary)] mt-1">
            Target vehicles, homes, wedding funds, gadgets, and personal ambitions with automated completion tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingGoal(null);
            setQuickAddOpen(true, 'goal');
          }}
          className="px-4 py-2.5 bg-[var(--mv-violet)] hover:brightness-110 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Financial Goal</span>
        </button>
      </div>

      {/* Aggregate Progress Header */}
      <div className="vault-panel p-5 rounded-3xl relative overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-xs font-bold text-[var(--mv-violet)] uppercase tracking-wider">
              Total Goals Accumulation
            </div>
            <div className="text-2xl font-black text-[var(--mv-text-primary)] tabular-nums tracking-tight mt-1">
              {formatINR(totalCurrent)}{' '}
              <span className="text-[var(--mv-text-muted)] text-base font-semibold">
                of {formatINR(totalTarget)}
              </span>
            </div>
          </div>

          <div className="text-right sm:text-right">
            <div className="text-xs font-bold text-[var(--mv-text-muted)]">Total Remaining</div>
            <div className="text-base font-black text-[var(--mv-violet)] tabular-nums mt-0.5">
              {formatINR(totalRemaining)}
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-[var(--mv-bg-secondary)] h-3 rounded-full overflow-hidden border border-[var(--mv-border)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--mv-violet)] to-[var(--mv-cyan)] rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, overallProgress)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-xs text-[var(--mv-text-muted)] font-semibold mt-2">
          <span>{goals.length} target goals tracked</span>
          <span className="text-[var(--mv-violet)] font-bold">{overallProgress}% funded</span>
        </div>
      </div>

      {/* Goal Cards Grid */}
      {goals.length === 0 ? (
        <div className="vault-panel p-12 text-center space-y-3 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-[var(--mv-violet)]/15 border border-[var(--mv-violet)]/30 text-[var(--mv-violet)] flex items-center justify-center mx-auto">
            <Target size={24} />
          </div>
          <h3 className="text-base font-bold text-[var(--mv-text-primary)]">No Financial Goals Defined</h3>
          <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
            Set a target date and required capital for your next vehicle, vacation, wedding, or gadget to visualize progress.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingGoal(null);
              setQuickAddOpen(true, 'goal');
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--mv-violet)] hover:brightness-110 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
          >
            <Plus size={15} />
            <span>Create First Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const progress =
              goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            return (
              <div
                key={goal.id}
                className="vault-panel p-5 rounded-3xl space-y-4 hover:border-[var(--mv-violet)]/40 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--mv-violet)] bg-[var(--mv-violet)]/15 border border-[var(--mv-violet)]/30 px-2.5 py-0.5 rounded-md">
                      {goal.category}
                    </span>
                    <h3 className="text-base font-bold text-[var(--mv-text-primary)] mt-1.5">{goal.name}</h3>
                    {goal.note && <p className="text-xs text-[var(--mv-text-muted)] mt-0.5">{goal.note}</p>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isCompleted && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>Achieved</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingGoal(goal)}
                      className="p-1.5 text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] rounded-lg hover:bg-[var(--mv-bg-secondary)] transition-all cursor-pointer"
                      title="Edit goal"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.id)}
                      className="p-1.5 text-[var(--mv-text-muted)] hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete goal"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Progress Visual */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold tabular-nums">
                    <span className="text-[var(--mv-text-primary)]">{formatINR(goal.currentAmount)}</span>
                    <span className="text-[var(--mv-text-muted)]">target {formatINR(goal.targetAmount)}</span>
                  </div>

                  <div className="w-full bg-[var(--mv-bg-secondary)] h-2.5 rounded-full overflow-hidden border border-[var(--mv-border)]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-[var(--mv-violet)] to-[var(--mv-cyan)]'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-[var(--mv-text-muted)] font-semibold pt-0.5">
                    <span>{isCompleted ? 'Goal fully funded 🎉' : `${formatINR(remaining)} remaining`}</span>
                    <span className="text-[var(--mv-violet)] font-bold">{progress}%</span>
                  </div>
                </div>

                {/* Target Date & Contribute Button */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--mv-border-subtle)]">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--mv-text-secondary)]">
                    <Calendar size={13} className="text-[var(--mv-text-muted)]" />
                    <span>Target: {formatDisplayDate(goal.targetDate)}</span>
                  </div>

                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => setContributingGoal(goal)}
                      className="px-3.5 py-1.5 bg-[var(--mv-violet)]/15 hover:bg-[var(--mv-violet)]/25 text-[var(--mv-violet)] border border-[var(--mv-violet)]/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      + Contribute
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
