import React,{ useState } from 'react';
import {
Bookmark,
Trash2,
Bell,Plus,
Scale,X
} from 'lucide-react';
import { useResearch } from '../context/ResearchContext';
import { ResearchAlertConfig } from '../types/research';

export const ResearchWatchlistView: React.FC = () => {
  const {
    watchlist,
    removeFromWatchlist,
    openCompanyProfile,
    addToCompare,
    updateWatchlistNote,
    alerts,
    addAlert,
    removeAlert,
    setSubTab,
  } = useResearch();

  const [editingNoteTicker, setEditingNoteTicker] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const [alertModalTicker, setAlertModalTicker] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<ResearchAlertConfig['type']>('sec_filing_published');
  const [alertThreshold, setAlertThreshold] = useState('');

  const handleOpenNoteModal = (ticker: string, currentNote = '') => {
    setEditingNoteTicker(ticker);
    setNoteDraft(currentNote);
  };

  const handleSaveNote = () => {
    if (editingNoteTicker) {
      updateWatchlistNote(editingNoteTicker, noteDraft);
      setEditingNoteTicker(null);
    }
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertModalTicker) return;
    const targetComp = watchlist.find((w) => w.ticker === alertModalTicker);
    addAlert({
      ticker: alertModalTicker,
      companyName: targetComp?.name || alertModalTicker,
      type: alertType,
      thresholdValue: alertThreshold ? parseFloat(alertThreshold) : undefined,
    });
    setAlertModalTicker(null);
    setAlertThreshold('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2">
            <Bookmark className="text-[var(--mv-primary)]" size={20} />
            <span>My Research Watchlist</span>
          </h2>
          <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
            Track prospective companies, monitor fundamental changes, and configure filing disclosures.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSubTab('discover')}
          className="px-4 py-2 bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Discover Companies</span>
        </button>
      </div>

      {watchlist.length === 0 ? (
        <div className="vault-panel p-12 rounded-3xl border border-[var(--mv-border)] text-center space-y-3">
          <Bookmark size={32} className="text-[var(--mv-text-muted)] mx-auto" />
          <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">
            Your Research Watchlist is Empty
          </h3>
          <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
            Browse the discovery engine and bookmark Indian companies with attractive growth characteristics to track their NSE/BSE exchange filings, quarterly results, and fundamentals.
          </p>
          <button
            type="button"
            onClick={() => setSubTab('discover')}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
          >
            <span>Browse Discovery Screen</span>
          </button>
        </div>
      ) : (
        <div className="vault-panel rounded-3xl border border-[var(--mv-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--mv-border)] text-[var(--mv-text-muted)] uppercase text-[10px] font-black bg-[var(--mv-bg-secondary)]">
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-3 text-right">1Y Rev Growth</th>
                  <th className="py-3 px-3 text-right">1Y FCF Growth</th>
                  <th className="py-3 px-3 text-right">Op Margin</th>
                  <th className="py-3 px-3">Research Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mv-border)] text-[var(--mv-text-secondary)]">
                {watchlist.map((item) => (
                  <tr
                    key={item.ticker}
                    onClick={() => openCompanyProfile(item.ticker)}
                    className="hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer group"
                  >
                    {/* Ticker & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[var(--mv-text-primary)] group-hover:text-[var(--mv-primary)] transition-colors">
                          {item.ticker}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)]">
                          {item.sector}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--mv-text-muted)] truncate block max-w-xs">
                        {item.name}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-3 text-right font-black text-[var(--mv-text-primary)] tabular-nums">
                      ${item.price.toFixed(2)}
                    </td>

                    {/* Rev Growth */}
                    <td className="py-3.5 px-3 text-right font-bold tabular-nums text-[var(--mv-income)]">
                      +{item.revenueGrowth1Y}%
                    </td>

                    {/* FCF Growth */}
                    <td className="py-3.5 px-3 text-right font-bold tabular-nums text-[var(--mv-income)]">
                      +{item.fcfGrowth1Y}%
                    </td>

                    {/* Op Margin */}
                    <td className="py-3.5 px-3 text-right font-bold tabular-nums text-[var(--mv-text-primary)]">
                      {item.operatingMargin}%
                    </td>

                    {/* Research Notes */}
                    <td
                      className="py-3.5 px-3 max-w-[200px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNoteModal(item.ticker, item.personalNote);
                      }}
                    >
                      <span className="text-[11px] text-[var(--mv-text-secondary)] hover:text-[var(--mv-primary)] truncate block italic cursor-pointer">
                        {item.personalNote || '+ Add thesis note...'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAlertModalTicker(item.ticker)}
                          title="Set Research Alert"
                          className="p-1.5 rounded-lg bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-primary)] transition-colors cursor-pointer"
                        >
                          <Bell size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => addToCompare(item.ticker)}
                          title="Add to Compare"
                          className="p-1.5 rounded-lg bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-primary)] transition-colors cursor-pointer"
                        >
                          <Scale size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFromWatchlist(item.ticker)}
                          title="Remove from Watchlist"
                          className="p-1.5 rounded-lg bg-[var(--mv-surface)] hover:bg-rose-500/15 border border-[var(--mv-border)] hover:border-rose-500/30 text-[var(--mv-text-secondary)] hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Research Alerts Section */}
      {alerts.length > 0 && (
        <div className="vault-panel p-5 rounded-3xl border border-[var(--mv-border)] space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[var(--mv-primary)]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--mv-text-primary)]">
              Active Research &amp; NSE/BSE Filing Alerts ({alerts.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="p-3 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[var(--mv-text-primary)]">{al.ticker}</span>
                    <span className="text-[10px] text-[var(--mv-text-muted)] font-semibold">
                      {al.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {al.thresholdValue && (
                    <span className="text-[11px] text-[var(--mv-primary)] font-bold block mt-0.5">
                      Threshold: {al.thresholdValue}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeAlert(al.id)}
                  className="p-1 text-[var(--mv-text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
                  title="Delete alert"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note Editing Modal */}
      {editingNoteTicker && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="vault-panel rounded-3xl w-full max-w-md p-6 space-y-4 border border-[var(--mv-border)] animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">
                Investment Thesis Note for {editingNoteTicker}
              </h3>
              <button
                type="button"
                onClick={() => setEditingNoteTicker(null)}
                className="text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              rows={4}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Record your research thesis, why you are tracking this company, or questions for further investigation..."
              className="w-full p-3 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] leading-relaxed"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingNoteTicker(null)}
                className="px-4 py-2 rounded-xl border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-5 py-2 bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] rounded-xl text-xs font-black shadow-xs cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Configuration Modal */}
      {alertModalTicker && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="vault-panel rounded-3xl w-full max-w-md p-6 space-y-4 border border-[var(--mv-border)] animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)] flex items-center gap-2">
                <Bell size={16} className="text-[var(--mv-primary)]" />
                <span>Configure Alert for {alertModalTicker}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAlertModalTicker(null)}
                className="text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--mv-text-secondary)] block">Alert Condition</label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                >
                  <option value="sec_filing_published">New NSE/BSE Annual Report or Quarterly Financials</option>
                  <option value="revenue_growth_shift">Revenue Growth Changes by &gt; 5%</option>
                  <option value="fcf_shift">Free Cash Flow Inflection or Major Shift</option>
                  <option value="valuation_threshold">P/S Multiple Threshold Reached</option>
                  <option value="debt_increase">Debt Obligations Increase Significantly</option>
                </select>
              </div>

              {(alertType === 'revenue_growth_shift' || alertType === 'valuation_threshold') && (
                <div className="space-y-1">
                  <label className="font-bold text-[var(--mv-text-secondary)] block">Threshold Value</label>
                  <input
                    type="number"
                    step="any"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] tabular-nums"
                    required
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAlertModalTicker(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--mv-border)] font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] rounded-xl font-black shadow-xs cursor-pointer"
                >
                  Set Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
