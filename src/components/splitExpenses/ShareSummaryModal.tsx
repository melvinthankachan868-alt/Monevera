import React, { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { SplitGroup, GroupFinancialSummary } from '../../types/splitExpenses';
import { SplitSettlementEngine } from '../../services/splitSettlementEngine';

interface ShareSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: SplitGroup;
  summary: GroupFinancialSummary;
}

export const ShareSummaryModal: React.FC<ShareSummaryModalProps> = ({
  isOpen,
  onClose,
  group,
  summary,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const textSummary = SplitSettlementEngine.formatShareableSummaryText(group.name, summary);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] flex items-center justify-center">
              <Share2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--mv-text-primary)]">Share Settlement Summary</h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">Formatted for WhatsApp, Telegram &amp; SMS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] rounded-full hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="relative">
            <pre className="w-full p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-mono text-[var(--mv-text-primary)] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto selection:bg-[var(--mv-primary)] selection:text-black">
              {textSummary}
            </pre>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-semibold text-[var(--mv-text-muted)]">
              {copied ? '✓ Copied to clipboard!' : 'Ready to share with group members'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] hover:brightness-110'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
