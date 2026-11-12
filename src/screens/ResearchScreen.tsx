import React from 'react';
import {
Compass,
Bookmark,
Scale,
FileText
} from 'lucide-react';
import { useResearch,ResearchSubTab } from '../context/ResearchContext';
import { ResearchDiscoverView } from '../components/ResearchDiscoverView';
import { CompanyProfileView } from '../components/CompanyProfileView';
import { ResearchWatchlistView } from '../components/ResearchWatchlistView';
import { ResearchCompareView } from '../components/ResearchCompareView';
import { ResearchDisclaimerBanner } from '../components/ResearchDisclaimerBanner';
import { EducationalGlossaryModal } from '../components/EducationalGlossaryModal';

export const ResearchScreen: React.FC = () => {
  const {
    subTab,
    setSubTab,
    selectedTicker,
    watchlist,
    compareTickers,
    glossaryModalOpen,
    selectedGlossaryTerm,
    closeGlossary,
    openGlossary,
  } = useResearch();

  const tabs: { id: ResearchSubTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'discover', label: 'Discover & Screen', icon: Compass },
    { id: 'profile', label: selectedTicker ? `${selectedTicker} Profile` : 'Company Profile', icon: FileText },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark, count: watchlist.length },
    { id: 'compare', label: 'Compare Peers', icon: Scale, count: compareTickers.length },
  ];

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* 1. Regulatory & Educational Research Disclaimer */}
      <ResearchDisclaimerBanner />

      {/* 2. Top Title & Sub-navigation Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--mv-border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2.5">
              <Compass className="text-[var(--mv-primary)]" size={28} />
              <span>Indian Equities Discovery &amp; Research</span>
            </h1>
          </div>
          <p className="text-xs text-[var(--mv-text-secondary)] mt-1">
            Analyze audited NSE &amp; BSE company financials, compound growth rates, margins, valuation multiples, and risk factors in ₹ INR without fabricated data.
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-2xl self-start sm:self-auto shadow-xs scrollbar-none">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-sm'
                    : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)]'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-black/20 text-current' : 'bg-[var(--mv-surface-hover)] text-[var(--mv-primary)]'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Sub-Tab Active View */}
      <div>
        {subTab === 'discover' && <ResearchDiscoverView />}
        {subTab === 'profile' && <CompanyProfileView />}
        {subTab === 'watchlist' && <ResearchWatchlistView />}
        {subTab === 'compare' && <ResearchCompareView />}
      </div>

      {/* 4. Educational Glossary Modal */}
      <EducationalGlossaryModal
        isOpen={glossaryModalOpen}
        onClose={closeGlossary}
        term={selectedGlossaryTerm}
      />
    </div>
  );
};
