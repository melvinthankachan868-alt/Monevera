import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const ResearchDisclaimerBanner: React.FC = () => {
  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] flex items-start gap-3 text-xs">
      <ShieldAlert size={18} className="text-[var(--mv-primary)] shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <span className="font-extrabold text-[var(--mv-text-primary)] block">
          Educational & Fundamental Research Notice
        </span>
        <p className="text-[11px] text-[var(--mv-text-secondary)] leading-relaxed">
          Money Vault provides financial research and educational screening tools for Indian equities (NSE &amp; BSE), not SEBI-registered personalized investment advice, brokerage execution, or guaranteed returns. Fundamental metrics and corporate disclosures are sourced directly from official NSE / BSE filings and audited annual reports in ₹ INR. Always conduct independent verification before committing capital.
        </p>
      </div>
    </div>
  );
};
