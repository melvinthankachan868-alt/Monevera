import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  Filter,
  Layers,
  ChevronDown,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Database,
  Globe,
  Loader2,
} from 'lucide-react';
import { useResearch } from '../context/ResearchContext';
import { CompanyCard } from './CompanyCard';
import { SectorCategory, MarketCapCategory } from '../types/research';
import { formatINR } from '../utils/indianCurrencyFormatter';

const SECTORS: (SectorCategory | 'All')[] = [
  'All',
  'IT Services',
  'Banking',
  'Financial Services',
  'Oil & Gas',
  'Automobile',
  'Pharma & Healthcare',
  'FMCG & Consumer',
  'Industrials',
  'Energy & Power',
  'Telecom',
  'Infrastructure',
  'Chemicals',
  'Metals & Mining',
  'Defence',
  'Consumer Discretionary',
  'Real Estate',
  'Renewables',
  'Conglomerate',
];

const MARKETS = ['All', 'NSE', 'BSE'] as const;
const MARKET_CAPS: (MarketCapCategory | 'All')[] = ['All', 'Mega', 'Large', 'Mid', 'Small'];

export const ResearchDiscoverView: React.FC = () => {
  const {
    companies,
    isLoadingDiscovery,
    discoveryError,
    filters,
    setFilters,
    resetFilters,
    applyPreset,
    openCompanyProfile,
    // Broad Search & Browse
    searchResults,
    isSearching,
    searchIndianEquities,
    browseCompaniesList,
    browsePage,
    browseTotalPages,
    browseTotalCount,
    isLoadingBrowse,
    setBrowsePage,
  } = useResearch();

  const [viewMode, setViewMode] = useState<'screening' | 'browse'>('screening');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Debounced search trigger (250ms) with race-condition protection in Context
  useEffect(() => {
    const timer = setTimeout(() => {
      searchIndianEquities(searchInput);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput, searchIndianEquities]);

  const presets = [
    { id: 'all', label: 'All Verified Seeds', icon: Layers },
    { id: 'hyper_growth_fcf', label: 'Hyper-Growth + Positive FCF', icon: TrendingUp },
    { id: 'margin_expander', label: 'Margin Expanders', icon: Zap },
    { id: 'cash_machine', label: 'Cash Flow Machines', icon: Sparkles },
    { id: 'fortress_balance_sheet', label: 'Fortress Balance Sheet (Zero Net Debt)', icon: ShieldCheck },
    { id: 'rd_innovator', label: 'High Reinvestment Leaders', icon: Building2 },
    { id: 'early_compounder', label: 'High Quality Compounders', icon: Sparkles },
  ] as const;

  return (
    <div className="space-y-6">
      {/* View Mode Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--mv-border)] pb-3">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-[var(--mv-surface)] border border-[var(--mv-border)] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('screening')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'screening'
                ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs'
                : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
            }`}
          >
            <Sparkles size={14} />
            <span>Fundamental Screening Models</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('browse')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'browse'
                ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs'
                : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
            }`}
          >
            <Globe size={14} />
            <span>Browse All Indian Equities (5,180+)</span>
          </button>
        </div>

        <div className="text-[11px] font-semibold text-[var(--mv-text-muted)] flex items-center gap-1.5">
          <Database size={13} className="text-[var(--mv-primary)]" />
          <span>NSE &amp; BSE Master Index Active</span>
        </div>
      </div>

      {/* Top Search & Presets Ribbon */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Broad Indian Equity Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-[var(--mv-text-muted)]" />
            <input
              type="text"
              value={searchInput}
              onFocus={() => setIsFocused(true)}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }));
              }}
              placeholder="Search 5,180+ Indian stocks — TCS, Infosys, Reliance, Ksolves, Tips Music, Waaree..."
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[var(--mv-surface)] border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)] text-xs font-bold text-[var(--mv-text-primary)] shadow-xs transition-colors"
            />

            {isSearching && (
              <div className="absolute right-3.5 top-3 text-[var(--mv-primary)] animate-spin">
                <Loader2 size={16} />
              </div>
            )}

            {/* Quick Compact Results Popover when user types query */}
            {isFocused && searchInput.trim().length > 0 && searchResults.length > 0 && (
              <div
                className="absolute z-30 left-0 right-0 top-12 max-h-96 overflow-y-auto rounded-3xl bg-[var(--mv-surface)] border border-[var(--mv-border)] shadow-xl p-3 space-y-2 backdrop-blur-md"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="flex items-center justify-between px-2 pb-1 border-b border-[var(--mv-border)]">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mv-text-muted)]">
                    Matching Indian Equities ({searchResults.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFocused(false)}
                    className="text-[10px] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] font-bold cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {searchResults.slice(0, 8).map((c) => (
                    <div
                      key={`${c.ticker}-${c.isin || c.bseCode || ''}`}
                      onClick={() => {
                        openCompanyProfile(c.ticker);
                        setIsFocused(false);
                      }}
                      className="p-3 rounded-2xl bg-[var(--mv-bg-secondary)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-primary)]/50 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-[var(--mv-text-primary)]">{c.ticker}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--mv-primary)]/15 text-[var(--mv-primary)]">
                              {c.sector}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-muted)]">
                              {c.exchange}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-[var(--mv-text-primary)] mt-0.5 truncate">{c.name}</h4>
                          <div className="text-[10px] font-semibold text-[var(--mv-text-muted)] mt-0.5">
                            NSE: {c.nseSymbol || c.ticker} • BSE: {c.bseCode || 'Listed'} {c.isin ? `• ISIN: ${c.isin}` : ''}
                          </div>
                        </div>

                        {c.price > 0 && (
                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-[var(--mv-text-primary)] tabular-nums">
                              {formatINR(c.price, { isPrice: true })}
                            </div>
                            <div
                              className={`text-[10px] font-bold tabular-nums ${
                                c.changePercent1D >= 0 ? 'text-[var(--mv-income)]' : 'text-[var(--mv-danger)]'
                              }`}
                            >
                              {c.changePercent1D >= 0 ? '+' : ''}
                              {c.changePercent1D}%
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Foreign equity disclaimer banner (e.g. Cognizant) */}
                      {c.isNonIndianEquity && (
                        <div className="mt-2 p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>{c.nonIndianReason || 'Not an NSE/BSE-listed Indian equity.'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Toggle Filter Drawer */}
          {viewMode === 'screening' && (
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                filterDrawerOpen
                  ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] border-[var(--mv-primary)]'
                  : 'bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border-[var(--mv-border)] text-[var(--mv-text-primary)]'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filter Criteria</span>
              <ChevronDown size={14} className={filterDrawerOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          )}
        </div>

        {/* Quick Model Presets (only in screening view) */}
        {viewMode === 'screening' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {presets.map((p) => {
              const Icon = p.icon;
              const isSelected = filters.preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[var(--mv-primary)]/15 border-[var(--mv-primary)] text-[var(--mv-primary)] shadow-xs'
                      : 'bg-[var(--mv-surface)] border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)]'
                  }`}
                >
                  <Icon size={12} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Filter Drawer */}
      {filterDrawerOpen && viewMode === 'screening' && (
        <div className="p-5 rounded-3xl bg-[var(--mv-surface)] border border-[var(--mv-border)] space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-[var(--mv-border)] pb-3">
            <div className="flex items-center gap-2 font-bold text-xs text-[var(--mv-text-primary)]">
              <Filter size={14} className="text-[var(--mv-primary)]" />
              <span>Quantitative Fundamental Filters</span>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Exchange Filter */}
            <div className="space-y-1.5">
              <label className="font-bold text-[var(--mv-text-secondary)] block">Stock Exchange</label>
              <select
                value={filters.market}
                onChange={(e) => setFilters((prev) => ({ ...prev, market: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              >
                {MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {m === 'All' ? 'All Exchanges (NSE & BSE)' : m}
                  </option>
                ))}
              </select>
            </div>

            {/* Sector Filter */}
            <div className="space-y-1.5">
              <label className="font-bold text-[var(--mv-text-secondary)] block">Industry Sector</label>
              <select
                value={filters.sector}
                onChange={(e) => setFilters((prev) => ({ ...prev, sector: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              >
                {SECTORS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Market Cap */}
            <div className="space-y-1.5">
              <label className="font-bold text-[var(--mv-text-secondary)] block">Market Cap Tier</label>
              <select
                value={filters.marketCap}
                onChange={(e) => setFilters((prev) => ({ ...prev, marketCap: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              >
                {MARKET_CAPS.map((cap) => (
                  <option key={cap} value={cap}>
                    {cap === 'All' ? 'All Market Caps' : `${cap} Cap`}
                  </option>
                ))}
              </select>
            </div>

            {/* Min 1Y Revenue Growth */}
            <div className="space-y-1.5">
              <label className="font-bold text-[var(--mv-text-secondary)] block">Min Revenue Growth (1Y %)</label>
              <input
                type="number"
                step="5"
                value={filters.minRevenueGrowth || ''}
                placeholder="e.g. 15"
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, minRevenueGrowth: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] tabular-nums"
              />
            </div>

            {/* Min FCF Growth */}
            <div className="space-y-1.5">
              <label className="font-bold text-[var(--mv-text-secondary)] block">Min FCF Growth (1Y %)</label>
              <input
                type="number"
                step="5"
                value={filters.minFCFGrowth || ''}
                placeholder="e.g. 10"
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, minFCFGrowth: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] tabular-nums"
              />
            </div>

            {/* Min Operating Margin */}
            <div className="space-y-1.5">
              <label className="font-bold text-[var(--mv-text-secondary)] block">Min Operating Margin (%)</label>
              <input
                type="number"
                step="2"
                value={filters.minOperatingMargin || ''}
                placeholder="e.g. 15"
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, minOperatingMargin: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] tabular-nums"
              />
            </div>

            {/* Min ROIC */}
            <div className="space-y-1.5">
              <label className="font-bold text-[var(--mv-text-secondary)] block">Min ROIC (%)</label>
              <input
                type="number"
                step="2"
                value={filters.minROIC || ''}
                placeholder="e.g. 15"
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, minROIC: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] tabular-nums"
              />
            </div>

            {/* Max P/E Ratio */}
            <div className="space-y-1.5">
              <label className="font-bold text-[var(--mv-text-secondary)] block">Max P/E Ratio</label>
              <input
                type="number"
                step="5"
                value={filters.maxPE || ''}
                placeholder="e.g. 35"
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, maxPE: parseFloat(e.target.value) || null }))
                }
                className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] tabular-nums"
              />
            </div>

            {/* Profitable & Positive FCF Toggles */}
            <div className="sm:col-span-2 flex items-center gap-4 pt-4">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-[var(--mv-text-primary)]">
                <input
                  type="checkbox"
                  checked={filters.profitableOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, profitableOnly: e.target.checked }))}
                  className="rounded text-[var(--mv-primary)] accent-[var(--mv-primary)]"
                />
                <span>Net Profit Profitable Only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-[var(--mv-text-primary)]">
                <input
                  type="checkbox"
                  checked={filters.positiveFCFOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, positiveFCFOnly: e.target.checked }))}
                  className="rounded text-[var(--mv-primary)] accent-[var(--mv-primary)]"
                />
                <span>Positive Free Cash Flow Only</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: SCREENING MODELS VIEW */}
      {viewMode === 'screening' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--mv-text-secondary)] px-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[var(--mv-text-primary)]">
                {companies.length} Deep Research Equities Matched
              </span>
              <span className="text-[10px] text-[var(--mv-text-muted)]">
                (Verified Multi-Year Audited Financial Statements)
              </span>
            </div>
            <span className="text-[10px] text-[var(--mv-text-muted)] hidden sm:inline">
              Audited Statements in ₹ Crores (NSE &amp; BSE)
            </span>
          </div>

          {isLoadingDiscovery ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)] text-[var(--mv-primary)] flex items-center justify-center mx-auto animate-spin">
                <Sparkles size={20} />
              </div>
              <p className="text-xs font-bold text-[var(--mv-text-secondary)]">
                Executing quantitative multi-year criteria across Indian equities...
              </p>
            </div>
          ) : discoveryError ? (
            <div className="p-8 text-center space-y-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-400 text-xs">
              <p>{discoveryError}</p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-xl text-xs font-bold text-[var(--mv-text-primary)] cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((company) => (
                <CompanyCard key={company.ticker} company={company} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: BROWSE INDIAN STOCK UNIVERSE (5,180+ EQUITIES) */}
      {viewMode === 'browse' && (
        <div className="space-y-4">
          {/* Browse Header & Pagination Bar */}
          <div className="vault-panel p-4 rounded-3xl border border-[var(--mv-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">
                  Indian Listed Equity Universe
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--mv-primary)]/15 text-[var(--mv-primary)]">
                  {browseTotalCount.toLocaleString('en-IN')} Companies
                </span>
              </div>
              <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
                Showing {(browsePage - 1) * 25 + 1}–{Math.min(browsePage * 25, browseTotalCount)} of{' '}
                {browseTotalCount.toLocaleString('en-IN')} listed Indian companies (NSE &amp; BSE).
              </p>
            </div>

            {/* Pagination Controls Top */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                disabled={browsePage <= 1 || isLoadingBrowse}
                onClick={() => setBrowsePage(browsePage - 1)}
                className="px-3 py-1.5 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)] disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span className="text-xs font-black text-[var(--mv-text-primary)] px-2 tabular-nums">
                Page {browsePage} of {browseTotalPages}
              </span>

              <button
                type="button"
                disabled={browsePage >= browseTotalPages || isLoadingBrowse}
                onClick={() => setBrowsePage(browsePage + 1)}
                className="px-3 py-1.5 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)] disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Browse Table / Grid */}
          {isLoadingBrowse ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)] text-[var(--mv-primary)] flex items-center justify-center mx-auto animate-spin">
                <Globe size={20} />
              </div>
              <p className="text-xs font-bold text-[var(--mv-text-secondary)]">
                Loading Indian equity universe records...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {browseCompaniesList.map((c) => (
                <div
                  key={`${c.ticker}-${c.isin || c.bseCode || ''}`}
                  onClick={() => openCompanyProfile(c.ticker)}
                  className="vault-panel p-4 rounded-2xl border border-[var(--mv-border)] hover:border-[var(--mv-primary)]/60 hover:bg-[var(--mv-surface-hover)] transition-all cursor-pointer flex flex-col justify-between space-y-3 group shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[var(--mv-text-primary)] group-hover:text-[var(--mv-primary)] transition-colors">
                        {c.ticker}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-muted)]">
                        {c.exchange}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-[var(--mv-text-primary)] line-clamp-1">{c.name}</h4>

                    <div className="text-[11px] font-semibold text-[var(--mv-text-muted)] flex items-center gap-1.5 flex-wrap">
                      <span>NSE: {c.nseSymbol || c.ticker}</span>
                      <span>•</span>
                      <span>BSE: {c.bseCode || 'Listed'}</span>
                      {c.isin && (
                        <>
                          <span>•</span>
                          <span>ISIN: {c.isin}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--mv-border)] flex items-center justify-between text-[11px]">
                    <span className="px-2 py-0.5 rounded-lg bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] font-bold text-[10px]">
                      {c.sector}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[var(--mv-primary)] font-bold text-xs group-hover:underline">
                      <span>Research</span>
                      <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls Bottom */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-semibold text-[var(--mv-text-secondary)]">
              Page {browsePage} of {browseTotalPages} ({browseTotalCount.toLocaleString('en-IN')} total equities)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={browsePage <= 1 || isLoadingBrowse}
                onClick={() => {
                  setBrowsePage(browsePage - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)] disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <button
                type="button"
                disabled={browsePage >= browseTotalPages || isLoadingBrowse}
                onClick={() => {
                  setBrowsePage(browsePage + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 rounded-xl bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] text-xs font-black disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>Next Page</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
