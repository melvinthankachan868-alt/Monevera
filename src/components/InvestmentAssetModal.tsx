import React, { useState, useEffect, useRef } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { Investment, InvestmentType } from '../types';
import { formatINR, toDateString } from '../utils/calculations';
import { TrendingUp, X, Trash2, Calendar, DollarSign, Layers, Tag, FileText, CheckCircle2 } from 'lucide-react';

interface InvestmentAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingInvestment?: Investment | null;
}

const ASSET_TYPES: InvestmentType[] = [
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

export const InvestmentAssetModal: React.FC<InvestmentAssetModalProps> = ({
  isOpen,
  onClose,
  editingInvestment = null,
}) => {
  const { addInvestment, updateInvestment, deleteInvestment } = useFinTraQ();

  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('Mutual Funds');
  const [investedAmountStr, setInvestedAmountStr] = useState('');
  const [currentValueStr, setCurrentValueStr] = useState('');
  const [unitsStr, setUnitsStr] = useState('');
  const [date, setDate] = useState(toDateString(new Date()));
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingInvestment) {
        setName(editingInvestment.name);
        setType(editingInvestment.type);
        setInvestedAmountStr(String(editingInvestment.amountInvested));
        setCurrentValueStr(String(editingInvestment.currentValue ?? editingInvestment.amountInvested));
        setUnitsStr(editingInvestment.units ? String(editingInvestment.units) : '');
        setDate(editingInvestment.date || toDateString(new Date()));
        setNote(editingInvestment.note || '');
      } else {
        setName('');
        setType('Mutual Funds');
        setInvestedAmountStr('');
        setCurrentValueStr('');
        setUnitsStr('');
        setDate(toDateString(new Date()));
        setNote('');
      }
      setErrorMsg('');
      setConfirmDelete(false);
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, editingInvestment]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Please enter an asset or holding name');
      return;
    }

    const investedAmt = parseFloat(investedAmountStr);
    if (isNaN(investedAmt) || investedAmt <= 0) {
      setErrorMsg('Please enter a valid investment cost basis greater than ₹ 0');
      return;
    }

    const currentVal = currentValueStr.trim() !== '' ? parseFloat(currentValueStr) : investedAmt;
    if (isNaN(currentVal) || currentVal < 0) {
      setErrorMsg('Current value must be zero or a positive number');
      return;
    }

    const units = unitsStr.trim() !== '' ? parseFloat(unitsStr) : undefined;
    if (units !== undefined && (isNaN(units) || units < 0)) {
      setErrorMsg('Units must be a valid number');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingInvestment) {
        await updateInvestment({
          ...editingInvestment,
          name: trimmedName,
          type,
          amountInvested: Math.round(investedAmt),
          currentValue: Math.round(currentVal),
          units,
          date,
          note: note.trim() || undefined,
        });
      } else {
        await addInvestment({
          name: trimmedName,
          type,
          amountInvested: Math.round(investedAmt),
          currentValue: Math.round(currentVal),
          units,
          date,
          note: note.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save investment:', err);
      setErrorMsg(err.message || 'Failed to save asset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingInvestment) return;
    setIsSubmitting(true);
    try {
      await deleteInvestment(editingInvestment.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete asset');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--mv-border-subtle)] flex items-center justify-between bg-[var(--mv-surface-elevated)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--mv-cyan)]/15 text-[var(--mv-cyan)] flex items-center justify-center border border-[var(--mv-cyan)]/30">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">
                {editingInvestment ? 'Edit Investment Asset' : 'Add Investment Asset'}
              </h2>
              <p className="text-[11px] text-[var(--mv-text-secondary)]">
                Portfolio capital growth • Does not affect expense totals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {/* Asset Name */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Asset / Instrument Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              placeholder="e.g. Parag Parikh Flexi Cap, Reliance Industries, Sovereign Gold Bond"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-cyan)] text-[var(--mv-text-primary)] transition-all"
            />
          </div>

          {/* Asset Type */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Asset Category <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {ASSET_TYPES.map((t) => {
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 px-2 rounded-xl text-center font-bold text-[11px] border transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-[var(--mv-cyan)] text-[#0B0D0C] border-[var(--mv-cyan)] shadow-sm'
                        : 'bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] border-[var(--mv-border)] hover:border-[var(--mv-border-strong)]'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Invested & Current Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Cost Basis / Amount Invested (₹) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[var(--mv-text-muted)]">₹</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="50000"
                  value={investedAmountStr}
                  onChange={(e) => setInvestedAmountStr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-black text-sm tabular-nums focus:border-[var(--mv-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-cyan)] text-[var(--mv-text-primary)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Current Valuation (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[var(--mv-text-muted)]">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={investedAmountStr ? investedAmountStr : 'Same as invested'}
                  value={currentValueStr}
                  onChange={(e) => setCurrentValueStr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-black text-sm tabular-nums focus:border-[var(--mv-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--mv-cyan)] text-[var(--mv-text-primary)] transition-all"
                />
              </div>
              <span className="text-[10px] text-[var(--mv-text-muted)] mt-1 block">
                Leave empty to match invested amount
              </span>
            </div>
          </div>

          {/* Units and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Units / Quantity <span className="font-normal text-[var(--mv-text-muted)]">(optional)</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 150.25"
                value={unitsStr}
                onChange={(e) => setUnitsStr(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-cyan)] focus:outline-none text-[var(--mv-text-primary)]"
              />
            </div>

            <div>
              <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
                Purchase / Start Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-cyan)] focus:outline-none text-[var(--mv-text-primary)]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-[var(--mv-text-secondary)] block mb-1">
              Platform / Account / Notes <span className="font-normal text-[var(--mv-text-muted)]">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Zerodha, Groww, Folio #12345, 3-yr Lock-in"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-medium focus:border-[var(--mv-cyan)] focus:outline-none text-[var(--mv-text-primary)]"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[var(--mv-border-subtle)] flex items-center justify-between gap-3">
            {editingInvestment ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleDelete}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-2 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] rounded-xl font-semibold text-xs text-[var(--mv-text-secondary)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete Asset</span>
                </button>
              )
            ) : (
              <span className="text-[11px] text-[var(--mv-text-muted)] flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Saved into Investment Portfolio</span>
              </span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[var(--mv-cyan)] hover:brightness-110 text-[#0B0D0C] rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <TrendingUp size={14} />
                <span>{editingInvestment ? 'Update Asset' : 'Save Investment'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
