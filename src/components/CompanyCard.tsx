import React from 'react';
import {
Bookmark,
BookmarkCheck,
ArrowUpRight,
ShieldCheck,
AlertTriangle,
Sparkles,
Info,
Scale
} from 'lucide-react';
import { CompanyResearchSummary } from '../types/research';
import { useResearch } from '../context/ResearchContext';
import { formatINR } from '../utils/indianCurrencyFormatter';

interface CompanyCardProps {
  company: CompanyResearchSummary;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company }) => {
  const { openCompanyProfile, isWatchlisted, addToWatchlist, removeFromWatchlist, openGlossary, addToCompare } =
    useResearch();

  const watchlisted = isWatchlisted(company.ticker);

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (watchlisted) {
      removeFromWatchlist(company.ticker);
    } else {
      addToWatchlist(company);
    }
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCompare(company.ticker);
  };

  return (
    <div
      onClick={() => openCompanyProfile(company.ticker)}
      className="vault-panel rounded-3xl p-5 sm:p-6 border border-[var(--mv-border)] hover:border-[var(--mv-primary)]/50 transition-all cursor-pointer space-y-4 group shadow-sm flex flex-col justify-between"
    >
      <div className="space-y-4">
        {/* Top Header: Company Name, Ticker, Exchange & Watchlist */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-black text-[var(--mv-text-primary)] group-hover:text-[var(--mv-primary)] transition-colors tracking-tight">
                {company.ticker}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)]">
                {company.exchange || 'NSE • BSE'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)]">
                {company.sector}
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)] mt-1 truncate">
              {company.name}
            </h3>

            {/* Indian Exchange Listing identifiers */}
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--mv-text-muted)] font-medium">
              <span>NSE: <strong className="text-[var(--mv-text-primary)]">{company.nseSymbol || company.ticker}</strong></span>
              <span>•</span>
              <span>BSE: <strong className="text-[var(--mv-text-primary)]">{company.bseCode || 'Listed'}</strong></span>
            </div>

            {/* Non-Indian equity disclaimer banner if applicable */}
            {company.isNonIndianEquity && (
              <div className="mt-2 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={12} className="shrink-0" />
                <span>{company.nonIndianReason || 'Not an NSE/BSE-listed Indian equity.'}</span>
              </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--mv-border)]/60">
              <div className="text-sm font-black text-[var(--mv-text-primary)] tabular-nums">
                {formatINR(company.price, { isPrice: true })}
                <span
                  className={`text-xs ml-1.5 font-bold ${
                    company.changePercent1D >= 0 ? 'text-[var(--mv-income)]' : 'text-[var(--mv-danger)]'
                  }`}
                >
                  {company.changePercent1D >= 0 ? '+' : ''}
                  {company.changePercent1D}%
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[var(--mv-text-muted)]">
                Cap: {formatINR(company.marketCap)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCompareClick}
              title="Add to Side-by-Side Comparison"
              className="p-2 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)] transition-all cursor-pointer"
            >
              <Scale size={15} />
            </button>
            <button
              type="button"
              onClick={handleToggleWatchlist}
              title={watchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                watchlisted
                  ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] border-[var(--mv-primary)] shadow-xs'
                  : 'bg-[var(--mv-surface-hover)] border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)]'
              }`}
            >
              {watchlisted ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
          </div>
        </div>

        {/* Key Metrics Grid with Glossary Explanations */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--mv-border)]">
          {/* Revenue Growth */}
          <div className="vault-card p-2.5 rounded-xl border border-[var(--mv-border)]">
            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">
              <span>Rev Growth</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openGlossary('CAGR');
                }}
                className="hover:text-[var(--mv-text-primary)]"
                title="What is this?"
              >
                <Info size={11} />
              </button>
            </div>
            <div
              className={`text-sm font-black tabular-nums mt-0.5 ${
                company.calculations.revenueGrowth1Y >= 0 ? 'text-[var(--mv-income)]' : 'text-[var(--mv-danger)]'
              }`}
            >
              {company.calculations.revenueGrowth1Y >= 0 ? '+' : ''}
              {company.calculations.revenueGrowth1Y}%
            </div>
            <div className="text-[9px] text-[var(--mv-text-muted)] mt-0.5 truncate">
              3Y: +{company.calculations.revenueCAGR3Y}%
            </div>
          </div>

          {/* Operating Margin */}
          <div className="vault-card p-2.5 rounded-xl border border-[var(--mv-border)]">
            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">
              <span>Op Margin</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openGlossary('Operating Margin');
                }}
                className="hover:text-[var(--mv-text-primary)]"
                title="What is this?"
              >
                <Info size={11} />
              </button>
            </div>
            <div className="text-sm font-black tabular-nums mt-0.5 text-[var(--mv-text-primary)]">
              {company.calculations.operatingMarginCurrent}%
            </div>
            <div className="text-[9px] text-[var(--mv-text-muted)] mt-0.5 truncate">
              Net: {company.calculations.netMarginCurrent}%
            </div>
          </div>

          {/* ROE / ROIC */}
          <div className="vault-card p-2.5 rounded-xl border border-[var(--mv-border)]">
            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">
              <span>ROE / ROIC</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openGlossary('ROIC');
                }}
                className="hover:text-[var(--mv-text-primary)]"
                title="What is this?"
              >
                <Info size={11} />
              </button>
            </div>
            <div className="text-sm font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">
              {company.calculations.roeCurrent}%
            </div>
            <div className="text-[9px] text-[var(--mv-text-muted)] mt-0.5 truncate">
              ROIC: {company.calculations.roicCurrent}%
            </div>
          </div>

          {/* Valuation (P/E or P/S) */}
          <div className="vault-card p-2.5 rounded-xl border border-[var(--mv-border)]">
            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">
              <span>Valuation</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openGlossary('PE');
                }}
                className="hover:text-[var(--mv-text-primary)]"
                title="What is this?"
              >
                <Info size={11} />
              </button>
            </div>
            <div className="text-sm font-black text-[var(--mv-text-primary)] tabular-nums mt-0.5">
              {company.valuation.peRatio ? `${company.valuation.peRatio}x P/E` : 'Reinvesting'}
            </div>
            <div className="text-[9px] text-[var(--mv-text-muted)] mt-0.5 truncate">
              {company.valuation.psRatio}x P/S
            </div>
          </div>
        </div>

        {/* Why it appeared */}
        <div className="space-y-1.5 p-3 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mv-text-muted)] flex items-center gap-1.5">
            <Sparkles size={12} className="text-[var(--mv-primary)]" />
            <span>Growth Characteristics</span>
          </span>
          <ul className="space-y-1">
            {company.whyItAppeared.slice(0, 3).map((item, idx) => (
              <li key={idx} className="text-[11px] text-[var(--mv-text-secondary)] flex items-start gap-1.5 leading-snug">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--mv-primary)] shrink-0 mt-1" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Catalysts & Risks Snippets */}
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <ShieldCheck size={14} className="text-[var(--mv-primary)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase block">Top Catalyst</span>
              <p className="text-[11px] text-[var(--mv-text-secondary)] truncate">{company.topCatalyst}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-[var(--mv-warning)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase block">Primary Risk to Watch</span>
              <p className="text-[11px] text-[var(--mv-text-secondary)] truncate">{company.primaryRisk}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="pt-3 border-t border-[var(--mv-border)] flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-[var(--mv-text-muted)]">
          Source: NSE / BSE Audited Disclosures
        </span>

        <button
          type="button"
          onClick={() => openCompanyProfile(company.ticker)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--mv-primary)] hover:underline group-hover:translate-x-0.5 transition-transform cursor-pointer"
        >
          <span>View Full Research</span>
          <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
};

