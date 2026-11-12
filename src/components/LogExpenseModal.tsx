import React,{ useState,useEffect,useRef } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import {
CategoryType,
PaymentMethod,
IncomeType,
AllowanceType,
BonusType,Expense
} from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatINR,toDateString } from '../utils/calculations';
import { X,Trash2,Plus } from 'lucide-react';

interface LogExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExpense?: Expense | null;
  initialType?: any;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'Other',
];

const INCOME_TYPES: IncomeType[] = [
  'Salary',
  'Freelance',
  'Business',
  'Investments',
  'Rental',
  'Gift',
  'Other',
];

const ALLOWANCE_TYPES: AllowanceType[] = [
  'Travel',
  'Food',
  'Housing',
  'Medical',
  'Transport',
  'Phone',
  'Daily',
  'Other',
];

const BONUS_TYPES: BonusType[] = [
  'Annual bonus',
  'Performance bonus',
  'Joining bonus',
  'Festival bonus',
  'Referral bonus',
  'Commission',
  'Cash gift',
  'Freelance payment',
  'Side income',
  'Other',
];

export const LogExpenseModal: React.FC<LogExpenseModalProps> = ({
  isOpen,
  onClose,
  editingExpense = null,
  initialType = 'expense',
}) => {
  const {
    addExpense,
    updateExpense,
    deleteExpense,
    addIncome,
    addAllowance,
    addBonus,
    addMoneyOwed,
    addLoan,
    addBill,
    addSubscription,
    recordEmergencyFundContribution,
    addTransfer,
    addSavings,
    addInvestment,
    addGoal,
    subcategories,
    addSubcategory,
    settings,
  } = useFinTraQ();

  type TabType =
    | 'expense'
    | 'income'
    | 'allowance'
    | 'bonus'
    | 'money_lent'
    | 'money_borrowed'
    | 'emergency_fund'
    | 'transfer';

  const [activeTab, setActiveTab] = useState<TabType>('expense');

  // Amount & Common
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toDateString(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(settings.defaultPaymentMethod || 'UPI');
  const [errorMsg, setErrorMsg] = useState('');

  // Expense fields
  const [category, setCategory] = useState<CategoryType>(settings.defaultCategory || 'Needs');
  const [subcategory, setSubcategory] = useState('');
  const [isAddingSubcat, setIsAddingSubcat] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState('');

  // Income fields
  const [incomeSource, setIncomeSource] = useState('Monthly Salary');
  const [incomeType, setIncomeType] = useState<IncomeType>('Salary');

  // Allowance fields
  const [allowanceName, setAllowanceName] = useState('Travel Allowance');
  const [allowanceType, setAllowanceType] = useState<AllowanceType>('Travel');
  const [allowanceRecurring, setAllowanceRecurring] = useState(true);

  // Bonus fields
  const [bonusName, setBonusName] = useState('Festival Bonus');
  const [bonusType, setBonusType] = useState<BonusType>('Festival bonus');

  // Money Owed fields (Lent & Borrowed)
  const [personName, setPersonName] = useState('');
  const [dueDate, setDueDate] = useState(toDateString(new Date(Date.now() + 30 * 86400000)));

  // Transfer fields
  const [fromAccount, setFromAccount] = useState('Salary Bank Account');
  const [toAccount, setToAccount] = useState('Emergency Fund');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSubcategories = subcategories.filter((s) => s.category === category);

  useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        setActiveTab('expense');
        setAmountStr(String(editingExpense.amount));
        setCategory(editingExpense.category);
        setSubcategory(editingExpense.subcategory);
        setPaymentMethod(editingExpense.paymentMethod || 'UPI');
        setNote(editingExpense.note || '');
        setDate(editingExpense.date);
      } else {
        const initialTabMap: Record<string, TabType> = {
          expense: 'expense',
          income: 'income',
          allowance: 'allowance',
          bonus: 'bonus',
          moneyOwed: 'money_lent',
          transfer: 'transfer',
        };
        setActiveTab(initialTabMap[initialType] || 'expense');
        setAmountStr('');
        setCategory(settings.defaultCategory || 'Needs');
        setPaymentMethod(settings.defaultPaymentMethod || 'UPI');
        setNote('');
        setDate(toDateString(new Date()));
        const defaultSub = subcategories.find((s) => s.category === (settings.defaultCategory || 'Needs'));
        setSubcategory(defaultSub ? defaultSub.name : 'Food');
      }
      setConfirmDelete(false);
      setErrorMsg('');
      setIsAddingSubcat(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingExpense, initialType, settings, subcategories]);

  const handleCategoryChange = (newCat: CategoryType) => {
    setCategory(newCat);
    const validSubs = subcategories.filter((s) => s.category === newCat);
    if (validSubs.length > 0) {
      setSubcategory(validSubs[0].name);
    }
  };

  const numericAmount = parseFloat(amountStr) || 0;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (numericAmount <= 0) {
      setErrorMsg('Please enter an amount greater than ₹ 0');
      inputRef.current?.focus();
      return;
    }

    try {
      if (activeTab === 'expense') {
        if (!subcategory.trim()) {
          setErrorMsg('Please specify a subcategory');
          return;
        }
        if (editingExpense) {
          await updateExpense({
            ...editingExpense,
            amount: Math.round(numericAmount),
            category,
            subcategory: subcategory.trim(),
            paymentMethod,
            note: note.trim() || undefined,
            date,
          });
        } else {
          await addExpense({
            amount: Math.round(numericAmount),
            category,
            subcategory: subcategory.trim(),
            paymentMethod,
            note: note.trim() || undefined,
            date,
          });
        }
      } else if (activeTab === 'income') {
        await addIncome({
          amount: Math.round(numericAmount),
          source: incomeSource.trim() || 'Salary',
          type: incomeType,
          date,
          note: note.trim() || undefined,
        });
      } else if (activeTab === 'allowance') {
        await addAllowance({
          name: allowanceName.trim() || `${allowanceType} Allowance`,
          amount: Math.round(numericAmount),
          type: allowanceType,
          date,
          recurring: allowanceRecurring,
          frequency: 'Monthly',
          source: incomeSource.trim() || 'Employer',
          note: note.trim() || undefined,
        });
      } else if (activeTab === 'bonus') {
        await addBonus({
          name: bonusName.trim() || `${bonusType}`,
          amount: Math.round(numericAmount),
          type: bonusType,
          date,
          source: incomeSource.trim() || 'Employer',
          note: note.trim() || undefined,
        });
      } else if (activeTab === 'money_lent') {
        if (!personName.trim()) {
          setErrorMsg('Please enter who you lent money to.');
          return;
        }
        await addMoneyOwed({
          type: 'lent',
          personName: personName.trim(),
          originalAmount: Math.round(numericAmount),
          remainingAmount: Math.round(numericAmount),
          dateGivenOrBorrowed: date,
          dueDate,
          paymentMethod,
          note: note.trim() || undefined,
          status: 'Pending',
          reminderEnabled: true,
          reminderDaysBefore: 3,
        });
      } else if (activeTab === 'money_borrowed') {
        if (!personName.trim()) {
          setErrorMsg('Please enter who you borrowed money from.');
          return;
        }
        await addMoneyOwed({
          type: 'borrowed',
          personName: personName.trim(),
          originalAmount: Math.round(numericAmount),
          remainingAmount: Math.round(numericAmount),
          dateGivenOrBorrowed: date,
          dueDate,
          paymentMethod,
          note: note.trim() || undefined,
          status: 'Pending',
          reminderEnabled: true,
          reminderDaysBefore: 3,
        });
      } else if (activeTab === 'emergency_fund') {
        await recordEmergencyFundContribution(Math.round(numericAmount), note.trim() || undefined);
      } else if (activeTab === 'transfer') {
        await addTransfer({
          fromAccount: fromAccount.trim() || 'Bank',
          toAccount: toAccount.trim() || 'Savings',
          amount: Math.round(numericAmount),
          date,
          note: note.trim() || undefined,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error saving financial record.');
    }
  };

  const handleDelete = async () => {
    if (!editingExpense) return;
    await deleteExpense(editingExpense.id);
    onClose();
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcatName.trim()) return;
    await addSubcategory(newSubcatName.trim(), category);
    setSubcategory(newSubcatName.trim());
    setNewSubcatName('');
    setIsAddingSubcat(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="vault-panel rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl border border-[var(--mv-border)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header & Tabs */}
        <div className="px-6 pt-5 pb-3 border-b border-[var(--mv-border)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--mv-text-primary)] tracking-tight">
              {editingExpense ? 'Edit Expense Record' : 'Record Financial Transaction'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] hover:bg-[#252B27] flex items-center justify-center text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {!editingExpense && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 text-[11px] font-bold">
              {[
                { id: 'expense', label: 'Expense' },
                { id: 'income', label: 'Income' },
                { id: 'allowance', label: 'Allowance' },
                { id: 'bonus', label: 'Bonus' },
                { id: 'money_lent', label: 'Lent (To Receive)' },
                { id: 'money_borrowed', label: 'Borrowed' },
                { id: 'emergency_fund', label: 'Emergency Fund' },
                { id: 'transfer', label: 'Transfer' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-1.5 px-3 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'btn-primary font-black shadow-xs'
                      : 'bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] hover:text-[var(--mv-text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
          {/* Big Amount Header */}
          <div className="text-center py-1">
            <span className="text-4xl font-extrabold text-[var(--mv-text-primary)] tracking-tight tabular-nums">
              {formatINR(numericAmount)}
            </span>
          </div>

          {/* Amount input box */}
          <div className="relative flex items-center bg-[var(--mv-bg-secondary)] rounded-2xl border border-[var(--mv-border)] focus-within:border-[#A8F34A] transition-all">
            <span className="pl-4 text-xl font-bold text-[#A8F34A]">₹</span>
            <input
              ref={inputRef}
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0"
              value={amountStr}
              onChange={(e) => {
                setAmountStr(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full py-3.5 pl-2 pr-4 text-xl font-bold text-[var(--mv-text-primary)] bg-transparent focus:outline-none tabular-nums placeholder:text-[var(--mv-text-muted)]"
              required
            />
            {amountStr && (
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="pr-4 text-xs font-semibold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          {errorMsg && <p className="text-xs text-[#FF7373] font-medium">{errorMsg}</p>}

          {/* ==================== EXPENSE TAB ==================== */}
          {activeTab === 'expense' && (
            <>
              <div>
                <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('Needs')}
                    className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer ${
                      category === 'Needs'
                        ? 'border-[#64D8FF]/50 bg-[#142028] text-[#64D8FF] shadow-xs'
                        : 'border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] hover:border-[var(--mv-border-strong)] hover:text-[var(--mv-text-primary)]'
                    }`}
                  >
                    <CategoryIcon category="Needs" name="Home" size={18} />
                    <span className="text-xs font-bold">Needs (50%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('Wants')}
                    className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer ${
                      category === 'Wants'
                        ? 'border-[#FFB84D]/50 bg-[#292212] text-[#FFB84D] shadow-xs'
                        : 'border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] hover:border-[var(--mv-border-strong)] hover:text-[var(--mv-text-primary)]'
                    }`}
                  >
                    <CategoryIcon category="Wants" name="ShoppingBag" size={18} />
                    <span className="text-xs font-bold">Wants (30%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('Savings')}
                    className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer ${
                      category === 'Savings'
                        ? 'border-[#78D64B]/50 bg-[#142018] text-[#78D64B] shadow-xs'
                        : 'border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] hover:border-[var(--mv-border-strong)] hover:text-[var(--mv-text-primary)]'
                    }`}
                  >
                    <CategoryIcon category="Savings" name="Coins" size={18} />
                    <span className="text-xs font-bold">Savings (20%)</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">
                    Subcategory
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingSubcat(!isAddingSubcat)}
                    className="text-[11px] font-semibold text-[#A8F34A] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    {isAddingSubcat ? 'Cancel' : 'Add custom'}
                  </button>
                </div>
                {isAddingSubcat ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Pet Care, Internet"
                      value={newSubcatName}
                      onChange={(e) => setNewSubcatName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-xs font-semibold text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[#A8F34A]"
                    />
                    <button
                      type="button"
                      onClick={handleCreateSubcategory}
                      className="btn-primary px-3 py-2 rounded-xl text-xs font-black cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[var(--mv-bg-secondary)] rounded-xl border border-[var(--mv-border)] text-xs font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[#A8F34A]"
                  >
                    {filteredSubcategories.map((sub) => (
                      <option key={sub.id} value={sub.name} className="bg-[var(--mv-surface)]">
                        {sub.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}

          {/* ==================== INCOME TAB ==================== */}
          {activeTab === 'income' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-1">
                  Income Source
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp, Freelance Client"
                  value={incomeSource}
                  onChange={(e) => setIncomeSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[var(--mv-primary)]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-1">
                  Income Classification
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {INCOME_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setIncomeType(t)}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        incomeType === t
                          ? 'border-[var(--mv-income)]/40 bg-[var(--mv-income)]/15 text-[var(--mv-income)]'
                          : 'border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] text-[var(--mv-text-secondary)] hover:border-[var(--mv-border-strong)] hover:text-[var(--mv-text-primary)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== ALLOWANCES TAB ==================== */}
          {activeTab === 'allowance' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] text-xs leading-relaxed">
                <b className="text-[var(--mv-text-primary)]">Separate Benefit:</b> Allowances (Travel, Food, Housing, etc.) are tracked as separate benefits and not merged into your normal salary.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-1">
                    Allowance Label
                  </label>
                  <input
                    type="text"
                    value={allowanceName}
                    onChange={(e) => setAllowanceName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-1">
                    Allowance Type
                  </label>
                  <select
                    value={allowanceType}
                    onChange={(e) => setAllowanceType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl font-semibold focus:outline-none focus:border-[var(--mv-primary)]"
                  >
                    {ALLOWANCE_TYPES.map((at) => (
                      <option key={at} value={at} className="bg-[var(--mv-surface)]">
                        {at} Allowance
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="al-recur"
                  checked={allowanceRecurring}
                  onChange={(e) => setAllowanceRecurring(e.target.checked)}
                  className="rounded accent-[var(--mv-primary)]"
                />
                <label htmlFor="al-recur" className="text-xs text-[var(--mv-text-secondary)] font-semibold cursor-pointer">
                  Recurring monthly allowance
                </label>
              </div>
            </div>
          )}

          {/* ==================== BONUSES TAB ==================== */}
          {activeTab === 'bonus' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[#1C1A14] border border-[#F4D35E]/30 text-[#F4D35E] text-xs leading-relaxed">
                <b>Variable Inflow:</b> Bonuses and cash gifts are variable compensations tracked separately from regular salary.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-1">
                    Bonus Title
                  </label>
                  <input
                    type="text"
                    value={bonusName}
                    onChange={(e) => setBonusName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-1">
                    Bonus Category
                  </label>
                  <select
                    value={bonusType}
                    onChange={(e) => setBonusType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl font-semibold focus:outline-none focus:border-[var(--mv-primary)]"
                  >
                    {BONUS_TYPES.map((bt) => (
                      <option key={bt} value={bt} className="bg-[var(--mv-surface)]">
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ==================== MONEY LENT / BORROWED TABS ==================== */}
          {(activeTab === 'money_lent' || activeTab === 'money_borrowed') && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] text-xs leading-relaxed">
                <b className="text-[var(--mv-text-primary)]">Informal Transfer:</b>{' '}
                {activeTab === 'money_lent'
                  ? 'Money you gave to someone that they need to return to you (Money to receive).'
                  : 'Money you borrowed that you need to return to someone (Money to repay).'}
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-1">
                  Person's Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul, Arun, Anu"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[var(--mv-primary)]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-1">
                  Expected Return Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl font-semibold focus:outline-none focus:border-[var(--mv-primary)]"
                  required
                />
              </div>
            </div>
          )}

          {/* ==================== EMERGENCY FUND TAB ==================== */}
          {activeTab === 'emergency_fund' && (
            <div className="space-y-2">
              <div className="p-3 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-400 text-xs leading-relaxed">
                <b>Reserve Allocation:</b> This deposit adds directly to your dedicated emergency safety cushion.
              </div>
            </div>
          )}

          {/* ==================== TRANSFER TAB ==================== */}
          {activeTab === 'transfer' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] text-xs leading-relaxed">
                <b className="text-[var(--mv-text-primary)]">Internal Transfer:</b> Moving money between your own accounts is never counted as an expense or income.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-1">
                    From Account
                  </label>
                  <input
                    type="text"
                    value={fromAccount}
                    onChange={(e) => setFromAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider block mb-1">
                    To Account
                  </label>
                  <input
                    type="text"
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Common Date, Payment Method & Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl focus:outline-none focus:border-[var(--mv-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-semibold bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] border border-[var(--mv-border)] rounded-xl focus:outline-none focus:border-[var(--mv-primary)]"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm} className="bg-[var(--mv-surface)]">
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1">
              Description / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="Add short note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-xl text-[var(--mv-text-primary)] placeholder-[#69716B] focus:outline-none focus:border-[var(--mv-primary)]"
            />
          </div>

          {/* Confirm Delete prompt */}
          {editingExpense && confirmDelete && (
            <div className="p-3.5 bg-[#2D1616] border border-[#FF7373]/30 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-[#FF7373]">Delete this expense record?</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-[#FF7373] text-[#0B0D0C] rounded-xl text-xs font-black cursor-pointer"
                >
                  Yes, delete
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            {editingExpense && !confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-danger p-3.5 rounded-2xl transition-colors cursor-pointer"
                title="Delete expense"
              >
                <Trash2 size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn-primary flex-1 py-3 px-6 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {editingExpense ? 'Save Changes' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
