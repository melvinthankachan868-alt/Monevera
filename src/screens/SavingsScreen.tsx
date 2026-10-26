import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR, formatDisplayDate } from '../utils/calculations';
import {
  PiggyBank,
  Plus,
  ShieldCheck,
  TrendingUp,
  Trash2,
  Wallet,
  ArrowUpRight,
  Target,
  Sparkles,
  ArrowRight,
  Pencil,
} from 'lucide-react';

export const SavingsScreen: React.FC = () => {
  const {
    savings,
    deleteSavings,
    setQuickAddOpen,
    setEditingSaving,
    monthlySummary,
    emergencyFundDetails,
    cashFlowSummary,
    goals,
    setActiveTab,
  } = useFinTraQ();

  const [filterType, setFilterType] = useState<string>('ALL');

  const savingsTypes = [
    'ALL',
    'Emergency Fund',
    'Savings Account',
    'Fixed Deposit',
    'Recurring Deposit',
    'Cash Reserve',
    'Other',
  ];

  const filteredSavings = savings.filter(
    (s) => filterType === 'ALL' || s.type === filterType
  );

  const totalAccumulatedSavings = savings.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const monthlySavingsFlow = cashFlowSummary.savings || monthlySummary.totalSavings || 0;

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[var(--mv-text-primary)] tracking-tight">Savings & Wealth Vault</h1>
            <span className="text-[11px] font-semibold text-[var(--mv-green)] bg-[var(--mv-green)]/15 border border-[var(--mv-green)]/30 px-2.5 py-0.5 rounded-full">
              Growth Plan
            </span>
          </div>
          <p className="text-xs text-[var(--mv-text-secondary)] mt-1">
            Build liquid buffers, preserve capital, and track systematic deposits towards your financial milestones.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setEditingSaving(null);
              setQuickAddOpen(true, 'savings');
            }}
            className="px-4 py-2.5 bg-[var(--mv-green)] hover:brightness-110 text-[#0B0D0C] rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Deposit Savings</span>
          </button>
        </div>
      </div>

      {/* Top 3 High-Energy Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Accumulated */}
        <div className="vault-panel p-5 rounded-3xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-[var(--mv-text-muted)] text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Recorded Savings</span>
            <PiggyBank size={18} className="text-[var(--mv-green)]" />
          </div>
          <div className="text-2xl font-black text-[var(--mv-text-primary)] tabular-nums tracking-tight">
            {formatINR(totalAccumulatedSavings)}
          </div>
          <div className="text-[11px] text-[var(--mv-text-secondary)] mt-1.5 flex items-center gap-1.5">
            <span className="text-[var(--mv-green)] font-semibold">{savings.length} deposits</span>
            <span>across accounts</span>
          </div>
        </div>

        {/* Monthly Inflow & Rate */}
        <div className="vault-panel p-5 rounded-3xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-[var(--mv-text-muted)] text-xs font-bold uppercase tracking-wider mb-2">
            <span>Monthly Inflow to Savings</span>
            <TrendingUp size={18} className="text-[var(--mv-green)]" />
          </div>
          <div className="text-2xl font-black text-[var(--mv-text-primary)] tabular-nums tracking-tight">
            {formatINR(monthlySavingsFlow)}
          </div>
          <div className="text-[11px] text-[var(--mv-text-secondary)] mt-1.5">
            {monthlySummary.savingsRate ?? 0}% of recorded monthly income
          </div>
        </div>

        {/* Emergency Fund Link Card */}
        <div className="vault-panel p-5 rounded-3xl relative overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--mv-text-muted)] text-xs font-bold uppercase tracking-wider mb-2">
              <span>Emergency Safety Net</span>
              <ShieldCheck size={18} className="text-[var(--mv-teal)]" />
            </div>
            <div className="text-2xl font-black text-[var(--mv-teal)] tabular-nums tracking-tight">
              {formatINR(emergencyFundDetails.currentAmount)}
            </div>
            <div className="text-[11px] text-[var(--mv-text-secondary)] mt-1.5">
              {emergencyFundDetails.monthsCovered} months runway ({emergencyFundDetails.progressPercentage}% of target)
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('emergency_fund')}
            className="text-[11px] text-[var(--mv-teal)] font-bold flex items-center gap-1 mt-3 hover:underline cursor-pointer"
          >
            <span>Manage Emergency Net</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Savings Ledger & Filter */}
      <div className="vault-panel rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[var(--mv-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-[var(--mv-green)]" />
            <h3 className="text-sm font-bold text-[var(--mv-text-primary)]">Recorded Deposit History</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] font-semibold">
              {filteredSavings.length}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {savingsTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === type
                    ? 'bg-[var(--mv-green)] text-[#0B0D0C] shadow-sm font-bold'
                    : 'bg-[var(--mv-bg-secondary)] text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {filteredSavings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--mv-green)]/15 border border-[var(--mv-green)]/30 text-[var(--mv-green)] flex items-center justify-center mx-auto">
              <PiggyBank size={24} />
            </div>
            <h4 className="text-sm font-bold text-[var(--mv-text-primary)]">No Savings Records Found</h4>
            <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
              {filterType === 'ALL'
                ? 'Begin securing your financial future by logging your first deposit or emergency contribution.'
                : `No deposits found under "${filterType}".`}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingSaving(null);
                setQuickAddOpen(true, 'savings');
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--mv-green)] hover:brightness-110 text-[#0B0D0C] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <Plus size={15} />
              <span>Record First Deposit</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--mv-border)]">
            {filteredSavings.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-[var(--mv-surface-hover)] transition-colors group cursor-pointer"
                onClick={() => setEditingSaving(item)}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--mv-green)]/15 border border-[var(--mv-green)]/30 text-[var(--mv-green)] flex items-center justify-center flex-shrink-0">
                    <PiggyBank size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[var(--mv-text-primary)] truncate">{item.accountName}</span>
                      <span className="text-[10px] font-semibold text-[var(--mv-green)] bg-[var(--mv-green)]/15 border border-[var(--mv-green)]/30 px-2 py-0.5 rounded-md">
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--mv-text-muted)] mt-0.5">
                      <span>{formatDisplayDate(item.date)}</span>
                      {item.note && (
                        <>
                          <span>•</span>
                          <span className="italic text-[var(--mv-text-muted)] truncate max-w-xs">{item.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-extrabold text-base text-[var(--mv-green)] tabular-nums">
                      +{formatINR(item.amount)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSaving(item);
                    }}
                    className="p-1.5 text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] rounded-lg hover:bg-[var(--mv-bg-secondary)] transition-all cursor-pointer"
                    title="Edit deposit"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavings(item.id);
                    }}
                    className="p-1.5 text-[var(--mv-text-muted)] hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
