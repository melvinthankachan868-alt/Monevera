import React,{ useState,useRef } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import {
Camera,
Upload,
X,
CheckCircle2,
AlertCircle,
RefreshCw,
Sparkles,
Receipt,
Tag,
Calendar,
CreditCard,
Building,Check,
LogIn
} from 'lucide-react';
import { formatINR,toDateString } from '../utils/calculations';
import { CategoryType,PaymentMethod } from '../types';
import { AccountModal } from './AccountModal';
import { SIGN_IN_PROMPT,SESSION_EXPIRED_MSG,getAiErrorMessage } from '../utils/aiErrorHelper';

interface ReceiptScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseSaved?: (expenseId: string) => void;
}

interface ExtractedReceiptData {
  merchant?: string;
  amount?: number | null;
  currency?: string;
  date?: string | null;
  time?: string | null;
  category?: string;
  subcategory?: string | null;
  paymentMethod?: string;
  tax?: number | null;
  items?: Array<{ name: string; quantity?: number; price?: number }>;
  notes?: string | null;
  confidence?: 'high' | 'medium' | 'low';
  summary?: string;
}

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Utilities',
  'Transportation',
  'Healthcare',
  'Entertainment',
  'Personal Care',
  'Education',
  'Other',
];

export const ReceiptScanModal: React.FC<ReceiptScanModalProps> = ({
  isOpen,
  onClose,
  onExpenseSaved,
}) => {
  const { addExpense, user } = useFinTraQ();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ExtractedReceiptData | null>(null);

  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Editable review fields
  const [merchant, setMerchant] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(toDateString(new Date()));
  const [category, setCategory] = useState('Shopping');
  const [subcategory, setSubcategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    // Privacy invariant: Discard image data from memory
    setImagePreview(null);
    setScanResult(null);
    setErrorMsg(null);
    setIsSaving(false);
    setSavedSuccess(false);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';

    if (!user) {
      setErrorMsg(SIGN_IN_PROMPT);
      return;
    }

    if (file.size === 0) {
      setErrorMsg('The selected file is empty (0 bytes).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit. Please choose a smaller photo.');
      return;
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!validMimes.includes(file.type.toLowerCase()) && !hasValidExt) {
      setErrorMsg('Please select a valid image file (PNG, JPEG, WEBP, HEIC). PDF and text files are not supported.');
      return;
    }

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMsg('Failed to read image file. Please try again.');
    };
    reader.onload = (evt) => {
      const b64 = evt.target?.result as string;
      setImagePreview(b64);
      triggerOCR(b64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const triggerOCR = async (base64Data: string, type: string) => {
    if (!user) {
      setIsScanning(false);
      setErrorMsg(SIGN_IN_PROMPT);
      return;
    }

    setIsScanning(true);
    setErrorMsg(null);
    setScanResult(null);

    try {
      let token = '';
      try {
        const idToken = await user.getIdToken();
        if (idToken && typeof idToken === 'string' && idToken.trim().length > 0) {
          token = idToken.trim();
        }
      } catch {
        // Token error fallback
      }

      if (!token) {
        setIsScanning(false);
        setErrorMsg(SESSION_EXPIRED_MSG);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const res = await fetch('/api/ocr/receipt', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: type,
        }),
      });

      if (!res.ok) {
        setErrorMsg(getAiErrorMessage(res.status));
        return;
      }

      const data = await res.json();
      const extracted: ExtractedReceiptData = data.extracted || {};

      setScanResult(extracted);
      setMerchant(extracted.merchant && extracted.merchant !== 'Not detected' ? extracted.merchant : '');
      setAmountStr(extracted.amount ? String(extracted.amount) : '');
      setDate(extracted.date || toDateString(new Date()));
      setCategory(
        extracted.category && EXPENSE_CATEGORIES.includes(extracted.category)
          ? extracted.category
          : 'Shopping'
      );
      setSubcategory(extracted.subcategory || extracted.merchant || '');
      setPaymentMethod(
        extracted.paymentMethod && extracted.paymentMethod !== 'Not detected'
          ? extracted.paymentMethod
          : 'UPI'
      );
      setNotes(extracted.notes || extracted.summary || '');
    } catch (err: any) {
      console.error('OCR analysis failure:', err);
      setErrorMsg(getAiErrorMessage(500));
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveExpense = async () => {
    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid expense amount greater than ₹0');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      // Map category to standard bucket
      let bucketCategory: CategoryType = 'Wants';
      if (category === 'Groceries' || category === 'Utilities' || category === 'Healthcare' || category === 'Transportation') {
        bucketCategory = 'Needs';
      }

      const itemNote = [
        merchant ? `Merchant: ${merchant}` : '',
        notes ? notes : '',
        `Scanned via Mike OCR`,
      ].filter(Boolean).join(' • ');

      await addExpense({
        category: bucketCategory,
        subcategory: subcategory || category || merchant || 'Receipt Expense',
        amount: Math.round(amt),
        note: itemNote,
        date,
        paymentMethod: paymentMethod as PaymentMethod,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record expense');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--mv-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[var(--mv-text-primary)]">
                  Scan Receipt or Bill
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] border border-[var(--mv-primary)]/30">
                  Mike OCR
                </span>
              </div>
              <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
                Upload or capture a photo. Mike will extract details for your confirmation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2 flex-1">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
            {(errorMsg === SIGN_IN_PROMPT || errorMsg === SESSION_EXPIRED_MSG || !user) && (
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--mv-primary)] text-slate-950 font-bold hover:brightness-110 transition-all cursor-pointer text-xs shadow-xs"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        )}

        {/* Success confirmation */}
        {savedSuccess && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-center space-y-1 text-emerald-400 animate-in zoom-in-95">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
            <div className="font-extrabold text-sm text-[var(--mv-text-primary)]">Expense Recorded Successfully!</div>
            <div className="text-xs text-[var(--mv-text-secondary)]">Your budget, cash flow, and reports are updated.</div>
          </div>
        )}

        {/* Step 1: Upload Zone (Visible if no scan result yet) */}
        {!scanResult && !isScanning && !savedSuccess && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--mv-border)] hover:border-[var(--mv-primary)] bg-[var(--mv-bg-secondary)] hover:bg-[var(--mv-surface-hover)] rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--mv-surface)] border border-[var(--mv-border)] group-hover:border-[var(--mv-primary)] text-[var(--mv-primary)] flex items-center justify-center mx-auto shadow-sm transition-transform group-hover:scale-105">
                <Camera size={26} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-[var(--mv-text-primary)]">
                  Click or drag photo / screenshot here
                </div>
                <div className="text-xs text-[var(--mv-text-secondary)]">
                  Supports supermarket receipts, restaurant bills, online orders, utility invoices
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] shadow-xs">
                <Upload size={14} className="text-[var(--mv-primary)]" />
                <span>Select File or Camera</span>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="text-[11px] text-[var(--mv-text-muted)] flex items-center justify-center gap-2 text-center">
              <span>🔒 Privacy invariant: Image is analyzed in-memory and immediately discarded.</span>
            </div>
          </div>
        )}

        {/* Step 2: Scanning / Loading state */}
        {isScanning && (
          <div className="py-12 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-2xl bg-[var(--mv-primary)]/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-2xl bg-[var(--mv-surface)] border border-[var(--mv-primary)] text-[var(--mv-primary)] flex items-center justify-center shadow-lg">
                <RefreshCw size={28} className="animate-spin" />
              </div>
            </div>
            <div>
              <div className="text-sm font-extrabold text-[var(--mv-text-primary)]">
                Mike is analyzing receipt...
              </div>
              <div className="text-xs text-[var(--mv-text-secondary)] mt-1">
                Reading line items, merchant, tax, and final amount
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Confirmation Screen */}
        {scanResult && !savedSuccess && (
          <div className="space-y-4">
            {/* Detected Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-[var(--mv-primary)] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[var(--mv-text-primary)] block">
                    {scanResult.summary || 'Receipt analyzed by Mike'}
                  </span>
                  <span className="text-[10px] text-[var(--mv-text-muted)]">
                    Confidence: <span className="font-bold uppercase text-[var(--mv-primary)]">{scanResult.confidence || 'high'}</span> • Please verify fields before saving
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setScanResult(null);
                  setImagePreview(null);
                }}
                className="text-[11px] font-bold text-[var(--mv-primary)] hover:underline cursor-pointer"
              >
                Scan Again
              </button>
            </div>

            {/* Editable Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Amount */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[var(--mv-text-primary)] flex items-center justify-between">
                  <span>Amount (₹) *</span>
                  {!scanResult.amount && (
                    <span className="text-[10px] text-amber-500 font-bold">Needs review</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-[var(--mv-text-muted)]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-base font-black text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] tabular-nums shadow-xs"
                    autoFocus
                  />
                </div>
              </div>

              {/* Merchant / Store */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--mv-text-primary)] flex items-center justify-between">
                  <span>Merchant / Store</span>
                  {!merchant && <span className="text-[10px] text-amber-500">Not detected</span>}
                </label>
                <div className="relative">
                  <Building size={14} className="absolute left-3 top-3 text-[var(--mv-text-muted)]" />
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g. Amazon, Lulu, Starbucks"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] shadow-xs"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--mv-text-primary)] flex items-center gap-1.5">
                  <Calendar size={13} className="text-[var(--mv-text-muted)]" />
                  <span>Transaction Date</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] shadow-xs"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--mv-text-primary)] flex items-center gap-1.5">
                  <Tag size={13} className="text-[var(--mv-text-muted)]" />
                  <span>Category</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] shadow-xs"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--mv-text-primary)] flex items-center gap-1.5">
                  <CreditCard size={13} className="text-[var(--mv-text-muted)]" />
                  <span>Payment Method</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] shadow-xs"
                >
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Notes / Description */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[var(--mv-text-primary)]">
                  Notes / Line Items
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional itemized note"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)] shadow-xs"
                />
              </div>
            </div>

            {/* Extracted Items List if present */}
            {scanResult.items && scanResult.items.length > 0 && (
              <div className="p-3 bg-[var(--mv-bg-secondary)] rounded-xl border border-[var(--mv-border)] space-y-1.5 max-h-32 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mv-text-muted)] block">
                  Detected Line Items ({scanResult.items.length}):
                </span>
                {scanResult.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-[var(--mv-text-secondary)]">
                    <span className="truncate">{it.name} {it.quantity ? `× ${it.quantity}` : ''}</span>
                    <span className="tabular-nums font-semibold text-[var(--mv-text-primary)]">{it.price ? formatINR(it.price) : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirmation Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--mv-border)]">
              <button
                type="button"
                onClick={() => {
                  setScanResult(null);
                  setImagePreview(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-[var(--mv-border)] bg-[var(--mv-surface-hover)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] text-xs font-bold transition-all cursor-pointer"
              >
                Scan Again
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl border border-[var(--mv-border)] text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveExpense}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Expense</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
      />
    </div>
  );
};
