import React, { useState, useMemo } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR, formatDisplayDate } from '../utils/calculations';
import { Investment, InvestmentType } from '../types';
import {
  TrendingUp,
  Plus,
  Trash2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  Layers,
  Sparkles,
  DollarSign,
  Pencil,
  Compass,
} from 'lucide-react';

export const InvestmentsScreen: React.FC = () => {
  const {
    setActiveTab,
    investments,
    deleteInvestment,
    setQuickAddOpen,
    setEditingInvestment,
    investmentsSummary,
  } = useFinTraQ();
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const assetTypes = [
    'ALL',
    'Mutual Funds',
    'Stocks',
    'ETFs',
    'Fixed Deposits',
    'Gold',
    'Bonds',
    'PPF',
    'NPS',
    'Crypto',
    'Real Estate',
    'Other',
  ];

  const filteredInvestments = investments.filter(
    (inv) => selectedType === 'ALL' || inv.type === selectedType
  );

  // Allocation breakdown by type
  const allocationByType = useMemo(() => {
    const map: Record<string, number> = {};
    investments.forEach((inv) => {
      const val = Number(inv.currentValue || inv.amountInvested) || 0;
      map[inv.type] = (map[inv.type] || 0) + val;
    });
    const total = Object.values(map).reduce((sum, v) => sum + v, 0);
    return Object.entries(map).map(([type, amount]) => ({
      type,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }));
  }, [investments]);

  const isOverallGain = investmentsSummary.totalGainLoss >= 0;

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[var(--mv-text-primary)] tracking-tight">Investment Portfolio</h1>
            <span className="text-[11px] font-semibold text-[var(--mv-cyan)] bg-[var(--mv-cyan)]/15 border border-[var(--mv-cyan)]/30 px-2.5 py-0.5 rounded-full">
              Capital Growth
            </span>
          </div>
          <p className="text-xs text-[var(--mv-text-secondary)] mt-1">
            Track mutual funds, equity holdings, gold, fixed deposits, and long-term asset appreciation.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('research')}
            className="px-3.5 py-2.5 bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Compass size={15} className="text-[var(--mv-primary)]" />
            <span>Stock Discovery Engine</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingInvestment(null);
              setQuickAddOpen(true, 'investment');
            }}
            className="px-4 py-2.5 bg-[var(--mv-cyan)] hover:brightness-110 text-[#0B0D0C] rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Top 4 Portfolio Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Invested */}
        <div className="vault-panel p-4.5 rounded-2xl">
          <div className="text-[11px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider">Total Invested</div>
          <div className="text-xl font-black text-[var(--mv-text-primary)] tabular-nums mt-1">
            {formatINR(investmentsSummary.totalInvested)}
          </div>
          <div className="text-[10px] text-[var(--mv-text-muted)] mt-0.5">Principal cost basis</div>
        </div>

        {/* Current Portfolio Value */}
        <div className="vault-panel-highlight p-4.5 rounded-2xl">
          <div className="text-[11px] font-bold text-[var(--mv-cyan)] uppercase tracking-wider">Current Value</div>
          <div className="text-xl font-black text-[var(--mv-text-primary)] tabular-nums mt-1">
            {formatINR(investmentsSummary.totalCurrentValue)}
          </div>
          <div className="text-[10px] text-[var(--mv-cyan)] mt-0.5">Marked to value</div>
        </div>

        {/* Total Gain/Loss */}
        <div className="vault-panel p-4.5 rounded-2xl">
          <div className="text-[11px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider">Total Gain / Loss</div>
          <div
            className={`text-xl font-black tabular-nums mt-1 flex items-center gap-1 ${
              isOverallGain ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {isOverallGain ? '+' : ''}
            {formatINR(investmentsSummary.totalGainLoss)}
          </div>
          <div className="text-[10px] text-[var(--mv-text-muted)] mt-0.5">Unrealized delta</div>
        </div>

        {/* Return % */}
        <div className="vault-panel p-4.5 rounded-2xl">
          <div className="text-[11px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider">Return %</div>
          <div
            className={`text-xl font-black tabular-nums mt-1 ${
              isOverallGain ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {isOverallGain ? '+' : ''}
            {(investmentsSummary.returnPercentage ?? 0).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[var(--mv-text-muted)] mt-0.5">Overall portfolio ROI</div>
        </div>
      </div>

      {/* Asset Allocation Breakdown (Requirement 27) */}
      {allocationByType.length > 0 && (
        <div className="vault-panel p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--mv-text-primary)] flex items-center gap-1.5">
              <PieChart size={15} className="text-[var(--mv-cyan)]" />
              <span>Asset Allocation Breakdown</span>
            </span>
            <span className="text-[11px] text-[var(--mv-text-muted)]">{allocationByType.length} categories</span>
          </div>

          <div className="w-full bg-[var(--mv-bg-secondary)] h-2 rounded-full overflow-hidden flex">
            {allocationByType.map((item, index) => {
              const colors = [
                'bg-blue-500',
                'bg-emerald-500',
                'bg-amber-500',
                'bg-purple-500',
                'bg-teal-500',
                'bg-rose-500',
                'bg-indigo-500',
              ];
              const color = colors[index % colors.length];
              return (
                <div
                  key={item.type}
                  className={`${color} h-full transition-all duration-300`}
                  style={{ width: `${item.percentage}%` }}
                  title={`${item.type}: ${item.percentage}%`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {allocationByType.map((item, index) => {
              const colors = [
                'bg-blue-500',
                'bg-emerald-500',
                'bg-amber-500',
                'bg-purple-500',
                'bg-teal-500',
                'bg-rose-500',
                'bg-indigo-500',
              ];
              const color = colors[index % colors.length];
              return (
                <div key={item.type} className="flex items-center gap-1.5 text-xs text-[var(--mv-text-secondary)]">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="font-semibold text-[var(--mv-text-primary)]">{item.type}</span>
                  <span className="text-[var(--mv-text-muted)]">({item.percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset List & Filter Tabs */}
      <div className="vault-panel rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[var(--mv-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[var(--mv-text-primary)]">Holdings & Instruments</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] font-semibold">
              {filteredInvestments.length}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {assetTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === type
                    ? 'bg-[var(--mv-cyan)] text-[#0B0D0C] shadow-sm font-bold'
                    : 'bg-[var(--mv-bg-secondary)] text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {filteredInvestments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--mv-cyan)]/15 border border-[var(--mv-cyan)]/30 text-[var(--mv-cyan)] flex items-center justify-center mx-auto">
              <TrendingUp size={24} />
            </div>
            <h4 className="text-sm font-bold text-[var(--mv-text-primary)]">No Investments Recorded</h4>
            <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
              {selectedType === 'ALL'
                ? 'Add your mutual fund SIPs, stocks, fixed deposits, or gold to track your capital portfolio in real time.'
                : `No assets found under "${selectedType}".`}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingInvestment(null);
                setQuickAddOpen(true, 'investment');
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--mv-cyan)] hover:brightness-110 text-[#0B0D0C] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <Plus size={15} />
              <span>Record Investment</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--mv-border)]">
            {filteredInvestments.map((inv) => {
              const gain = (inv.currentValue || inv.amountInvested) - inv.amountInvested;
              const gainPct = inv.amountInvested > 0 ? (gain / inv.amountInvested) * 100 : 0;
              const isGain = gain >= 0;

              return (
                <div
                  key={inv.id}
                  className="p-4 flex items-center justify-between hover:bg-[var(--mv-surface-hover)] transition-colors group cursor-pointer"
                  onClick={() => setEditingInvestment(inv)}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--mv-cyan)]/15 border border-[var(--mv-cyan)]/30 text-[var(--mv-cyan)] flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-[var(--mv-text-primary)] truncate">{inv.name}</span>
                        <span className="text-[10px] font-semibold text-[var(--mv-cyan)] bg-[var(--mv-cyan)]/15 border border-[var(--mv-cyan)]/30 px-2 py-0.5 rounded-md">
                          {inv.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--mv-text-muted)] mt-0.5">
                        <span>{formatDisplayDate(inv.date)}</span>
                        <span>•</span>
                        <span>Cost: {formatINR(inv.amountInvested)}</span>
                        {inv.units && (
                          <>
                            <span>•</span>
                            <span>{inv.units} units</span>
                          </>
                        )}
                        {inv.note && (
                          <>
                            <span>•</span>
                            <span className="italic text-[var(--mv-text-muted)] truncate max-w-xs">{inv.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-extrabold text-base text-[var(--mv-text-primary)] tabular-nums">
                        {formatINR(inv.currentValue || inv.amountInvested)}
                      </div>
                      <div
                        className={`text-xs font-semibold tabular-nums ${
                          isGain ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {isGain ? '+' : ''}
                        {formatINR(gain)} ({gainPct.toFixed(1)}%)
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingInvestment(inv);
                      }}
                      className="p-1.5 text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] rounded-lg hover:bg-[var(--mv-bg-secondary)] transition-all cursor-pointer"
                      title="Edit asset"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteInvestment(inv.id);
                      }}
                      className="p-1.5 text-[var(--mv-text-muted)] hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete investment"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
