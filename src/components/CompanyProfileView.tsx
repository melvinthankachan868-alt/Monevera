import React, { useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Scale,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileText,
  TrendingUp,
  BarChart3,
  Layers,
  PieChart,
  HelpCircle,
  Clock,
  Building2,
  CheckCircle2,
  Calendar,
  Gift,
  Coins,
  MessageSquare,
  Percent,
} from 'lucide-react';
import { useResearch } from '../context/ResearchContext';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR, formatCrores, formatIndianCount } from '../utils/indianCurrencyFormatter';

export const CompanyProfileView: React.FC = () => {
  const {
    activeProfile,
    isLoadingProfile,
    profileError,
    setSubTab,
    isWatchlisted,
    addToWatchlist,
    removeFromWatchlist,
    addToCompare,
    openGlossary,
    askMikeResearch,
    isMikeResearching,
  } = useResearch();

  const { setActiveTab } = useFinTraQ();

  const [activeProfileTab, setActiveProfileTab] = useState<
    'financials' | 'growth' | 'shareholding' | 'valuation' | 'catalysts' | 'corporateActions'
  >('financials');

  const [mikeReply, setMikeReply] = useState<string | null>(null);

  if (isLoadingProfile) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)] text-[var(--mv-primary)] flex items-center justify-center mx-auto animate-spin">
          <Sparkles size={24} />
        </div>
        <p className="text-sm font-bold text-[var(--mv-text-primary)]">
          Retrieving live NSE/BSE market prices and audited statements...
        </p>
      </div>
    );
  }

  if (profileError || !activeProfile) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertTriangle size={32} className="text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-[var(--mv-text-primary)]">
          {profileError || 'Company Profile Not Found'}
        </h3>
        <button
          type="button"
          onClick={() => setSubTab('discover')}
          className="px-4 py-2 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] rounded-xl text-xs font-bold text-[var(--mv-text-primary)] cursor-pointer"
        >
          Back to Discovery
        </button>
      </div>
    );
  }

  const watchlisted = isWatchlisted(activeProfile.ticker);

  const handleToggleWatchlist = () => {
    if (watchlisted) {
      removeFromWatchlist(activeProfile.ticker);
    } else {
      addToWatchlist(activeProfile);
    }
  };

  const handleAskMikeAboutCompany = async () => {
    try {
      const reply = await askMikeResearch(
        `Provide a fundamental research breakdown of ${activeProfile.name} (${activeProfile.ticker}): analyze business quality vs valuation, competitive moat, growth drivers, promoter holding, and top risks.`,
        activeProfile.ticker
      );
      setMikeReply(reply);
    } catch (e: any) {
      setMikeReply('Could not retrieve Mike analysis.');
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Back Button & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setSubTab('discover')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer self-start transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Stock Discovery</span>
        </button>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => addToCompare(activeProfile.ticker)}
            className="px-3 py-2 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] text-[var(--mv-text-primary)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Scale size={14} />
            <span>Compare Peers</span>
          </button>

          <button
            type="button"
            onClick={handleToggleWatchlist}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              watchlisted
                ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] border-[var(--mv-primary)]'
                : 'bg-[var(--mv-surface)] border-[var(--mv-border)] text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)]'
            }`}
          >
            {watchlisted ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            <span>{watchlisted ? 'Watchlisted' : 'Add to Watchlist'}</span>
          </button>

          {/* Explicit button to add to personal investments portfolio */}
          <button
            type="button"
            onClick={() => setActiveTab('investments')}
            className="px-3 py-2 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-primary)]/50 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Log shares owned in personal investment portfolio"
          >
            <Coins size={14} className="text-[var(--mv-primary)]" />
            <span>Add to Portfolio</span>
          </button>
        </div>
      </div>

      {/* Non-Indian Equity Warning Banner (e.g. Cognizant) */}
      {activeProfile.isNonIndianEquity && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-black">
            <AlertTriangle size={16} />
            <span>NOT AN NSE/BSE-LISTED INDIAN EQUITY</span>
          </div>
          <p>
            {activeProfile.nonIndianReason ||
              'This company is listed primarily on a foreign stock exchange (e.g. US NASDAQ). Although it maintains substantial operations or engineering centers in India, its shares do not trade on the National Stock Exchange of India (NSE) or Bombay Stock Exchange (BSE).'}
          </p>
        </div>
      )}

      {/* Header Info Panel */}
      <div className="vault-panel p-6 sm:p-7 rounded-3xl border border-[var(--mv-border)] space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--mv-text-primary)] tracking-tight">
                {activeProfile.name}
              </h1>
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C]">
                {activeProfile.ticker}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)]">
                {activeProfile.exchange}
              </span>
            </div>

            {/* Indian Identifiers */}
            <div className="flex items-center gap-3 text-xs font-semibold text-[var(--mv-text-secondary)] flex-wrap">
              <span>NSE Symbol: <strong className="text-[var(--mv-text-primary)]">{activeProfile.nseSymbol || activeProfile.ticker}</strong></span>
              <span>•</span>
              <span>BSE Scrip Code: <strong className="text-[var(--mv-text-primary)]">{activeProfile.bseCode || 'Listed'}</strong></span>
              {activeProfile.isin && (
                <>
                  <span>•</span>
                  <span>ISIN: <strong className="text-[var(--mv-text-primary)]">{activeProfile.isin}</strong></span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-[var(--mv-text-muted)] flex-wrap">
              <span className="px-2 py-0.5 rounded-lg bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[var(--mv-text-primary)]">
                {activeProfile.sector}
              </span>
              <span>•</span>
              <span>{activeProfile.industry}</span>
              <span>•</span>
              <span>HQ: {activeProfile.overview.headquarters}</span>
            </div>

            <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed pt-1">
              {activeProfile.overview.description}
            </p>
          </div>

          {/* Current Live Market Quote Card */}
          <div className="vault-card p-5 rounded-3xl border border-[var(--mv-border)] min-w-[260px] space-y-3 shrink-0 bg-[var(--mv-bg-secondary)]">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--mv-text-muted)] uppercase">
              <span>Current Stock Price</span>
              {activeProfile.price > 0 ? (
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--mv-income)] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--mv-income)] animate-pulse" />
                  <span>LIVE / DELAYED</span>
                </span>
              ) : (
                <span className="text-[10px] text-[var(--mv-text-muted)] font-semibold">
                  Live price unavailable
                </span>
              )}
            </div>

            <div>
              {activeProfile.price > 0 ? (
                <>
                  <div className="text-3xl font-black text-[var(--mv-text-primary)] tracking-tight tabular-nums">
                    {formatINR(activeProfile.price, { isPrice: true })}
                  </div>
                  <div
                    className={`text-xs font-bold tabular-nums mt-0.5 ${
                      activeProfile.changePercent1D >= 0 ? 'text-[var(--mv-income)]' : 'text-[var(--mv-danger)]'
                    }`}
                  >
                    {activeProfile.changePercent1D >= 0 ? '+' : ''}
                    {activeProfile.changePercent1D}% (1-Day Change)
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xl font-black text-[var(--mv-text-primary)]">
                    Listing Verified
                  </div>
                  <div className="text-[11px] text-[var(--mv-text-muted)] mt-0.5">
                    Traded on {activeProfile.exchange}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[var(--mv-border)] text-[11px]">
              <div className="flex justify-between">
                <span className="text-[var(--mv-text-muted)]">Market Capitalization:</span>
                <span className="font-extrabold text-[var(--mv-text-primary)]">
                  {activeProfile.marketCap > 0 ? formatINR(activeProfile.marketCap) : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mv-text-muted)]">P/E Ratio (TTM):</span>
                <span className="font-extrabold text-[var(--mv-text-primary)]">
                  {activeProfile.valuation.peRatio ? `${activeProfile.valuation.peRatio}x` : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mv-text-muted)]">ROIC / ROE:</span>
                <span className="font-extrabold text-[var(--mv-text-primary)]">
                  {activeProfile.calculations.roicCurrent > 0 || activeProfile.calculations.roeCurrent > 0
                    ? `${activeProfile.calculations.roicCurrent}% / ${activeProfile.calculations.roeCurrent}%`
                    : 'Not available'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 border-t border-[var(--mv-border)] no-scrollbar">
          {[
            { id: 'financials', label: 'Financial Statements (₹ Cr)', icon: BarChart3 },
            { id: 'growth', label: 'Growth & Fundamentals', icon: TrendingUp },
            { id: 'shareholding', label: 'Shareholding Pattern', icon: PieChart },
            { id: 'valuation', label: 'Valuation vs Quality', icon: Layers },
            { id: 'catalysts', label: 'Growth Drivers & Risks', icon: ShieldCheck },
            { id: 'corporateActions', label: 'Corporate Actions & Filings', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeProfileTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveProfileTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-sm'
                    : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Financial Statements (in ₹ Crores) */}
      {activeProfileTab === 'financials' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="vault-panel p-6 rounded-3xl border border-[var(--mv-border)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[var(--mv-text-primary)]">
                  Multi-Year Audited Financial Statements
                </h3>
                <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
                  Values expressed in Indian Rupees (₹ Crores) based on audited annual annual reports.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)]">
                Indian Fiscal Year (Ending March 31)
              </span>
            </div>

            {activeProfile.annualFinancials && activeProfile.annualFinancials.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[var(--mv-border)] text-[var(--mv-text-muted)] uppercase text-[10px] font-extrabold">
                      <th className="py-2.5 pr-4">Metric (₹ Crores)</th>
                      {activeProfile.annualFinancials.map((f) => (
                        <th key={f.period} className="py-2.5 px-3 text-right">
                          {f.period}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--mv-border)] font-semibold text-[var(--mv-text-primary)] tabular-nums">
                    <tr>
                      <td className="py-2.5 pr-4 text-[var(--mv-text-primary)] font-bold">Total Revenue / Turnover</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td key={f.period} className="py-2.5 px-3 text-right font-extrabold">
                          {formatCrores(f.revenue)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[var(--mv-text-secondary)]">Operating Profit (EBIT)</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td key={f.period} className="py-2.5 px-3 text-right">
                          {formatCrores(f.operatingIncome)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[var(--mv-text-primary)] font-bold">Net Profit (PAT)</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td
                          key={f.period}
                          className={`py-2.5 px-3 text-right font-black ${
                            f.netIncome >= 0 ? 'text-[var(--mv-income)]' : 'text-[var(--mv-danger)]'
                          }`}
                        >
                          {formatCrores(f.netIncome)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[var(--mv-text-secondary)]">Diluted EPS (₹ per share)</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td key={f.period} className="py-2.5 px-3 text-right">
                          ₹{f.dilutedEPS.toFixed(1)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[var(--mv-text-secondary)]">Operating Cash Flow (OCF)</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td key={f.period} className="py-2.5 px-3 text-right">
                          {formatCrores(f.operatingCashFlow)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[var(--mv-text-secondary)]">Capital Expenditure (Capex)</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td key={f.period} className="py-2.5 px-3 text-right text-[var(--mv-text-muted)]">
                          {formatCrores(f.capitalExpenditures)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-[var(--mv-primary)]/5">
                      <td className="py-2.5 pr-4 font-bold text-[var(--mv-primary)]">Free Cash Flow (FCF)</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td key={f.period} className="py-2.5 px-3 text-right font-black text-[var(--mv-income)]">
                          {formatCrores(f.freeCashFlow)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[var(--mv-text-secondary)]">Cash & Bank Balances</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td key={f.period} className="py-2.5 px-3 text-right">
                          {formatCrores(f.cashAndEquivalents)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[var(--mv-text-secondary)]">Total Debt / Borrowings</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td key={f.period} className="py-2.5 px-3 text-right">
                          {formatCrores(f.totalDebt)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[var(--mv-text-secondary)]">Net Debt</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td key={f.period} className="py-2.5 px-3 text-right">
                          {f.netDebt <= 0 ? (
                            <span className="text-[var(--mv-income)]">Net Cash ({formatCrores(Math.abs(f.netDebt))})</span>
                          ) : (
                            formatCrores(f.netDebt)
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[var(--mv-text-secondary)]">Dividend Paid per Share</td>
                      {activeProfile.annualFinancials.map((f) => (
                        <td key={f.period} className="py-2.5 px-3 text-right text-[var(--mv-text-primary)]">
                          {f.dividendPerShare !== undefined ? `₹${f.dividendPerShare}` : '—'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center space-y-3 bg-[var(--mv-bg-secondary)]/50 rounded-2xl border border-[var(--mv-border)] p-6">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                <h4 className="text-sm font-extrabold text-[var(--mv-text-primary)]">
                  Company Found in Official Indian Master Index
                </h4>
                <p className="text-xs text-[var(--mv-text-secondary)] max-w-md mx-auto leading-relaxed">
                  Basic exchange listing information is verified ({activeProfile.exchange} • NSE: {activeProfile.nseSymbol || activeProfile.ticker} • BSE: {activeProfile.bseCode || 'Listed'} • ISIN: {activeProfile.isin}). Multi-year audited financial statement lines are currently pending regulatory annual report ingestion.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[10px] font-bold text-[var(--mv-text-muted)]">
                  <span>Source: NSE / BSE Official Disclosures</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Growth & Fundamentals */}
      {activeProfileTab === 'growth' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="vault-panel p-5 rounded-3xl border border-[var(--mv-border)] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mv-text-muted)]">
                Revenue Growth Track Record
              </span>
              <div className="text-2xl font-black text-[var(--mv-text-primary)]">
                +{activeProfile.calculations.revenueGrowth1Y}% (1Y)
              </div>
              <div className="text-xs text-[var(--mv-text-secondary)] space-y-1">
                <div>3-Year CAGR: <strong className="text-[var(--mv-text-primary)]">+{activeProfile.calculations.revenueCAGR3Y}%</strong></div>
                {activeProfile.calculations.revenueCAGR5Y && (
                  <div>5-Year CAGR: <strong className="text-[var(--mv-text-primary)]">+{activeProfile.calculations.revenueCAGR5Y}%</strong></div>
                )}
              </div>
            </div>

            <div className="vault-panel p-5 rounded-3xl border border-[var(--mv-border)] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mv-text-muted)]">
                Operating & Net Margins
              </span>
              <div className="text-2xl font-black text-[var(--mv-income)]">
                {activeProfile.calculations.operatingMarginCurrent}%
              </div>
              <div className="text-xs text-[var(--mv-text-secondary)] space-y-1">
                <div>Net Margin: <strong className="text-[var(--mv-text-primary)]">{activeProfile.calculations.netMarginCurrent}%</strong></div>
                <div>3Y Margin Trend: <strong className="text-[var(--mv-text-primary)]">{activeProfile.calculations.operatingMarginTrend >= 0 ? '+' : ''}{activeProfile.calculations.operatingMarginTrend}% pts</strong></div>
              </div>
            </div>

            <div className="vault-panel p-5 rounded-3xl border border-[var(--mv-border)] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mv-text-muted)]">
                Capital Efficiency (ROE & ROIC)
              </span>
              <div className="text-2xl font-black text-[var(--mv-text-primary)]">
                {activeProfile.calculations.roeCurrent}% ROE
              </div>
              <div className="text-xs text-[var(--mv-text-secondary)] space-y-1">
                <div>Return on Invested Capital: <strong className="text-[var(--mv-income)]">{activeProfile.calculations.roicCurrent}%</strong></div>
                <div>Free Cash Flow Conversion: <strong className="text-[var(--mv-text-primary)]">{(activeProfile.calculations.fcfConversionRatio * 100).toFixed(0)}%</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Shareholding Pattern (Promoter, FII, DII, Public) */}
      {activeProfileTab === 'shareholding' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="vault-panel p-6 rounded-3xl border border-[var(--mv-border)] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[var(--mv-text-primary)]">
                  Ownership & Shareholding Pattern
                </h3>
                <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
                  Promoter holdings and institutional backing reported to NSE/BSE.
                </p>
              </div>
              <span className="text-[10px] font-bold text-[var(--mv-text-muted)]">
                As of {activeProfile.shareholdingPattern?.asOfDate || 'Latest Quarter'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-1">
                <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">Promoter Holding</span>
                <div className="text-2xl font-black text-[var(--mv-text-primary)]">
                  {activeProfile.shareholdingPattern?.promoterHolding || 0}%
                </div>
                <div className="text-[10px] text-[var(--mv-text-muted)]">
                  Pledged: {activeProfile.shareholdingPattern?.pledgedShares || 0}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-1">
                <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">FII / FPI Holding</span>
                <div className="text-2xl font-black text-[var(--mv-text-primary)]">
                  {activeProfile.shareholdingPattern?.fiiHolding || 0}%
                </div>
                <div className="text-[10px] text-[var(--mv-text-muted)]">Foreign Institutions</div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-1">
                <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">DII Holding</span>
                <div className="text-2xl font-black text-[var(--mv-text-primary)]">
                  {activeProfile.shareholdingPattern?.diiHolding || 0}%
                </div>
                <div className="text-[10px] text-[var(--mv-text-muted)]">Domestic Mutual Funds & LIC</div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-1">
                <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">Public & Retail</span>
                <div className="text-2xl font-black text-[var(--mv-text-primary)]">
                  {activeProfile.shareholdingPattern?.publicHolding || 0}%
                </div>
                <div className="text-[10px] text-[var(--mv-text-muted)]">Individual Shareholders</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Valuation vs Business Quality */}
      {activeProfileTab === 'valuation' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="vault-panel p-6 rounded-3xl border border-[var(--mv-border)] space-y-4">
            <h3 className="text-base font-extrabold text-[var(--mv-text-primary)]">
              Separation of Business Quality from Valuation
            </h3>
            <p className="text-xs text-[var(--mv-text-secondary)]">
              A high-quality business with strong competitive advantage can still trade at a demanding valuation. Money Vault evaluates both axes independently.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mv-text-muted)]">
                  Business Quality Assessment
                </span>
                <div className="text-xl font-black text-[var(--mv-income)]">High Quality Compounder</div>
                <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">
                  Demonstrates consistent profitability, strong capital efficiency with {activeProfile.calculations.roeCurrent}% ROE, and manageable balance sheet liabilities.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mv-text-muted)]">
                  Valuation Classification
                </span>
                <div className="text-xl font-black text-[var(--mv-text-primary)]">
                  {activeProfile.valuation.valuationAssessment}
                </div>
                <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">
                  {activeProfile.valuation.qualityVsValuationDichotomy}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--mv-border)] text-xs">
              <div>
                <span className="text-[var(--mv-text-muted)] block">Trailing P/E:</span>
                <strong className="text-[var(--mv-text-primary)]">{activeProfile.valuation.peRatio ? `${activeProfile.valuation.peRatio}x` : 'N/A'}</strong>
              </div>
              <div>
                <span className="text-[var(--mv-text-muted)] block">Price / Book (P/B):</span>
                <strong className="text-[var(--mv-text-primary)]">{activeProfile.valuation.pbRatio ? `${activeProfile.valuation.pbRatio}x` : 'N/A'}</strong>
              </div>
              <div>
                <span className="text-[var(--mv-text-muted)] block">EV / EBITDA:</span>
                <strong className="text-[var(--mv-text-primary)]">{activeProfile.valuation.evToEbitda ? `${activeProfile.valuation.evToEbitda}x` : 'N/A'}</strong>
              </div>
              <div>
                <span className="text-[var(--mv-text-muted)] block">FCF Yield:</span>
                <strong className="text-[var(--mv-income)]">{activeProfile.valuation.fcfYield ? `${activeProfile.valuation.fcfYield}%` : 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Growth Drivers & Risks */}
      {activeProfileTab === 'catalysts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bull Case */}
            <div className="vault-panel p-6 rounded-3xl border border-[var(--mv-border)] space-y-3">
              <div className="flex items-center gap-2 text-[var(--mv-income)] font-black text-sm">
                <ShieldCheck size={18} />
                <span>Bull Thesis & Growth Drivers</span>
              </div>
              <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">
                {activeProfile.bullCase?.thesis || activeProfile.topCatalyst}
              </p>
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">Key Drivers:</span>
                <ul className="space-y-1 text-xs text-[var(--mv-text-secondary)]">
                  {activeProfile.bullCase?.potentialDrivers?.map((d, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--mv-income)] shrink-0 mt-1.5" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bear Case */}
            <div className="vault-panel p-6 rounded-3xl border border-[var(--mv-border)] space-y-3">
              <div className="flex items-center gap-2 text-[var(--mv-warning)] font-black text-sm">
                <AlertTriangle size={18} />
                <span>Bear Thesis & Key Risks</span>
              </div>
              <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">
                {activeProfile.bearCase?.thesis || activeProfile.primaryRisk}
              </p>
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">Vulnerabilities:</span>
                <ul className="space-y-1 text-xs text-[var(--mv-text-secondary)]">
                  {activeProfile.bearCase?.keyVulnerabilities?.map((v, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--mv-warning)] shrink-0 mt-1.5" />
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Corporate Actions & Filings */}
      {activeProfileTab === 'corporateActions' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="vault-panel p-6 rounded-3xl border border-[var(--mv-border)] space-y-4">
            <h3 className="text-base font-extrabold text-[var(--mv-text-primary)]">
              Corporate Actions (Dividends, Splits, Bonus)
            </h3>
            {activeProfile.corporateActions && activeProfile.corporateActions.length > 0 ? (
              <div className="divide-y divide-[var(--mv-border)] text-xs">
                {activeProfile.corporateActions.map((ca) => (
                  <div key={ca.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[var(--mv-text-primary)]">{ca.type}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--mv-surface-hover)] text-[var(--mv-text-secondary)]">
                          Ex-Date: {ca.exDate}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--mv-text-secondary)] mt-0.5">{ca.details}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--mv-text-muted)] shrink-0">
                      Record: {ca.recordDate}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--mv-text-muted)]">No recent corporate action events recorded.</p>
            )}
          </div>
        </div>
      )}

      {/* Mike AI Research Assistant grounded card */}
      <div className="vault-panel p-6 rounded-3xl border border-[var(--mv-border)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-[var(--mv-primary)]" />
            <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">
              Ask Mike About {activeProfile.name}
            </h3>
          </div>
          <button
            type="button"
            disabled={isMikeResearching}
            onClick={handleAskMikeAboutCompany}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] font-black text-xs cursor-pointer shadow-xs hover:brightness-110 disabled:opacity-50"
          >
            {isMikeResearching ? 'Analyzing...' : 'Generate Research Brief'}
          </button>
        </div>

        {mikeReply && (
          <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs text-[var(--mv-text-secondary)] whitespace-pre-line leading-relaxed">
            {mikeReply}
          </div>
        )}
      </div>

      {/* Source Labeling & Data Freshness Traceability Box */}
      <div className="vault-panel p-5 rounded-3xl border border-[var(--mv-border)] space-y-2 text-xs bg-[var(--mv-bg-secondary)]/40">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mv-text-muted)] block">
          Data Traceability &amp; Regulatory Disclosures
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
          <div>
            <span className="text-[var(--mv-text-muted)] block font-semibold">Market Quotation</span>
            <strong className="text-[var(--mv-text-primary)]">
              {activeProfile.price > 0 ? 'NSE / BSE Feed (Live / Delayed)' : 'Exchange Feed Inactive'}
            </strong>
          </div>
          <div>
            <span className="text-[var(--mv-text-muted)] block font-semibold">Master Listing</span>
            <strong className="text-[var(--mv-text-primary)]">
              Official NSE (EQUITY_L) &amp; BSE CM Master
            </strong>
          </div>
          <div>
            <span className="text-[var(--mv-text-muted)] block font-semibold">Financial Statements</span>
            <strong className="text-[var(--mv-text-primary)]">
              {activeProfile.annualFinancials.length > 0 ? 'Audited Annual Reports' : 'Exchange Disclosures'}
            </strong>
          </div>
          <div>
            <span className="text-[var(--mv-text-muted)] block font-semibold">AI Explanations</span>
            <strong className="text-[var(--mv-text-primary)]">
              Mike Assistant (Derived, Not Source Fact)
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
