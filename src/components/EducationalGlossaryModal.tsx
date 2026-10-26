import React from 'react';
import { X, BookOpen, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { EducationalGlossaryTerm } from '../types/research';

interface EducationalGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  term: EducationalGlossaryTerm | null;
}

export const EducationalGlossaryModal: React.FC<EducationalGlossaryModalProps> = ({
  isOpen,
  onClose,
  term,
}) => {
  if (!isOpen || !term) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="vault-panel rounded-3xl w-full max-w-xl p-6 sm:p-7 shadow-2xl space-y-5 border border-[var(--mv-border)] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--mv-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--mv-primary)] block">
                Financial Concept Guide
              </span>
              <h2 className="text-base sm:text-lg font-black text-[var(--mv-text-primary)]">
                {term.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Short Summary */}
        <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-semibold text-[var(--mv-text-secondary)] leading-relaxed">
          {term.shortDefinition}
        </div>

        {/* Formula if applicable */}
        {term.formula && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--mv-text-muted)]">
              Mathematical Formula
            </span>
            <div className="p-3 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] font-mono text-xs font-bold text-[var(--mv-primary)]">
              {term.formula}
            </div>
          </div>
        )}

        {/* Detailed Explanation */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--mv-text-muted)]">
            How It Works
          </span>
          <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">
            {term.detailedExplanation}
          </p>
        </div>

        {/* Why Growth Investors Care */}
        <div className="p-4 rounded-2xl bg-[var(--mv-primary)]/10 border border-[var(--mv-primary)]/25 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--mv-primary)]">
            <Lightbulb size={16} />
            <span>Why Growth & Quality Investors Care</span>
          </div>
          <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">
            {term.whyGrowthInvestorsCare}
          </p>
        </div>

        {/* What is Good vs Pitfalls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[var(--mv-income)]/10 border border-[var(--mv-income)]/25 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[var(--mv-income)]">
              <CheckCircle size={14} />
              <span>What is Good</span>
            </div>
            <p className="text-[11px] text-[var(--mv-text-secondary)] leading-relaxed">
              {term.whatIsGood}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--mv-warning)]/10 border border-[var(--mv-warning)]/25 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[var(--mv-warning)]">
              <AlertTriangle size={14} />
              <span>Common Pitfall</span>
            </div>
            <p className="text-[11px] text-[var(--mv-text-secondary)] leading-relaxed">
              {term.commonPitfall}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
