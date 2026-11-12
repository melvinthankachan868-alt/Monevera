import React,{ useState,useEffect } from 'react';
import {
Scale,Trash2,ArrowRight,ShieldCheck,
AlertTriangle,HelpCircle,
Search
} from 'lucide-react';
import { useResearch } from '../context/ResearchContext';
import { CompanyResearchDetail } from '../types/research';
import { formatINR,formatCrores } from '../utils/indianCurrencyFormatter';
import { RATE_LIMIT_MSG } from '../utils/aiErrorHelper';

export const ResearchCompareView: React.FC = () => {
  const {
    compareTickers,
    removeFromCompare,
    addToCompare,
    openCompanyProfile,
    openGlossary,
    setSubTab,
  } = useResearch();

  const [compareProfiles, setCompareProfiles] = useState<CompanyResearchDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addTickerInput, setAddTickerInput] = useState('');

  useEffect(() => {
    if (compareTickers.length === 0) {
      setCompareProfiles([]);
      return;
    }

    const fetchProfiles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/research/compare?tickers=${encodeURIComponent(compareTickers.join(','))}`);
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error(RATE_LIMIT_MSG);
          }
          throw new Error(`Failed to load comparison (status ${res.status})`);
        }
        const data = await res.json();
        setCompareProfiles(data.companies || []);
      } catch (err: any) {
        console.error('Comparison fetch error:', err);
        setError(err.message || 'Could not load companies for comparison');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [compareTickers]);

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTickerInput.trim()) return;
    addToCompare(addTickerInput.trim().toUpperCase());
    setAddTickerInput('');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2">
            <Scale className="text-[var(--mv-primary)]" size={22} />
            <span>Side-by-Side Fundamental Comparison</span>
          </h2>
          <p className="text-xs text-[var(--mv-text-secondary)] mt-1">
            Compare growth rates, profit margins, balance sheet health, and valuation multiples across peer companies in ₹ INR.
          </p>
        </div>

        {/* Add Ticker Input */}
        <form onSubmit={handleAddTicker} className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-[var(--mv-text-muted)]" />
            <input
              type="text"
              placeholder="Add ticker (e.g. INFY)"
              value={addTickerInput}
              onChange={(e) => setAddTickerInput(e.target.value.toUpperCase())}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)] text-xs font-bold text-[var(--mv-text-primary)] w-36 sm:w-44"
            />
          </div>
          <button
            type="submit"
            disabled={!addTickerInput.trim() || compareTickers.length >= 5}
            className="px-3 py-1.5 bg-[var(--mv-primary)] hover:brightness-110 disabled:opacity-40 text-white dark:text-[#0B0D0C] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Add
          </button>
        </form>
      </div>

      {compareTickers.length === 0 ? (
        <div className="vault-panel p-12 rounded-3xl border border-[var(--mv-border)] text-center space-y-3">
          <Scale size={36} className="text-[var(--mv-text-muted)] mx-auto" />
          <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">
            No Companies Selected for Comparison
          </h3>
          <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
            Browse the discovery engine and click "Compare" on 2 or more companies to view their metrics side-by-side.
          </p>
          <button
            type="button"
            onClick={() => setSubTab('discover')}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <span>Browse Discovery Engine</span>
          </button>
        </div>
      ) : isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)] text-[var(--mv-primary)] flex items-center justify-center mx-auto animate-spin">
            <Scale size={20} />
          </div>
          <p className="text-xs font-bold text-[var(--mv-text-primary)]">Loading comparative metrics...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs text-center space-y-2">
          <AlertTriangle size={24} className="mx-auto" />
          <p className="font-bold">{error}</p>
        </div>
      ) : (
        <div className="vault-panel rounded-3xl border border-[var(--mv-border)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[var(--mv-bg-secondary)] border-b border-[var(--mv-border)]">
                  <th className="p-4 font-bold text-[var(--mv-text-muted)] uppercase tracking-wider w-48 sm:w-56 sticky left-0 bg-[var(--mv-bg-secondary)] z-10">
                    Dimension / Metric
                  </th>
                  {compareProfiles.map((comp) => (
                    <th key={comp.ticker} className="p-4 font-bold min-w-[200px] border-l border-[var(--mv-border)]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base font-black text-[var(--mv-text-primary)]">{comp.ticker}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] font-bold">
                              {comp.exchange}
                            </span>
                          </div>
                          <span className="text-xs text-[var(--mv-text-secondary)] font-medium block truncate max-w-[170px]">
                            {comp.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCompare(comp.ticker)}
                          className="p-1 rounded-lg hover:bg-rose-500/15 text-[var(--mv-text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                          title="Remove from comparison"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-black text-[var(--mv-text-primary)] tabular-nums">
                          {formatINR(comp.price, { isPrice: true })}
                        </span>
                        <button
                          type="button"
                          onClick={() => openCompanyProfile(comp.ticker)}
                          className="text-[10px] font-bold text-[var(--mv-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Full Profile</span>
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mv-border)]">
                {/* 1. SECTOR & MARKET CAP */}
                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    Sector & Industry
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] text-[var(--mv-text-primary)]">
                      <div className="font-bold">{c.sector}</div>
                      <div className="text-[10px] text-[var(--mv-text-muted)] truncate max-w-[200px]">{c.industry}</div>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    Market Capitalization
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] tabular-nums">
                      {formatINR(c.marketCap, { compact: true })} ({c.marketCapCategory})
                    </td>
                  ))}
                </tr>

                {/* 2. GROWTH METRICS */}
                <tr className="bg-[var(--mv-bg-secondary)]/50">
                  <td colSpan={compareProfiles.length + 1} className="p-2.5 px-4 font-black text-[11px] text-[var(--mv-primary)] uppercase tracking-wider">
                    Historical Growth & Scale
                  </td>
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    <div className="flex items-center gap-1">
                      <span>1-Year Revenue Growth</span>
                      <button type="button" onClick={() => openGlossary('cagr')} className="text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]">
                        <HelpCircle size={12} />
                      </button>
                    </div>
                  </td>
                  {compareProfiles.map((c) => {
                    const g = c.calculations.revenueGrowth1Y;
                    return (
                      <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-black tabular-nums">
                        <span className={g >= 20 ? 'text-emerald-500 font-extrabold' : g > 0 ? 'text-[var(--mv-text-primary)]' : 'text-rose-500'}>
                          {g > 0 ? '+' : ''}{g}%
                        </span>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    3-Year Revenue CAGR
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] tabular-nums">
                      {c.calculations.revenueCAGR3Y ? `+${c.calculations.revenueCAGR3Y}%` : '—'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    1-Year FCF Growth
                  </td>
                  {compareProfiles.map((c) => {
                    const f = c.calculations.fcfGrowth1Y;
                    return (
                      <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold tabular-nums">
                        <span className={f > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                          {f > 0 ? '+' : ''}{f}%
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* 3. PROFITABILITY & CASH GENERATION */}
                <tr className="bg-[var(--mv-bg-secondary)]/50">
                  <td colSpan={compareProfiles.length + 1} className="p-2.5 px-4 font-black text-[11px] text-[var(--mv-primary)] uppercase tracking-wider">
                    Profitability & Capital Efficiency
                  </td>
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    Gross Margin
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] tabular-nums">
                      {c.calculations.grossMarginCurrent}%
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    <div className="flex items-center gap-1">
                      <span>Operating Margin</span>
                      <button type="button" onClick={() => openGlossary('operating_margin')} className="text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]">
                        <HelpCircle size={12} />
                      </button>
                    </div>
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold tabular-nums">
                      <span className={c.calculations.operatingMarginCurrent >= 15 ? 'text-emerald-500 font-extrabold' : 'text-[var(--mv-text-primary)]'}>
                        {c.calculations.operatingMarginCurrent}%
                      </span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    <div className="flex items-center gap-1">
                      <span>ROIC (Return on Capital)</span>
                      <button type="button" onClick={() => openGlossary('roic')} className="text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]">
                        <HelpCircle size={12} />
                      </button>
                    </div>
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] tabular-nums">
                      {c.calculations.roicCurrent}%
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    <div className="flex items-center gap-1">
                      <span>R&D Intensity (% of Rev)</span>
                      <button type="button" onClick={() => openGlossary('rd_intensity')} className="text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]">
                        <HelpCircle size={12} />
                      </button>
                    </div>
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] tabular-nums">
                      {c.calculations.rdIntensityRatio}%
                    </td>
                  ))}
                </tr>

                {/* 4. BALANCE SHEET & DEBT */}
                <tr className="bg-[var(--mv-bg-secondary)]/50">
                  <td colSpan={compareProfiles.length + 1} className="p-2.5 px-4 font-black text-[11px] text-[var(--mv-primary)] uppercase tracking-wider">
                    Balance Sheet & Liquidity Fortress
                  </td>
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    Cash & Equivalents
                  </td>
                  {compareProfiles.map((c) => {
                    const latest = c.annualFinancials[c.annualFinancials.length - 1];
                    return (
                      <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] tabular-nums">
                        {latest ? formatCrores(latest.cashAndEquivalents) : '—'}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    Total Long-Term Debt
                  </td>
                  {compareProfiles.map((c) => {
                    const latest = c.annualFinancials[c.annualFinancials.length - 1];
                    return (
                      <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] tabular-nums">
                        {latest ? formatCrores(latest.totalDebt) : '—'}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    Net Debt Position
                  </td>
                  {compareProfiles.map((c) => {
                    const nd = c.calculations.netDebtToEbitda;
                    return (
                      <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold tabular-nums">
                        {nd === null || nd <= 0 ? (
                          <span className="text-emerald-500 font-extrabold flex items-center gap-1">
                            <ShieldCheck size={12} />
                            <span>Net Cash Positive</span>
                          </span>
                        ) : (
                          <span className="text-[var(--mv-text-primary)]">{nd}x EBITDA</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 5. VALUATION MULTIPLES */}
                <tr className="bg-[var(--mv-bg-secondary)]/50">
                  <td colSpan={compareProfiles.length + 1} className="p-2.5 px-4 font-black text-[11px] text-[var(--mv-primary)] uppercase tracking-wider">
                    Valuation & Pricing Metrics
                  </td>
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    <div className="flex items-center gap-1">
                      <span>P/E Ratio (Trailing)</span>
                      <button type="button" onClick={() => openGlossary('pe_ratio')} className="text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]">
                        <HelpCircle size={12} />
                      </button>
                    </div>
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] tabular-nums">
                      {c.valuation.peRatio ? `${c.valuation.peRatio}x` : 'Unprofitable (N/A)'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    <div className="flex items-center gap-1">
                      <span>P/S Ratio (Price / Sales)</span>
                      <button type="button" onClick={() => openGlossary('ps_ratio')} className="text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]">
                        <HelpCircle size={12} />
                      </button>
                    </div>
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] tabular-nums">
                      {c.valuation.psRatio}x
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    EV / Free Cash Flow
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] tabular-nums">
                      {c.valuation.evToFcf ? `${c.valuation.evToFcf}x` : '—'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    Valuation Assessment
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)]">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)]">
                        {c.valuation.valuationAssessment}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 6. SCORE & CATALYST */}
                <tr className="bg-[var(--mv-bg-secondary)]/50">
                  <td colSpan={compareProfiles.length + 1} className="p-2.5 px-4 font-black text-[11px] text-[var(--mv-primary)] uppercase tracking-wider">
                    Model Assessment & Qualitative Catalysts
                  </td>
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    Early-Stage Growth Score
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] font-black text-sm text-[var(--mv-primary)] tabular-nums">
                      {c.earlyStageScore}/100
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    Top Catalyst
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] text-xs text-[var(--mv-text-secondary)] leading-relaxed">
                      {c.topCatalyst}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3.5 font-bold text-[var(--mv-text-secondary)] sticky left-0 bg-[var(--mv-surface)]">
                    Primary Risk Factor
                  </td>
                  {compareProfiles.map((c) => (
                    <td key={c.ticker} className="p-3.5 border-l border-[var(--mv-border)] text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                      {c.primaryRisk}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
