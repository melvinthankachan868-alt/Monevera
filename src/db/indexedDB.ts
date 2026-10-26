/**
 * Money Vault Local-First Storage Engine
 * Clean IndexedDB storage layer with versioned migrations and localStorage fallback.
 * 100% Private - Works fully offline and caches all entities locally.
 */

import {
  AppSettings,
  Income,
  Allowance,
  Bonus,
  Expense,
  SavingsRecord,
  Investment,
  FinancialGoal,
  RecurringTransaction,
  SubcategoryBudget,
  Subcategory,
  Alert,
  AlertHistory,
  ChatMessage,
  MoneyOwed,
  MoneyOwedPayment,
  Loan,
  LoanPayment,
  Bill,
  Subscription,
  EmergencyFund,
  EmergencyFundContribution,
  FinancialReminder,
  AppNotification,
  Transfer,
  FinancialAccount,
  SplitGroup,
  GroupExpense,
  GroupSettlement,
} from '../types';
import { DEFAULT_SETTINGS, DEFAULT_SUBCATEGORIES } from '../constants/defaults';

const DB_NAME = 'monvera_db';
const DB_VERSION = 5; // Upgraded schema for Group Expenses & Settlements

const STORE_SETTINGS = 'settings';
const STORE_INCOME = 'income';
const STORE_ALLOWANCES = 'allowances';
const STORE_BONUSES = 'bonuses';
const STORE_EXPENSES = 'expenses';
const STORE_BUDGETS = 'budgets';
const STORE_SUBCATEGORIES = 'subcategories';
const STORE_SAVINGS = 'savings';
const STORE_INVESTMENTS = 'investments';
const STORE_GOALS = 'goals';
const STORE_RECURRING = 'recurring';
const STORE_MONEY_OWED = 'money_owed';
const STORE_LOANS = 'loans';
const STORE_BILLS = 'bills';
const STORE_SUBSCRIPTIONS = 'subscriptions';
const STORE_EMERGENCY_FUND = 'emergency_fund';
const STORE_REMINDERS = 'reminders';
const STORE_NOTIFICATIONS = 'notifications';
const STORE_TRANSFERS = 'transfers';
const STORE_ACCOUNTS = 'accounts';
const STORE_ALERTS = 'alerts';
const STORE_ALERT_HISTORY = 'alert_history';
const STORE_CHAT_MESSAGES = 'chat_messages';
const STORE_SPLIT_GROUPS = 'split_groups';
const STORE_SPLIT_EXPENSES = 'split_expenses';
const STORE_SPLIT_SETTLEMENTS = 'split_settlements';

export interface MoneyVaultBackup {
  app: 'Money Vault' | 'Monvera';
  version: 3;
  exportedAt: string;
  data: {
    settings: AppSettings;
    income: Income[];
    allowances: Allowance[];
    bonuses: Bonus[];
    expenses: Expense[];
    budgets: SubcategoryBudget[];
    subcategories: Subcategory[];
    savings: SavingsRecord[];
    investments: Investment[];
    goals: FinancialGoal[];
    moneyOwed: MoneyOwed[];
    loans: Loan[];
    bills: Bill[];
    subscriptions: Subscription[];
    emergencyFund: EmergencyFund | null;
    reminders: FinancialReminder[];
    transfers: Transfer[];
    accounts: FinancialAccount[];
  };
}

class StorageEngine {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private isIndexedDBAvailable: boolean = true;
  private currentScope: string = 'guest';
  private activeDb: IDBDatabase | null = null;
  private memoryFallback: Map<string, string> = new Map();

  constructor() {
    this.isIndexedDBAvailable = typeof window !== 'undefined' && 'indexedDB' in window;
    this.migrateLegacyLocalStorageOnce();
  }

  /**
   * Get active isolation scope ('guest' | 'user_<uid>')
   */
  public getScope(): string {
    return this.currentScope;
  }

  /**
   * Switch active isolation scope.
   * Completely closes and isolates the database and storage namespaces.
   */
  public async setScope(scope: string): Promise<void> {
    const normalized = scope && typeof scope === 'string' && scope.trim().length > 0 ? scope.trim() : 'guest';
    if (this.currentScope === normalized && this.activeDb) {
      return;
    }

    if (this.activeDb) {
      try {
        this.activeDb.close();
      } catch {}
      this.activeDb = null;
    }
    this.dbPromise = null;
    this.currentScope = normalized;

    if (this.currentScope === 'guest') {
      this.migrateLegacyLocalStorageOnce();
    }

    // Pre-initialize new scoped database connection
    await this.getDB();
  }

  /**
   * Deterministic isolated IndexedDB database name per account
   */
  private getDbName(): string {
    return this.currentScope === 'guest' ? 'monvera_vault_guest' : `monvera_vault_${this.currentScope}`;
  }

  /**
   * Deterministic isolated localStorage fallback key per account
   */
  private getFallbackKey(key: string): string {
    return `monvera_${this.currentScope}_${key}`;
  }

  /**
   * Safe one-time migration from legacy unscoped localStorage to scoped guest storage
   */
  private migrateLegacyLocalStorageOnce() {
    try {
      if (typeof localStorage === 'undefined') return;
      const alreadyDone = localStorage.getItem('monvera_legacy_migrated');
      if (alreadyDone === 'true') return;

      const keys = [
        'settings',
        'income',
        'allowances',
        'bonuses',
        'expenses',
        'budgets',
        'subcategories',
        'savings',
        'investments',
        'goals',
        'recurring',
        'money_owed',
        'loans',
        'bills',
        'subscriptions',
        'emergency_fund',
        'reminders',
        'notifications',
        'transfers',
        'accounts',
        'alerts',
        'alert_history',
        'chat_messages',
        'split_groups',
        'split_expenses',
        'split_settlements',
      ];

      for (const k of keys) {
        const legacyVal = localStorage.getItem(`monvera_${k}`);
        const targetKey = `monvera_guest_${k}`;
        if (legacyVal && !localStorage.getItem(targetKey)) {
          localStorage.setItem(targetKey, legacyVal);
        }
      }
      localStorage.setItem('monvera_legacy_migrated', 'true');
    } catch {}
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (!this.isIndexedDBAvailable) return null;
    if (this.dbPromise) return this.dbPromise;

    const dbName = this.getDbName();

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(dbName, DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const stores = [
            STORE_SETTINGS,
            STORE_INCOME,
            STORE_ALLOWANCES,
            STORE_BONUSES,
            STORE_EXPENSES,
            STORE_BUDGETS,
            STORE_SUBCATEGORIES,
            STORE_SAVINGS,
            STORE_INVESTMENTS,
            STORE_GOALS,
            STORE_RECURRING,
            STORE_MONEY_OWED,
            STORE_LOANS,
            STORE_BILLS,
            STORE_SUBSCRIPTIONS,
            STORE_EMERGENCY_FUND,
            STORE_REMINDERS,
            STORE_NOTIFICATIONS,
            STORE_TRANSFERS,
            STORE_ACCOUNTS,
            STORE_ALERTS,
            STORE_ALERT_HISTORY,
            STORE_CHAT_MESSAGES,
            STORE_SPLIT_GROUPS,
            STORE_SPLIT_EXPENSES,
            STORE_SPLIT_SETTLEMENTS,
          ];

          for (const s of stores) {
            if (!db.objectStoreNames.contains(s)) {
              if (s === STORE_SETTINGS || s === STORE_EMERGENCY_FUND) {
                db.createObjectStore(s);
              } else {
                db.createObjectStore(s, { keyPath: 'id' });
              }
            }
          }
        };

        request.onsuccess = () => {
          this.activeDb = request.result;
          this.activeDb.onclose = () => {
            this.activeDb = null;
            this.dbPromise = null;
          };
          resolve(request.result);
        };
        request.onerror = () => {
          this.isIndexedDBAvailable = false;
          resolve(null);
        };
      } catch (err) {
        this.isIndexedDBAvailable = false;
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  // Generic helpers
  private async getAllFromStore<T>(storeName: string, fallbackKey: string): Promise<T[]> {
    const db = await this.getDB();
    if (db) {
      try {
        return await new Promise<T[]>((resolve) => {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
          req.onerror = () => resolve(this.getFallbackArray<T>(fallbackKey));
        });
      } catch {
        return this.getFallbackArray<T>(fallbackKey);
      }
    }
    return this.getFallbackArray<T>(fallbackKey);
  }

  private async setAllInStore<T extends { id: string }>(
    storeName: string,
    fallbackKey: string,
    items: T[]
  ): Promise<void> {
    let idbSuccess = false;
    let idbError: any = null;

    const db = await this.getDB();
    if (db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          tx.oncomplete = () => resolve();
          tx.onerror = (e) => reject((e.target as any)?.error || new Error(`IndexedDB transaction failed for ${storeName}`));
          tx.onabort = (e) => reject((e.target as any)?.error || new Error(`IndexedDB transaction aborted for ${storeName}`));
          const store = tx.objectStore(storeName);
          store.clear();
          for (const item of items) {
            store.put(item);
          }
        });
        idbSuccess = true;
      } catch (e: any) {
        idbError = e;
        console.warn(`[StorageEngine] IDB write error on ${storeName}:`, e?.message || e);
      }
    }

    let fallbackSuccess = false;
    let fallbackError: any = null;
    try {
      this.saveFallbackArray(fallbackKey, items);
      fallbackSuccess = true;
    } catch (e: any) {
      fallbackError = e;
      console.warn(`[StorageEngine] Fallback storage error on ${fallbackKey}:`, e?.message || e);
    }

    if (!idbSuccess && !fallbackSuccess) {
      throw idbError || fallbackError || new Error(`Failed to persist records to ${storeName}: storage unavailable or quota exceeded.`);
    }
  }

  private getFallbackArray<T>(key: string): T[] {
    const scopedKey = this.getFallbackKey(key);
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(scopedKey);
        if (item) return JSON.parse(item);
      } catch {}
      return [];
    } else {
      const item = this.memoryFallback.get(scopedKey);
      if (item) {
        try {
          return JSON.parse(item);
        } catch {}
      }
      return [];
    }
  }

  private saveFallbackArray<T>(key: string, items: T[]) {
    const scopedKey = this.getFallbackKey(key);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(scopedKey, JSON.stringify(items));
      } catch (err) {
        throw new Error(`Device storage unavailable or quota exceeded: ${(err as any)?.message || err}`);
      }
    } else {
      this.memoryFallback.set(scopedKey, JSON.stringify(items));
    }
  }

  // --- SETTINGS ---
  async getSettings(): Promise<AppSettings> {
    const db = await this.getDB();
    if (db) {
      try {
        return await new Promise((resolve) => {
          const tx = db.transaction(STORE_SETTINGS, 'readonly');
          const store = tx.objectStore(STORE_SETTINGS);
          const req = store.get('app_settings');
          req.onsuccess = () => {
            if (req.result) resolve(req.result);
            else resolve(this.getFallbackSettings());
          };
          req.onerror = () => resolve(this.getFallbackSettings());
        });
      } catch {
        return this.getFallbackSettings();
      }
    }
    return this.getFallbackSettings();
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    let idbSuccess = false;
    let idbError: any = null;

    const db = await this.getDB();
    if (db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_SETTINGS, 'readwrite');
          tx.oncomplete = () => resolve();
          tx.onerror = (e) => reject((e.target as any)?.error || new Error('Could not save settings'));
          tx.onabort = (e) => reject((e.target as any)?.error || new Error('Settings transaction aborted'));
          tx.objectStore(STORE_SETTINGS).put(settings, 'app_settings');
        });
        idbSuccess = true;
      } catch (e: any) {
        idbError = e;
      }
    }

    let fallbackSuccess = false;
    let fallbackError: any = null;
    const scopedKey = this.getFallbackKey('settings');
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(scopedKey, JSON.stringify(settings));
        fallbackSuccess = true;
      } catch (e: any) {
        fallbackError = e;
      }
    } else {
      this.memoryFallback.set(scopedKey, JSON.stringify(settings));
      fallbackSuccess = true;
    }

    if (!idbSuccess && !fallbackSuccess) {
      throw idbError || fallbackError || new Error('Failed to save settings: storage unavailable or quota exceeded.');
    }
  }

  private getFallbackSettings(): AppSettings {
    const scopedKey = this.getFallbackKey('settings');
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(scopedKey);
        if (item) return JSON.parse(item);
      } catch {}
    } else {
      const item = this.memoryFallback.get(scopedKey);
      if (item) {
        try {
          return JSON.parse(item);
        } catch {}
      }
    }
    return DEFAULT_SETTINGS;
  }

  // --- INCOME ---
  async getIncomes(): Promise<Income[]> {
    return this.getAllFromStore<Income>(STORE_INCOME, 'income');
  }
  async saveIncome(income: Income): Promise<void> {
    const list = await this.getIncomes();
    const idx = list.findIndex((i) => i.id === income.id);
    if (idx >= 0) list[idx] = income;
    else list.unshift(income);
    await this.setAllInStore(STORE_INCOME, 'income', list);
  }
  async deleteIncome(id: string): Promise<void> {
    const list = await this.getIncomes();
    await this.setAllInStore(STORE_INCOME, 'income', list.filter((i) => i.id !== id));
  }
  async setAllIncomes(incomes: Income[]): Promise<void> {
    await this.setAllInStore(STORE_INCOME, 'income', incomes);
  }

  // --- ALLOWANCES ---
  async getAllowances(): Promise<Allowance[]> {
    return this.getAllFromStore<Allowance>(STORE_ALLOWANCES, 'allowances');
  }
  async saveAllowance(allowance: Allowance): Promise<void> {
    const list = await this.getAllowances();
    const idx = list.findIndex((a) => a.id === allowance.id);
    if (idx >= 0) list[idx] = allowance;
    else list.unshift(allowance);
    await this.setAllInStore(STORE_ALLOWANCES, 'allowances', list);
  }
  async deleteAllowance(id: string): Promise<void> {
    const list = await this.getAllowances();
    await this.setAllInStore(STORE_ALLOWANCES, 'allowances', list.filter((a) => a.id !== id));
  }
  async setAllAllowances(allowances: Allowance[]): Promise<void> {
    await this.setAllInStore(STORE_ALLOWANCES, 'allowances', allowances);
  }

  // --- BONUSES ---
  async getBonuses(): Promise<Bonus[]> {
    return this.getAllFromStore<Bonus>(STORE_BONUSES, 'bonuses');
  }
  async saveBonus(bonus: Bonus): Promise<void> {
    const list = await this.getBonuses();
    const idx = list.findIndex((b) => b.id === bonus.id);
    if (idx >= 0) list[idx] = bonus;
    else list.unshift(bonus);
    await this.setAllInStore(STORE_BONUSES, 'bonuses', list);
  }
  async deleteBonus(id: string): Promise<void> {
    const list = await this.getBonuses();
    await this.setAllInStore(STORE_BONUSES, 'bonuses', list.filter((b) => b.id !== id));
  }
  async setAllBonuses(bonuses: Bonus[]): Promise<void> {
    await this.setAllInStore(STORE_BONUSES, 'bonuses', bonuses);
  }

  // --- EXPENSES ---
  async getExpenses(): Promise<Expense[]> {
    return this.getAllFromStore<Expense>(STORE_EXPENSES, 'expenses');
  }
  async saveExpense(expense: Expense): Promise<void> {
    const list = await this.getExpenses();
    const idx = list.findIndex((e) => e.id === expense.id);
    if (idx >= 0) list[idx] = expense;
    else list.unshift(expense);
    await this.setAllInStore(STORE_EXPENSES, 'expenses', list);
  }
  async deleteExpense(id: string): Promise<void> {
    const list = await this.getExpenses();
    await this.setAllInStore(STORE_EXPENSES, 'expenses', list.filter((e) => e.id !== id));
  }
  async setAllExpenses(expenses: Expense[]): Promise<void> {
    await this.setAllInStore(STORE_EXPENSES, 'expenses', expenses);
  }

  // --- MONEY OWED ---
  async getMoneyOwed(): Promise<MoneyOwed[]> {
    return this.getAllFromStore<MoneyOwed>(STORE_MONEY_OWED, 'money_owed');
  }
  async saveMoneyOwed(item: MoneyOwed): Promise<void> {
    const list = await this.getMoneyOwed();
    const idx = list.findIndex((m) => m.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    await this.setAllInStore(STORE_MONEY_OWED, 'money_owed', list);
  }
  async deleteMoneyOwed(id: string): Promise<void> {
    const list = await this.getMoneyOwed();
    await this.setAllInStore(STORE_MONEY_OWED, 'money_owed', list.filter((m) => m.id !== id));
  }
  async setAllMoneyOwed(items: MoneyOwed[]): Promise<void> {
    await this.setAllInStore(STORE_MONEY_OWED, 'money_owed', items);
  }

  // --- LOANS ---
  async getLoans(): Promise<Loan[]> {
    return this.getAllFromStore<Loan>(STORE_LOANS, 'loans');
  }
  async saveLoan(loan: Loan): Promise<void> {
    const list = await this.getLoans();
    const idx = list.findIndex((l) => l.id === loan.id);
    if (idx >= 0) list[idx] = loan;
    else list.unshift(loan);
    await this.setAllInStore(STORE_LOANS, 'loans', list);
  }
  async deleteLoan(id: string): Promise<void> {
    const list = await this.getLoans();
    await this.setAllInStore(STORE_LOANS, 'loans', list.filter((l) => l.id !== id));
  }
  async setAllLoans(loans: Loan[]): Promise<void> {
    await this.setAllInStore(STORE_LOANS, 'loans', loans);
  }

  // --- BILLS ---
  async getBills(): Promise<Bill[]> {
    return this.getAllFromStore<Bill>(STORE_BILLS, 'bills');
  }
  async saveBill(bill: Bill): Promise<void> {
    const list = await this.getBills();
    const idx = list.findIndex((b) => b.id === bill.id);
    if (idx >= 0) list[idx] = bill;
    else list.unshift(bill);
    await this.setAllInStore(STORE_BILLS, 'bills', list);
  }
  async deleteBill(id: string): Promise<void> {
    const list = await this.getBills();
    await this.setAllInStore(STORE_BILLS, 'bills', list.filter((b) => b.id !== id));
  }
  async setAllBills(bills: Bill[]): Promise<void> {
    await this.setAllInStore(STORE_BILLS, 'bills', bills);
  }

  // --- SUBSCRIPTIONS ---
  async getSubscriptions(): Promise<Subscription[]> {
    return this.getAllFromStore<Subscription>(STORE_SUBSCRIPTIONS, 'subscriptions');
  }
  async saveSubscription(sub: Subscription): Promise<void> {
    const list = await this.getSubscriptions();
    const idx = list.findIndex((s) => s.id === sub.id);
    if (idx >= 0) list[idx] = sub;
    else list.unshift(sub);
    await this.setAllInStore(STORE_SUBSCRIPTIONS, 'subscriptions', list);
  }
  async deleteSubscription(id: string): Promise<void> {
    const list = await this.getSubscriptions();
    await this.setAllInStore(STORE_SUBSCRIPTIONS, 'subscriptions', list.filter((s) => s.id !== id));
  }
  async setAllSubscriptions(subs: Subscription[]): Promise<void> {
    await this.setAllInStore(STORE_SUBSCRIPTIONS, 'subscriptions', subs);
  }

  // --- EMERGENCY FUND ---
  async getEmergencyFund(): Promise<EmergencyFund | null> {
    const db = await this.getDB();
    if (db) {
      try {
        return await new Promise((resolve) => {
          const tx = db.transaction(STORE_EMERGENCY_FUND, 'readonly');
          const store = tx.objectStore(STORE_EMERGENCY_FUND);
          const req = store.get('main');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch {
        return null;
      }
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(this.getFallbackKey('emergency_fund'));
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    }
    return null;
  }
  async saveEmergencyFund(fund: EmergencyFund): Promise<void> {
    let idbSuccess = false;
    let idbError: any = null;

    const db = await this.getDB();
    if (db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_EMERGENCY_FUND, 'readwrite');
          tx.oncomplete = () => resolve();
          tx.onerror = (e) => reject((e.target as any)?.error || new Error('Could not save emergency fund'));
          tx.onabort = (e) => reject((e.target as any)?.error || new Error('Emergency fund transaction aborted'));
          tx.objectStore(STORE_EMERGENCY_FUND).put(fund, 'main');
        });
        idbSuccess = true;
      } catch (e: any) {
        idbError = e;
      }
    }

    let fallbackSuccess = false;
    let fallbackError: any = null;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.getFallbackKey('emergency_fund'), JSON.stringify(fund));
        fallbackSuccess = true;
      } catch (e: any) {
        fallbackError = e;
      }
    }

    if (!idbSuccess && !fallbackSuccess) {
      throw idbError || fallbackError || new Error('Failed to save emergency fund: storage unavailable or quota exceeded.');
    }
  }

  // --- REMINDERS ---
  async getReminders(): Promise<FinancialReminder[]> {
    return this.getAllFromStore<FinancialReminder>(STORE_REMINDERS, 'reminders');
  }
  async saveReminder(rem: FinancialReminder): Promise<void> {
    const list = await this.getReminders();
    const idx = list.findIndex((r) => r.id === rem.id);
    if (idx >= 0) list[idx] = rem;
    else list.unshift(rem);
    await this.setAllInStore(STORE_REMINDERS, 'reminders', list);
  }
  async deleteReminder(id: string): Promise<void> {
    const list = await this.getReminders();
    await this.setAllInStore(STORE_REMINDERS, 'reminders', list.filter((r) => r.id !== id));
  }
  async setAllReminders(rems: FinancialReminder[]): Promise<void> {
    await this.setAllInStore(STORE_REMINDERS, 'reminders', rems);
  }

  // --- NOTIFICATIONS ---
  async getNotifications(): Promise<AppNotification[]> {
    return this.getAllFromStore<AppNotification>(STORE_NOTIFICATIONS, 'notifications');
  }
  async saveNotification(notif: AppNotification): Promise<void> {
    const list = await this.getNotifications();
    const idx = list.findIndex((n) => n.id === notif.id);
    if (idx >= 0) list[idx] = notif;
    else list.unshift(notif);
    await this.setAllInStore(STORE_NOTIFICATIONS, 'notifications', list);
  }
  async setAllNotifications(notifs: AppNotification[]): Promise<void> {
    await this.setAllInStore(STORE_NOTIFICATIONS, 'notifications', notifs);
  }

  // --- TRANSFERS ---
  async getTransfers(): Promise<Transfer[]> {
    return this.getAllFromStore<Transfer>(STORE_TRANSFERS, 'transfers');
  }
  async saveTransfer(tr: Transfer): Promise<void> {
    const list = await this.getTransfers();
    list.unshift(tr);
    await this.setAllInStore(STORE_TRANSFERS, 'transfers', list);
  }

  // --- ACCOUNTS ---
  async getAccounts(): Promise<FinancialAccount[]> {
    return this.getAllFromStore<FinancialAccount>(STORE_ACCOUNTS, 'accounts');
  }
  async saveAccount(acc: FinancialAccount): Promise<void> {
    const list = await this.getAccounts();
    const idx = list.findIndex((a) => a.id === acc.id);
    if (idx >= 0) list[idx] = acc;
    else list.push(acc);
    await this.setAllInStore(STORE_ACCOUNTS, 'accounts', list);
  }

  // --- BUDGETS ---
  async getBudgets(): Promise<SubcategoryBudget[]> {
    return this.getAllFromStore<SubcategoryBudget>(STORE_BUDGETS, 'budgets');
  }
  async saveBudget(budget: SubcategoryBudget): Promise<void> {
    const list = await this.getBudgets();
    const idx = list.findIndex(
      (b) =>
        b.subcategory.toLowerCase() === budget.subcategory.toLowerCase() &&
        b.month === budget.month
    );
    if (idx >= 0) list[idx] = budget;
    else list.push(budget);
    await this.setAllInStore(STORE_BUDGETS, 'budgets', list);
  }
  async setAllBudgets(budgets: SubcategoryBudget[]): Promise<void> {
    await this.setAllInStore(STORE_BUDGETS, 'budgets', budgets);
  }

  // --- SUBCATEGORIES ---
  async getSubcategories(): Promise<Subcategory[]> {
    const res = await this.getAllFromStore<Subcategory>(STORE_SUBCATEGORIES, 'subcategories');
    return res.length > 0 ? res : DEFAULT_SUBCATEGORIES;
  }
  async saveSubcategory(subcat: Subcategory): Promise<void> {
    const list = await this.getSubcategories();
    const idx = list.findIndex((s) => s.id === subcat.id);
    if (idx >= 0) list[idx] = subcat;
    else list.push(subcat);
    await this.setAllInStore(STORE_SUBCATEGORIES, 'subcategories', list);
  }
  async deleteSubcategory(id: string): Promise<void> {
    const list = await this.getSubcategories();
    await this.setAllInStore(STORE_SUBCATEGORIES, 'subcategories', list.filter((s) => s.id !== id));
  }
  async setAllSubcategories(subcats: Subcategory[]): Promise<void> {
    await this.setAllInStore(STORE_SUBCATEGORIES, 'subcategories', subcats);
  }

  // --- SAVINGS ---
  async getSavings(): Promise<SavingsRecord[]> {
    return this.getAllFromStore<SavingsRecord>(STORE_SAVINGS, 'savings');
  }
  async saveSavings(savings: SavingsRecord): Promise<void> {
    const list = await this.getSavings();
    const idx = list.findIndex((s) => s.id === savings.id);
    if (idx >= 0) list[idx] = savings;
    else list.unshift(savings);
    await this.setAllInStore(STORE_SAVINGS, 'savings', list);
  }
  async deleteSavings(id: string): Promise<void> {
    const list = await this.getSavings();
    await this.setAllInStore(STORE_SAVINGS, 'savings', list.filter((s) => s.id !== id));
  }
  async setAllSavings(savings: SavingsRecord[]): Promise<void> {
    await this.setAllInStore(STORE_SAVINGS, 'savings', savings);
  }

  // --- INVESTMENTS ---
  async getInvestments(): Promise<Investment[]> {
    return this.getAllFromStore<Investment>(STORE_INVESTMENTS, 'investments');
  }
  async saveInvestment(investment: Investment): Promise<void> {
    const list = await this.getInvestments();
    const idx = list.findIndex((i) => i.id === investment.id);
    if (idx >= 0) list[idx] = investment;
    else list.unshift(investment);
    await this.setAllInStore(STORE_INVESTMENTS, 'investments', list);
  }
  async deleteInvestment(id: string): Promise<void> {
    const list = await this.getInvestments();
    await this.setAllInStore(STORE_INVESTMENTS, 'investments', list.filter((i) => i.id !== id));
  }
  async setAllInvestments(investments: Investment[]): Promise<void> {
    await this.setAllInStore(STORE_INVESTMENTS, 'investments', investments);
  }

  // --- GOALS ---
  async getGoals(): Promise<FinancialGoal[]> {
    return this.getAllFromStore<FinancialGoal>(STORE_GOALS, 'goals');
  }
  async saveGoal(goal: FinancialGoal): Promise<void> {
    const list = await this.getGoals();
    const idx = list.findIndex((g) => g.id === goal.id);
    if (idx >= 0) list[idx] = goal;
    else list.push(goal);
    await this.setAllInStore(STORE_GOALS, 'goals', list);
  }
  async deleteGoal(id: string): Promise<void> {
    const list = await this.getGoals();
    await this.setAllInStore(STORE_GOALS, 'goals', list.filter((g) => g.id !== id));
  }
  async setAllGoals(goals: FinancialGoal[]): Promise<void> {
    await this.setAllInStore(STORE_GOALS, 'goals', goals);
  }

  // --- RECURRING ---
  async getRecurring(): Promise<RecurringTransaction[]> {
    return this.getAllFromStore<RecurringTransaction>(STORE_RECURRING, 'recurring');
  }
  async saveRecurring(rec: RecurringTransaction): Promise<void> {
    const list = await this.getRecurring();
    const idx = list.findIndex((r) => r.id === rec.id);
    if (idx >= 0) list[idx] = rec;
    else list.push(rec);
    await this.setAllInStore(STORE_RECURRING, 'recurring', list);
  }
  async deleteRecurring(id: string): Promise<void> {
    const list = await this.getRecurring();
    await this.setAllInStore(STORE_RECURRING, 'recurring', list.filter((r) => r.id !== id));
  }

  // --- ALERTS ---
  async getAlerts(): Promise<Alert[]> {
    return this.getAllFromStore<Alert>(STORE_ALERTS, 'alerts');
  }
  async saveAlert(alert: Alert): Promise<void> {
    const list = await this.getAlerts();
    const idx = list.findIndex((a) => a.id === alert.id);
    if (idx >= 0) list[idx] = alert;
    else list.push(alert);
    await this.setAllInStore(STORE_ALERTS, 'alerts', list);
  }
  async deleteAlert(id: string): Promise<void> {
    const list = await this.getAlerts();
    await this.setAllInStore(STORE_ALERTS, 'alerts', list.filter((a) => a.id !== id));
  }
  async setAllAlerts(alerts: Alert[]): Promise<void> {
    await this.setAllInStore(STORE_ALERTS, 'alerts', alerts);
  }

  // --- ALERT HISTORY ---
  async getAlertHistory(): Promise<AlertHistory[]> {
    return this.getAllFromStore<AlertHistory>(STORE_ALERT_HISTORY, 'alert_history');
  }
  async saveAlertHistory(item: AlertHistory): Promise<void> {
    const list = await this.getAlertHistory();
    list.unshift(item);
    await this.setAllInStore(STORE_ALERT_HISTORY, 'alert_history', list.slice(0, 100));
  }
  async setAllAlertHistory(items: AlertHistory[]): Promise<void> {
    await this.setAllInStore(STORE_ALERT_HISTORY, 'alert_history', items);
  }

  // --- CHAT MESSAGES ---
  async getChatMessages(): Promise<ChatMessage[]> {
    return this.getAllFromStore<ChatMessage>(STORE_CHAT_MESSAGES, 'chat_messages');
  }
  async saveChatMessage(msg: ChatMessage): Promise<void> {
    const list = await this.getChatMessages();
    list.push(msg);
    await this.setAllInStore(STORE_CHAT_MESSAGES, 'chat_messages', list.slice(-50));
  }
  async clearChatMessages(): Promise<void> {
    await this.setAllInStore(STORE_CHAT_MESSAGES, 'chat_messages', []);
  }

  // --- BACKUP & RESTORE ---
  async exportBackup(): Promise<string> {
    const [
      settings,
      income,
      allowances,
      bonuses,
      expenses,
      budgets,
      subcategories,
      savings,
      investments,
      goals,
      moneyOwed,
      loans,
      bills,
      subscriptions,
      emergencyFund,
      reminders,
      transfers,
      accounts,
    ] = await Promise.all([
      this.getSettings(),
      this.getIncomes(),
      this.getAllowances(),
      this.getBonuses(),
      this.getExpenses(),
      this.getBudgets(),
      this.getSubcategories(),
      this.getSavings(),
      this.getInvestments(),
      this.getGoals(),
      this.getMoneyOwed(),
      this.getLoans(),
      this.getBills(),
      this.getSubscriptions(),
      this.getEmergencyFund(),
      this.getReminders(),
      this.getTransfers(),
      this.getAccounts(),
    ]);

    const backup: MoneyVaultBackup = {
      app: 'Money Vault',
      version: 3,
      exportedAt: new Date().toISOString(),
      data: {
        settings,
        income,
        allowances,
        bonuses,
        expenses,
        budgets,
        subcategories,
        savings,
        investments,
        goals,
        moneyOwed,
        loans,
        bills,
        subscriptions,
        emergencyFund,
        reminders,
        transfers,
        accounts,
      },
    };
    return JSON.stringify(backup, null, 2);
  }

  async importBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (
        !parsed ||
        (parsed.app !== 'Money Vault' &&
          parsed.app !== 'Monvera' &&
          parsed.appName !== 'FinTraQ' &&
          parsed.app !== 'FinTraQ')
      ) {
        return { success: false, message: 'Invalid backup file format.' };
      }
      const data = parsed.data || parsed;
      if (!data.settings) {
        return { success: false, message: 'Invalid backup structure. Missing application settings.' };
      }
      await this.saveSettings(data.settings);
      if (Array.isArray(data.income)) await this.setAllIncomes(data.income);
      if (Array.isArray(data.allowances)) await this.setAllAllowances(data.allowances);
      if (Array.isArray(data.bonuses)) await this.setAllBonuses(data.bonuses);
      if (Array.isArray(data.expenses)) await this.setAllExpenses(data.expenses);
      if (Array.isArray(data.budgets)) await this.setAllBudgets(data.budgets);
      if (Array.isArray(data.subcategories)) await this.setAllSubcategories(data.subcategories);
      if (Array.isArray(data.savings)) await this.setAllSavings(data.savings);
      if (Array.isArray(data.investments)) await this.setAllInvestments(data.investments);
      if (Array.isArray(data.goals)) await this.setAllGoals(data.goals);
      if (Array.isArray(data.moneyOwed)) await this.setAllMoneyOwed(data.moneyOwed);
      if (Array.isArray(data.loans)) await this.setAllLoans(data.loans);
      if (Array.isArray(data.bills)) await this.setAllBills(data.bills);
      if (Array.isArray(data.subscriptions)) await this.setAllSubscriptions(data.subscriptions);
      if (data.emergencyFund) await this.saveEmergencyFund(data.emergencyFund);
      if (Array.isArray(data.reminders)) await this.setAllReminders(data.reminders);

      return { success: true, message: 'Money Vault financial records restored successfully.' };
    } catch (e) {
      return { success: false, message: 'Failed to parse JSON backup.' };
    }
  }

  // --- SPLIT / GROUP EXPENSES ---
  async getSplitGroups(): Promise<SplitGroup[]> {
    return this.getAllFromStore<SplitGroup>(STORE_SPLIT_GROUPS, 'split_groups');
  }
  async saveSplitGroup(group: SplitGroup): Promise<void> {
    const list = await this.getSplitGroups();
    const idx = list.findIndex((g) => g.id === group.id);
    if (idx >= 0) list[idx] = group;
    else list.unshift(group);
    await this.setAllInStore(STORE_SPLIT_GROUPS, 'split_groups', list);
  }
  async deleteSplitGroup(id: string): Promise<void> {
    const list = await this.getSplitGroups();
    await this.setAllInStore(STORE_SPLIT_GROUPS, 'split_groups', list.filter((g) => g.id !== id));
    // Also delete associated expenses and settlements
    const exps = await this.getGroupExpenses();
    await this.setAllGroupExpenses(exps.filter((e) => e.groupId !== id));
    const sets = await this.getGroupSettlements();
    await this.setAllGroupSettlements(sets.filter((s) => s.groupId !== id));
  }
  async setAllSplitGroups(groups: SplitGroup[]): Promise<void> {
    await this.setAllInStore(STORE_SPLIT_GROUPS, 'split_groups', groups);
  }

  // --- GROUP EXPENSES ---
  async getGroupExpenses(groupId?: string): Promise<GroupExpense[]> {
    const list = await this.getAllFromStore<GroupExpense>(STORE_SPLIT_EXPENSES, 'split_expenses');
    return groupId ? list.filter((e) => e.groupId === groupId) : list;
  }
  async saveGroupExpense(expense: GroupExpense): Promise<void> {
    const list = await this.getGroupExpenses();
    const idx = list.findIndex((e) => e.id === expense.id);
    if (idx >= 0) list[idx] = expense;
    else list.unshift(expense);
    await this.setAllInStore(STORE_SPLIT_EXPENSES, 'split_expenses', list);
  }
  async deleteGroupExpense(id: string): Promise<void> {
    const list = await this.getGroupExpenses();
    await this.setAllInStore(STORE_SPLIT_EXPENSES, 'split_expenses', list.filter((e) => e.id !== id));
  }
  async setAllGroupExpenses(expenses: GroupExpense[]): Promise<void> {
    await this.setAllInStore(STORE_SPLIT_EXPENSES, 'split_expenses', expenses);
  }

  // --- GROUP SETTLEMENTS ---
  async getGroupSettlements(groupId?: string): Promise<GroupSettlement[]> {
    const list = await this.getAllFromStore<GroupSettlement>(STORE_SPLIT_SETTLEMENTS, 'split_settlements');
    return groupId ? list.filter((s) => s.groupId === groupId) : list;
  }
  async saveGroupSettlement(settlement: GroupSettlement): Promise<void> {
    const list = await this.getGroupSettlements();
    const idx = list.findIndex((s) => s.id === settlement.id);
    if (idx >= 0) list[idx] = settlement;
    else list.unshift(settlement);
    await this.setAllInStore(STORE_SPLIT_SETTLEMENTS, 'split_settlements', list);
  }
  async deleteGroupSettlement(id: string): Promise<void> {
    const list = await this.getGroupSettlements();
    await this.setAllInStore(STORE_SPLIT_SETTLEMENTS, 'split_settlements', list.filter((s) => s.id !== id));
  }
  async setAllGroupSettlements(settlements: GroupSettlement[]): Promise<void> {
    await this.setAllInStore(STORE_SPLIT_SETTLEMENTS, 'split_settlements', settlements);
  }

  async clearAllData(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const keys = [
          'settings',
          'income',
          'allowances',
          'bonuses',
          'expenses',
          'budgets',
          'subcategories',
          'savings',
          'investments',
          'goals',
          'money_owed',
          'loans',
          'bills',
          'subscriptions',
          'emergency_fund',
          'reminders',
          'notifications',
          'transfers',
          'accounts',
          'split_groups',
          'split_expenses',
          'split_settlements',
        ];
        keys.forEach((k) => localStorage.removeItem(this.getFallbackKey(k)));
      }
      const db = await this.getDB();
      if (db) {
        const stores = [
          STORE_SETTINGS,
          STORE_INCOME,
          STORE_ALLOWANCES,
          STORE_BONUSES,
          STORE_EXPENSES,
          STORE_BUDGETS,
          STORE_SUBCATEGORIES,
          STORE_SAVINGS,
          STORE_INVESTMENTS,
          STORE_GOALS,
          STORE_MONEY_OWED,
          STORE_LOANS,
          STORE_BILLS,
          STORE_SUBSCRIPTIONS,
          STORE_EMERGENCY_FUND,
          STORE_REMINDERS,
          STORE_NOTIFICATIONS,
          STORE_TRANSFERS,
          STORE_ACCOUNTS,
          STORE_SPLIT_GROUPS,
          STORE_SPLIT_EXPENSES,
          STORE_SPLIT_SETTLEMENTS,
        ];
        const tx = db.transaction(stores, 'readwrite');
        stores.forEach((s) => tx.objectStore(s).clear());
      }
    } catch (e) {
      console.warn('Error clearing data:', e);
    }
  }
}

export const storage = new StorageEngine();
