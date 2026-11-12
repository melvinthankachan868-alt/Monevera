/**
 * Money Vault State Management Context
 * Hybrid Architecture: Cloud Firestore Authoritative Persistence + IndexedDB Offline Cache
 * Real User Data Only — Zero Automatic Mock Seeding
 */

import React,{ createContext,useContext,useState,useEffect,useMemo,useCallback,useRef } from 'react';
import { User,onAuthStateChanged } from 'firebase/auth';
import {
auth,
signInWithGoogle as fbSignIn,
checkRedirectAuthResult,
signOutUser,
signInWithEmail as fbSignInEmail,
signUpWithEmail as fbSignUpEmail,
sendPasswordResetEmailUser,
} from '../db/firebase';
import { firebaseConfig } from '../lib/firebase/config';
import {
saveUserProfile,
fetchCloudIncomes,
saveCloudIncome,
deleteCloudIncome,
fetchCloudAllowances,
saveCloudAllowance,
deleteCloudAllowance,
fetchCloudBonuses,
saveCloudBonus,
deleteCloudBonus,
fetchCloudExpenses,
saveCloudExpense,
deleteCloudExpense,
fetchCloudBudgets,
saveCloudBudget,
fetchCloudSavings,
saveCloudSavings,
deleteCloudSavings,
fetchCloudInvestments,
saveCloudInvestment,
deleteCloudInvestment,
fetchCloudGoals,
saveCloudGoal,
deleteCloudGoal,
fetchCloudSubcategories,
saveCloudSubcategory,
deleteCloudSubcategory,fetchCloudMoneyOwed,
saveCloudMoneyOwed,
saveCloudMoneyOwedPayment,
deleteCloudMoneyOwed,
fetchCloudLoans,
saveCloudLoan,
deleteCloudLoan,
fetchCloudBills,
saveCloudBill,
deleteCloudBill,
fetchCloudSubscriptions,
saveCloudSubscription,
deleteCloudSubscription,
fetchCloudEmergencyFund,
saveCloudEmergencyFund,
saveCloudEmergencyContribution,
fetchCloudReminders,
saveCloudReminder,
deleteCloudReminder,
fetchCloudNotifications,
saveCloudNotification,
fetchCloudTransfers,
saveCloudTransfer,
fetchCloudAccounts,
saveCloudAccount,fetchCloudAlerts,
saveCloudAlert,
deleteCloudAlert,
fetchCloudAlertHistory,
saveCloudAlertHistory,
fetchCloudSettings,
saveCloudSettings,
batchUploadLocalDataToCloud,
deleteUserAccountAndData,saveCloudSplitGroup,
deleteCloudSplitGroup,saveCloudGroupExpense,
deleteCloudGroupExpense,saveCloudGroupSettlement,
deleteCloudGroupSettlement,
saveSharedGroup,
deleteSharedGroupMember,fetchSharedGroups,
fetchSharedGroup,
deleteSharedGroup,
saveSharedGroupExpense,
deleteSharedGroupExpense,
saveSharedGroupSettlement,
deleteSharedGroupSettlement,
saveGroupInvitation,
fetchGroupInvitationByToken,
updateGroupInvitationStatus,
fetchGroupInvitations,
recordSharedGroupActivity,subscribeToSharedGroupDoc,
subscribeToSharedGroupExpenses,
subscribeToSharedGroupSettlements,
subscribeToSharedGroupActivity
} from '../db/cloudFirestore';
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
CategoryType,
CategorySummary,
SmartInsight,
DaySpending,
MonthlyFinancialSummary,
UserProfile,
Alert,
AlertHistory,
ChatMessage,
MoneyOwed,
MoneyOwedPayment,
Loan,Bill,
Subscription,
EmergencyFund,
EmergencyFundContribution,
FinancialReminder,
AppNotification,
Transfer,
FinancialAccount,
EmergencyFundCalculation,
MoneyOwedSummary,
CashFlowSummary,
NetWorthSummary,
ObligationItem,
SplitGroup,
GroupMember,
GroupExpense,
GroupSettlement,
GlobalGroupBalancesSummary,
GroupFinancialSummary,
GroupInvitation,
GroupActivity,
MemberRole
} from '../types';
import { SplitSettlementEngine } from '../services/splitSettlementEngine';
import { InvitationDeliveryProvider,DeliveryResult } from '../services/invitationDeliveryProvider';
import { validateEmail,validatePhone } from '../utils/invitationValidation';
import { storage } from '../db/indexedDB';
import { DEFAULT_SETTINGS,DEFAULT_SUBCATEGORIES } from '../constants/defaults';
import { createAiStatusError,AiStatusError,shouldApplyAiReply } from '../utils/aiErrorHelper';
import {
getCurrentMonthKey,calculateTotalExpenses,calculateInvestmentsSummary,
calculateCategorySummaries,
calculateDailySpent,
calculateCategoryDistribution,
calculateWeeklyDailySpending,
calculateTopSubcategories,
generateSmartInsights,
calculateMonthlySummary,
calculateEmergencyFundDetails,
calculateMoneyOwedSummary,
calculateCashFlow,
calculateNetWorth,
getUpcomingObligations,
getOverdueObligations,
calculateIncomeBreakdown,toDateString,
formatINR
} from '../utils/calculations';
import { evaluateAllAlertsAndNotifications,AlertEvaluationContext } from '../utils/alertEngine';

interface FinTraQContextType {
  // Auth & Cloud Sync
  user: User | null;
  userProfile: UserProfile | null;
  isAuthLoading: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: number | null;
  migrationPromptOpen: boolean;
  setMigrationPromptOpen: (open: boolean) => void;
  migrateLocalDataToCloud: () => Promise<void>;
  dismissMigrationPrompt: () => void;

  // Explicit Storage Mode
  storageMode: 'local' | 'cloud';
  storageScope: string;
  isLocalOnly: boolean;

  // General App State
  isLoading: boolean;
  settings: AppSettings;
  selectedMonth: string;
  isOffline: boolean;
  activeTab:
    | 'home'
    | 'money_owed'
    | 'split_expenses'
    | 'loans'
    | 'emergency_fund'
    | 'expenses'
    | 'budgets'
    | 'savings'
    | 'investments'
    | 'goals'
    | 'reminders'
    | 'insights'
    | 'calendar'
    | 'notifications'
    | 'alerts'
    | 'reports'
    | 'settings'
    | 'landing'
    | 'tour'
    | 'ai'
    | 'research';
  quickAddOpen: boolean;
  quickAddType: 'expense' | 'income' | 'allowance' | 'bonus' | 'moneyOwed' | 'loan' | 'savings' | 'investment' | 'goal' | 'bill' | 'subscription' | 'transfer' | 'scan_receipt';
  editingExpense: Expense | null;
  onboardingOpen: boolean;

  // Domain Modals & Editing
  investmentModalOpen: boolean;
  setInvestmentModalOpen: (open: boolean) => void;
  editingInvestment: Investment | null;
  setEditingInvestment: (inv: Investment | null) => void;

  goalModalOpen: boolean;
  setGoalModalOpen: (open: boolean) => void;
  editingGoal: FinancialGoal | null;
  setEditingGoal: (goal: FinancialGoal | null) => void;
  contributingGoal: FinancialGoal | null;
  setContributingGoal: (goal: FinancialGoal | null) => void;

  savingsModalOpen: boolean;
  setSavingsModalOpen: (open: boolean) => void;
  editingSaving: SavingsRecord | null;
  setEditingSaving: (sav: SavingsRecord | null) => void;

  billModalOpen: boolean;
  setBillModalOpen: (open: boolean) => void;
  editingBill: Bill | null;
  setEditingBill: (bill: Bill | null) => void;

  subscriptionModalOpen: boolean;
  setSubscriptionModalOpen: (open: boolean) => void;
  editingSubscription: Subscription | null;
  setEditingSubscription: (sub: Subscription | null) => void;

  // Receipt OCR Scanning
  receiptScanModalOpen: boolean;
  setReceiptScanModalOpen: (open: boolean) => void;

  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => Promise<void>;

  // Entity Lists
  incomes: Income[];
  allowances: Allowance[];
  bonuses: Bonus[];
  expenses: Expense[];
  savings: SavingsRecord[];
  investments: Investment[];
  goals: FinancialGoal[];
  recurring: RecurringTransaction[];
  budgets: SubcategoryBudget[];
  subcategories: Subcategory[];
  moneyOwed: MoneyOwed[];
  loans: Loan[];
  bills: Bill[];
  subscriptions: Subscription[];
  emergencyFund: EmergencyFund | null;
  reminders: FinancialReminder[];
  notifications: AppNotification[];
  transfers: Transfer[];
  accounts: FinancialAccount[];
  alerts: Alert[];
  alertHistory: AlertHistory[];
  chatMessages: ChatMessage[];

  // Group / Split Expenses
  splitGroups: SplitGroup[];
  groupExpenses: Record<string, GroupExpense[]>;
  groupSettlements: Record<string, GroupSettlement[]>;
  groupActivities: Record<string, GroupActivity[]>;
  groupInvitations: Record<string, GroupInvitation[]>;
  activeSplitGroupId: string | null;
  setActiveSplitGroupId: (id: string | null) => void;
  createSplitGroup: (
    name: string,
    description?: string,
    members?: { name: string; email?: string; phone?: string; role?: MemberRole }[],
    icon?: string,
    color?: string
  ) => Promise<SplitGroup>;
  updateSplitGroup: (group: SplitGroup) => Promise<void>;
  deleteSplitGroup: (groupId: string) => Promise<void>;
  archiveSplitGroup: (groupId: string, isArchived: boolean) => Promise<void>;
  addGroupExpense: (
    expenseData: Omit<GroupExpense, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<GroupExpense>;
  updateGroupExpense: (expense: GroupExpense) => Promise<void>;
  deleteGroupExpense: (groupId: string, expenseId: string) => Promise<void>;
  recordGroupSettlement: (
    settlementData: Omit<GroupSettlement, 'id' | 'createdAt'>
  ) => Promise<GroupSettlement>;
  deleteGroupSettlement: (groupId: string, settlementId: string) => Promise<void>;
  getGroupFinancialSummary: (groupId: string) => GroupFinancialSummary;
  globalGroupBalancesSummary: GlobalGroupBalancesSummary;

  // Collaborative Group Actions
  inviteMemberToGroup: (
    groupId: string,
    identifier: string,
    type: 'email' | 'phone',
    recipientName?: string,
    role?: MemberRole
  ) => Promise<{ invitation: GroupInvitation; deliveryResult: DeliveryResult }>;
  resendGroupInvitation: (invitation: GroupInvitation) => Promise<DeliveryResult>;
  revokeGroupInvitation: (groupId: string, token: string) => Promise<void>;
  joinGroupByInvitation: (
    token: string,
    options?: { confirmMismatchedIdentity?: boolean }
  ) => Promise<{ success: boolean; group?: SplitGroup; error?: string }>;
  removeGroupMember: (groupId: string, memberId: string) => Promise<void>;
  leaveSplitGroup: (groupId: string) => Promise<void>;
  transferGroupOwnership: (groupId: string, newOwnerMemberId: string) => Promise<void>;

  // Navigation & Modals
  setActiveTab: (tab: FinTraQContextType['activeTab']) => void;
  setSelectedMonth: (month: string) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  setQuickAddOpen: (open: boolean, type?: FinTraQContextType['quickAddType']) => void;
  setEditingExpense: (exp: Expense | null) => void;
  setOnboardingOpen: (open: boolean) => void;
  alertsModalOpen: boolean;
  setAlertsModalOpen: (open: boolean) => void;

  // CRUD Actions
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  addIncome: (income: Omit<Income, 'id' | 'createdAt'>) => Promise<Income>;
  updateIncome: (income: Income) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addAllowance: (allowance: Omit<Allowance, 'id' | 'createdAt'>) => Promise<Allowance>;
  deleteAllowance: (id: string) => Promise<void>;
  addBonus: (bonus: Omit<Bonus, 'id' | 'createdAt'>) => Promise<Bonus>;
  deleteBonus: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addMoneyOwed: (item: Omit<MoneyOwed, 'id' | 'createdAt' | 'amountSettled'>) => Promise<MoneyOwed>;
  recordMoneyOwedPayment: (id: string, amount: number, paymentMethod?: any, note?: string) => Promise<void>;
  deleteMoneyOwed: (id: string) => Promise<void>;
  addLoan: (loan: Omit<Loan, 'id' | 'createdAt'>) => Promise<Loan>;
  recordLoanPayment: (loanId: string, amount: number, paymentMethod?: any, note?: string) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  addBill: (bill: Omit<Bill, 'id' | 'createdAt'>) => Promise<Bill>;
  updateBill: (bill: Bill) => Promise<void>;
  markBillPaid: (id: string) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt'>) => Promise<Subscription>;
  updateSubscription: (sub: Subscription) => Promise<void>;
  toggleSubscriptionActive: (id: string) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  updateEmergencyFundSetup: (essentialExpenses: number, targetMonths: number, currentAmount: number, monthlyContributionPlan?: number) => Promise<void>;
  recordEmergencyFundContribution: (amount: number, note?: string) => Promise<void>;
  recordEmergencyFundWithdrawal: (amount: number, note?: string, associatedExpenseId?: string) => Promise<void>;
  addReminder: (rem: Omit<FinancialReminder, 'id' | 'createdAt'>) => Promise<FinancialReminder>;
  markReminderPaid: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  addTransfer: (transfer: Omit<Transfer, 'id' | 'createdAt'>) => Promise<Transfer>;
  addAccount: (account: Omit<FinancialAccount, 'id'>) => Promise<FinancialAccount>;
  updateAccountBalance: (id: string, newBalance: number) => Promise<void>;
  addSavings: (record: Omit<SavingsRecord, 'id' | 'createdAt'>) => Promise<SavingsRecord>;
  updateSavings: (record: SavingsRecord) => Promise<void>;
  deleteSavings: (id: string) => Promise<void>;
  addInvestment: (inv: Omit<Investment, 'id' | 'createdAt'>) => Promise<Investment>;
  updateInvestment: (inv: Investment) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  addGoal: (goal: Omit<FinancialGoal, 'id' | 'createdAt'>) => Promise<FinancialGoal>;
  updateGoal: (goal: FinancialGoal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setSubcategoryBudget: (category: CategoryType, subcategory: string, amount: number, month?: string) => Promise<void>;
  addSubcategory: (name: string, category: CategoryType, iconName?: string) => Promise<void>;
  deleteSubcategory: (id: string) => Promise<void>;

  // Notification Center
  markNotificationRead: (id: string) => Promise<void>;
  resolveNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;

  // Alerts CRUD
  addAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'ownerId'>) => Promise<Alert>;
  updateAlert: (alert: Alert) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  activeTriggeredAlertsCount: number;

  // AI Assistant
  isAiLoading: boolean;
  askFinTraQAI: (question: string) => Promise<string>;
  clearChatMessages: () => Promise<void>;
  aiStatusError: AiStatusError | null;
  clearAiStatusError: () => void;

  // Backup & Storage
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<{ success: boolean; message: string }>;
  clearAllData: () => Promise<void>;

  // Computed Real Metrics
  monthlyIncome: number;
  monthlySalary: number;
  monthlySpent: number;
  monthlyRemaining: number;
  todaySpent: number;
  incomeBreakdown: ReturnType<typeof calculateIncomeBreakdown>;
  monthlySummary: MonthlyFinancialSummary;
  categorySummaries: CategorySummary[];
  categoryDistribution: { category: CategoryType; spent: number; percentOfTotal: number; color: string }[];
  weeklySpending: DaySpending[];
  topSubcategories: { name: string; category: CategoryType; amount: number; percentage: number }[];
  investmentsSummary: { totalInvested: number; totalCurrentValue: number; totalGainLoss: number; returnPercentage: number };
  emergencyFundDetails: EmergencyFundCalculation;
  moneyOwedSummary: MoneyOwedSummary;
  cashFlowSummary: CashFlowSummary;
  netWorthSummary: NetWorthSummary;
  upcomingObligations: ObligationItem[];
  overdueObligations: ObligationItem[];
  insights: SmartInsight[];
  monthIncomes: Income[];
  monthExpenses: Expense[];
  monthSavings: SavingsRecord[];
}

const FinTraQContext = createContext<FinTraQContextType | undefined>(undefined);

export const FinTraQProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Cloud sync state
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [migrationPromptOpen, setMigrationPromptOpen] = useState(false);

  useEffect(() => {
    checkRedirectAuthResult()
      .then((redirectUser) => {
        if (redirectUser) {
          setUser(redirectUser);
          setCloudSyncStatus('synced');
        }
      })
      .catch((e) => console.warn('Redirect auth check notice:', e));
  }, []);

  // Core Financial Data
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<SavingsRecord[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [budgets, setBudgets] = useState<SubcategoryBudget[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(DEFAULT_SUBCATEGORIES);
  const [moneyOwed, setMoneyOwed] = useState<MoneyOwed[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [emergencyFund, setEmergencyFund] = useState<EmergencyFund | null>(null);
  const [reminders, setReminders] = useState<FinancialReminder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiStatusError, setAiStatusError] = useState<AiStatusError | null>(null);
  const clearAiStatusError = useCallback(() => setAiStatusError(null), []);

  // Split / Group Expenses State
  const [splitGroups, setSplitGroups] = useState<SplitGroup[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<Record<string, GroupExpense[]>>({});
  const [groupSettlements, setGroupSettlements] = useState<Record<string, GroupSettlement[]>>({});
  const [groupActivities, setGroupActivities] = useState<Record<string, GroupActivity[]>>({});
  const [groupInvitations, setGroupInvitations] = useState<Record<string, GroupInvitation[]>>({});
  const [activeSplitGroupId, setActiveSplitGroupId] = useState<string | null>(null);

  // Navigation & UI state
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [activeTab, setActiveTab] = useState<FinTraQContextType['activeTab']>('home');
  const [quickAddOpen, setQuickAddOpenState] = useState(false);
  const [quickAddType, setQuickAddType] = useState<FinTraQContextType['quickAddType']>('expense');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Domain Modals & State
  const [investmentModalOpen, setInvestmentModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestmentState] = useState<Investment | null>(null);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoalState] = useState<FinancialGoal | null>(null);
  const [contributingGoal, setContributingGoalState] = useState<FinancialGoal | null>(null);

  const [savingsModalOpen, setSavingsModalOpen] = useState(false);
  const [editingSaving, setEditingSavingState] = useState<SavingsRecord | null>(null);

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBillState] = useState<Bill | null>(null);

  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscriptionState] = useState<Subscription | null>(null);

  // Receipt OCR Scanning State
  const [receiptScanModalOpen, setReceiptScanModalOpen] = useState(false);

  // Theme State
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('money_vault_theme') as 'dark' | 'light';
      if (stored === 'dark' || stored === 'light') return stored;
    }
    return 'dark';
  });

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);

  // Monitor network
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setCloudSyncStatus('synced');
    };
    const handleOffline = () => {
      setIsOffline(true);
      setCloudSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from local IndexedDB cache on boot
  const loadLocalCache = useCallback(async () => {
    try {
      const scopeAtStart = storage.getScope();
      const [
        storedSettings,
        storedIncomes,
        storedAllowances,
        storedBonuses,
        storedExpenses,
        storedBudgets,
        storedSubcats,
        storedSavings,
        storedInvestments,
        storedGoals,
        storedMoneyOwed,
        storedLoans,
        storedBills,
        storedSubscriptions,
        storedEmergencyFund,
        storedReminders,
        storedNotifications,
        storedTransfers,
        storedAccounts,
        storedAlerts,
        storedHistory,
        storedChat,
        storedSplitGroups,
        storedGroupExpenses,
        storedGroupSettlements,
      ] = await Promise.all([
        storage.getSettings(),
        storage.getIncomes(),
        storage.getAllowances(),
        storage.getBonuses(),
        storage.getExpenses(),
        storage.getBudgets(),
        storage.getSubcategories(),
        storage.getSavings(),
        storage.getInvestments(),
        storage.getGoals(),
        storage.getMoneyOwed(),
        storage.getLoans(),
        storage.getBills(),
        storage.getSubscriptions(),
        storage.getEmergencyFund(),
        storage.getReminders(),
        storage.getNotifications(),
        storage.getTransfers(),
        storage.getAccounts(),
        storage.getAlerts(),
        storage.getAlertHistory(),
        storage.getChatMessages(),
        storage.getSplitGroups(),
        storage.getGroupExpenses(),
        storage.getGroupSettlements(),
      ]);

      setSettings(storedSettings || DEFAULT_SETTINGS);
      setIncomes(storedIncomes || []);
      setAllowances(storedAllowances || []);
      setBonuses(storedBonuses || []);
      setExpenses(storedExpenses || []);
      setBudgets(storedBudgets || []);
      setSubcategories(storedSubcats?.length ? storedSubcats : DEFAULT_SUBCATEGORIES);
      setSavings(storedSavings || []);
      setInvestments(storedInvestments || []);
      setGoals(storedGoals || []);
      setMoneyOwed(storedMoneyOwed || []);
      setLoans(storedLoans || []);
      setBills(storedBills || []);
      setSubscriptions(storedSubscriptions || []);
      setEmergencyFund(storedEmergencyFund || null);
      setReminders(storedReminders || []);
      setNotifications(storedNotifications || []);
      setTransfers(storedTransfers || []);
      setAccounts(storedAccounts || []);
      setAlerts(storedAlerts || []);
      setAlertHistory(storedHistory || []);

      if (storage.getScope() === scopeAtStart) {
        if (scopeAtStart === 'guest') {
          setChatMessages([]);
          await storage.clearChatMessages();
        } else {
          setChatMessages(storedChat || []);
        }
      }

      // Group / Split Expenses
      setSplitGroups(storedSplitGroups || []);
      const expsMap: Record<string, GroupExpense[]> = {};
      (storedGroupExpenses || []).forEach((e) => {
        if (!expsMap[e.groupId]) expsMap[e.groupId] = [];
        expsMap[e.groupId].push(e);
      });
      setGroupExpenses(expsMap);

      const setsMap: Record<string, GroupSettlement[]> = {};
      (storedGroupSettlements || []).forEach((s) => {
        if (!setsMap[s.groupId]) setsMap[s.groupId] = [];
        setsMap[s.groupId].push(s);
      });
      setGroupSettlements(setsMap);

      if (!storedSettings?.onboardingCompleted && storedIncomes.length === 0) {
        setOnboardingOpen(true);
      }
    } catch (e) {
      console.warn('Error reading from IndexedDB:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocalCache();
  }, [loadLocalCache]);

  // Firebase Auth & Cloud Firestore sync
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      setIsAuthLoading(false);

      if (fbUser) {
        userRef.current = fbUser;
        setUser(fbUser);
        const userScope = `user_${fbUser.uid}`;
        await storage.setScope(userScope);

        // Restore this user's persistent chat messages from isolated storage
        const userChat = await storage.getChatMessages();
        setChatMessages(userChat || []);

        const profile: UserProfile = {
          uid: fbUser.uid,
          displayName: fbUser.displayName,
          email: fbUser.email,
          photoURL: fbUser.photoURL,
          createdAt: new Date().toISOString(),
        };
        setUserProfile(profile);
        saveUserProfile(profile).catch((e) => console.warn('Error saving profile:', e));

        setCloudSyncStatus('syncing');
        try {
          const [
            cloudIncomes,
            cloudAllowances,
            cloudBonuses,
            cloudExpenses,
            cloudBudgets,
            cloudSavings,
            cloudInvestments,
            cloudGoals,
            cloudSubcats,
            cloudMoneyOwed,
            cloudLoans,
            cloudBills,
            cloudSubs,
            cloudEf,
            cloudReminders,
            cloudNotifs,
            cloudTransfers,
            cloudAccounts,
            cloudAlerts,
            cloudAlertHist,
            cloudSettings,
          ] = await Promise.all([
            fetchCloudIncomes(fbUser.uid),
            fetchCloudAllowances(fbUser.uid),
            fetchCloudBonuses(fbUser.uid),
            fetchCloudExpenses(fbUser.uid),
            fetchCloudBudgets(fbUser.uid),
            fetchCloudSavings(fbUser.uid),
            fetchCloudInvestments(fbUser.uid),
            fetchCloudGoals(fbUser.uid),
            fetchCloudSubcategories(fbUser.uid),
            fetchCloudMoneyOwed(fbUser.uid),
            fetchCloudLoans(fbUser.uid),
            fetchCloudBills(fbUser.uid),
            fetchCloudSubscriptions(fbUser.uid),
            fetchCloudEmergencyFund(fbUser.uid),
            fetchCloudReminders(fbUser.uid),
            fetchCloudNotifications(fbUser.uid),
            fetchCloudTransfers(fbUser.uid),
            fetchCloudAccounts(fbUser.uid),
            fetchCloudAlerts(fbUser.uid),
            fetchCloudAlertHistory(fbUser.uid),
            fetchCloudSettings(fbUser.uid),
          ]);

          const cloudHasData =
            cloudIncomes.length > 0 ||
            cloudExpenses.length > 0 ||
            cloudMoneyOwed.length > 0 ||
            cloudLoans.length > 0 ||
            cloudEf !== null;

          // Check if guest vault has data to propose migration (never auto-merge)
          let guestHasData = false;
          try {
            const guestInc = localStorage.getItem('monvera_guest_income');
            const guestExp = localStorage.getItem('monvera_guest_expenses');
            const parsedInc = guestInc ? JSON.parse(guestInc) : [];
            const parsedExp = guestExp ? JSON.parse(guestExp) : [];
            guestHasData = (parsedInc.length > 0) || (parsedExp.length > 0);
          } catch {}

          if (!cloudHasData && guestHasData) {
            setMigrationPromptOpen(true);
          }

          // Update in-memory state with this user's cloud data
          setIncomes(cloudIncomes);
          setAllowances(cloudAllowances);
          setBonuses(cloudBonuses);
          setExpenses(cloudExpenses);
          setBudgets(cloudBudgets);
          setSavings(cloudSavings);
          setInvestments(cloudInvestments);
          setGoals(cloudGoals);
          if (cloudSubcats.length > 0) setSubcategories(cloudSubcats);
          setMoneyOwed(cloudMoneyOwed);
          setLoans(cloudLoans);
          setBills(cloudBills);
          setSubscriptions(cloudSubs);
          setEmergencyFund(cloudEf);
          setReminders(cloudReminders);
          setNotifications(cloudNotifs);
          setTransfers(cloudTransfers);
          setAccounts(cloudAccounts);
          setAlerts(cloudAlerts);
          setAlertHistory(cloudAlertHist);
          if (cloudSettings) setSettings(cloudSettings);

          // Save to user-scoped IDB cache
          await Promise.all([
            storage.setAllIncomes(cloudIncomes),
            storage.setAllAllowances(cloudAllowances),
            storage.setAllBonuses(cloudBonuses),
            storage.setAllExpenses(cloudExpenses),
            storage.setAllBudgets(cloudBudgets),
            storage.setAllSavings(cloudSavings),
            storage.setAllInvestments(cloudInvestments),
            storage.setAllGoals(cloudGoals),
            storage.setAllSubcategories(cloudSubcats.length ? cloudSubcats : DEFAULT_SUBCATEGORIES),
            storage.setAllMoneyOwed(cloudMoneyOwed),
            storage.setAllLoans(cloudLoans),
            storage.setAllBills(cloudBills),
            storage.setAllSubscriptions(cloudSubs),
            cloudEf ? storage.saveEmergencyFund(cloudEf) : Promise.resolve(),
            storage.setAllReminders(cloudReminders),
            storage.setAllNotifications(cloudNotifs),
            storage.setAllAlerts(cloudAlerts),
            storage.setAllAlertHistory(cloudAlertHist),
            cloudSettings ? storage.saveSettings(cloudSettings) : Promise.resolve(),
          ]);

          // Fetch Shared Collaborative Groups (Multi-User Workspaces)
          try {
            const shared = await fetchSharedGroups(fbUser.uid);
            if (shared.length > 0) {
              setSplitGroups((prev) => {
                const map = new Map<string, SplitGroup>();
                prev.forEach((g) => map.set(g.id, g));
                shared.forEach((g) => map.set(g.id, g));
                return Array.from(map.values());
              });
              for (const g of shared) {
                storage.saveSplitGroup(g).catch(console.warn);
              }
            }
          } catch (sharedErr) {
            console.warn('Notice loading shared groups:', sharedErr);
          }

          setCloudSyncStatus('synced');
          setLastSyncedAt(Date.now());
        } catch (err) {
          console.warn('Error syncing cloud data on auth change:', err);
          setCloudSyncStatus('error');
        }
      } else {
        userRef.current = null;
        setUser(null);
        setUserProfile(null);
        setChatMessages([]);
        setIsAiLoading(false);
        setAiStatusError(null);
        setCloudSyncStatus('synced');
        setActiveSplitGroupId(null);
        await storage.setScope('guest');
        await loadLocalCache();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadLocalCache]);

  // Auth actions
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      setIsAuthLoading(true);
      const res = await fbSignIn();
      if (res) {
        setAuthError(null);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      console.warn('Google Sign-In notice:', err?.code || err?.message || 'unknown');
      let userMsg = 'Unable to complete Google Sign-In. Please try again.';
      if (err?.code === 'auth/unauthorized-domain') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        userMsg = `This domain (${currentHost}) is not authorized for OAuth operations in Firebase. Please ensure '${currentHost}' is registered under Firebase Console → Authentication → Settings → Authorized domains.`;
      } else if (err?.code === 'auth/popup-blocked') {
        userMsg = 'Browser popup was blocked. Please allow popups for this site or try again.';
      } else if (err?.code === 'auth/network-request-failed') {
        userMsg = 'Network connection failure. Please check your internet connection.';
      } else if (err?.code === 'auth/too-many-requests') {
        userMsg = 'Temporarily blocked due to many requests. Please wait a few moments before trying again.';
      } else if (err?.message) {
        userMsg = err.message;
      }
      setAuthError(userMsg);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setAuthError(null);
    try {
      setIsAuthLoading(true);
      await fbSignInEmail(email, pass);
      setAuthError(null);
    } catch (err: any) {
      console.warn('Email sign-in notice:', err?.code || 'auth-error');
      let userMsg = 'Unable to sign in with email. Please check your credentials.';
      if (err?.code === 'auth/operation-not-allowed') {
        userMsg =
          `Email & Password sign-in request was rejected by Firebase (auth/operation-not-allowed). Please verify provider enablement and project configuration in ${firebaseConfig.projectId}.`;
      } else if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
      ) {
        userMsg = 'Invalid email or password. Please verify your credentials.';
      } else if (err?.code === 'auth/invalid-email') {
        userMsg = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/too-many-requests') {
        userMsg = 'Too many failed login attempts. Access is temporarily suspended. Please wait or reset your password.';
      } else if (err?.code === 'auth/network-request-failed') {
        userMsg = 'Network connection failure. Please verify your network and try again.';
      } else if (err?.message) {
        userMsg = err.message;
      }
      setAuthError(userMsg);
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string, displayName?: string) => {
    setAuthError(null);
    try {
      setIsAuthLoading(true);
      await fbSignUpEmail(email, pass, displayName);
      setAuthError(null);
    } catch (err: any) {
      console.warn('Email sign-up notice:', err?.code || 'auth-error');
      let userMsg = 'Unable to create account with email. Please try again.';
      if (err?.code === 'auth/operation-not-allowed') {
        userMsg =
          `Email & Password registration was rejected by Firebase (auth/operation-not-allowed). Please verify the Email/Password provider state and Identity Toolkit configuration in project ${firebaseConfig.projectId}.`;
      } else if (err?.code === 'auth/email-already-in-use') {
        userMsg = 'This email is already registered. Please sign in instead.';
      } else if (err?.code === 'auth/weak-password') {
        userMsg = 'Password must be at least 6 characters long.';
      } else if (err?.code === 'auth/invalid-email') {
        userMsg = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/too-many-requests') {
        userMsg = 'Too many requests. Please wait a moment before trying again.';
      } else if (err?.code === 'auth/network-request-failed') {
        userMsg = 'Network connection failure. Please verify your network and try again.';
      } else if (err?.message) {
        userMsg = err.message;
      }
      setAuthError(userMsg);
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    setAuthError(null);
    try {
      setIsAuthLoading(true);
      await sendPasswordResetEmailUser(email);
      setAuthError(null);
    } catch (err: any) {
      console.warn('Password reset notice:', err?.code || 'auth-error');
      let userMsg = 'Unable to send password reset email. Please try again.';
      if (err?.code === 'auth/invalid-email') {
        userMsg = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/user-not-found') {
        userMsg = 'No account found with this email address.';
      } else if (err?.code === 'auth/network-request-failed') {
        userMsg = 'Network connection failure. Please check your internet connection.';
      } else if (err?.code === 'auth/too-many-requests') {
        userMsg = 'Too many requests. Please wait a few moments before trying again.';
      } else if (err?.message) {
        userMsg = err.message;
      }
      setAuthError(userMsg);
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      userRef.current = null;
      setChatMessages([]);
      setIsAiLoading(false);
      setAiStatusError(null);
      await signOutUser();
      setUser(null);
      setUserProfile(null);
      setCloudSyncStatus('synced');
      setActiveSplitGroupId(null);
      await storage.setScope('guest');
      await loadLocalCache();
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }, [loadLocalCache]);

  const deleteUserAccount = useCallback(async () => {
    if (!user) return;
    try {
      setCloudSyncStatus('syncing');
      setChatMessages([]);
      setIsAiLoading(false);
      setAiStatusError(null);
      await deleteUserAccountAndData(user.uid);
      await storage.clearAllData();
      userRef.current = null;
      await signOutUser();
      setUser(null);
      setUserProfile(null);
      setActiveSplitGroupId(null);
      await storage.setScope('guest');
      await loadLocalCache();
    } catch (err) {
      console.error('Account deletion error:', err);
    }
  }, [user, loadLocalCache]);

  const migrateLocalDataToCloud = useCallback(async () => {
    if (!user) return;
    try {
      setCloudSyncStatus('syncing');

      // Read records from guest scope
      await storage.setScope('guest');
      const [
        guestSettings,
        guestIncomes,
        guestAllowances,
        guestBonuses,
        guestExpenses,
        guestBudgets,
        guestSubcats,
        guestSavings,
        guestInvestments,
        guestGoals,
        guestMoneyOwed,
        guestLoans,
        guestBills,
        guestSubs,
        guestEf,
        guestReminders,
        guestTransfers,
        guestAccounts,
      ] = await Promise.all([
        storage.getSettings(),
        storage.getIncomes(),
        storage.getAllowances(),
        storage.getBonuses(),
        storage.getExpenses(),
        storage.getBudgets(),
        storage.getSubcategories(),
        storage.getSavings(),
        storage.getInvestments(),
        storage.getGoals(),
        storage.getMoneyOwed(),
        storage.getLoans(),
        storage.getBills(),
        storage.getSubscriptions(),
        storage.getEmergencyFund(),
        storage.getReminders(),
        storage.getTransfers(),
        storage.getAccounts(),
      ]);

      // Switch back to user's scope
      await storage.setScope(`user_${user.uid}`);

      // Upload guest records to user's Firestore cloud account
      await batchUploadLocalDataToCloud(user.uid, {
        settings: guestSettings,
        income: guestIncomes,
        allowances: guestAllowances,
        bonuses: guestBonuses,
        expenses: guestExpenses,
        budgets: guestBudgets,
        subcategories: guestSubcats,
        savings: guestSavings,
        investments: guestInvestments,
        goals: guestGoals,
        moneyOwed: guestMoneyOwed,
        loans: guestLoans,
        bills: guestBills,
        subscriptions: guestSubs,
        emergencyFund: guestEf,
        reminders: guestReminders,
        transfers: guestTransfers,
        accounts: guestAccounts,
      });

      // Cache into user's scoped local vault
      await Promise.all([
        storage.setAllIncomes(guestIncomes),
        storage.setAllExpenses(guestExpenses),
        storage.setAllBudgets(guestBudgets),
        storage.setAllSavings(guestSavings),
        storage.setAllInvestments(guestInvestments),
        storage.setAllGoals(guestGoals),
        storage.setAllMoneyOwed(guestMoneyOwed),
        storage.setAllLoans(guestLoans),
        storage.setAllBills(guestBills),
        storage.setAllSubscriptions(guestSubs),
        guestEf ? storage.saveEmergencyFund(guestEf) : Promise.resolve(),
      ]);

      // Update in-memory state
      setIncomes(guestIncomes);
      setExpenses(guestExpenses);
      setBudgets(guestBudgets);
      setSavings(guestSavings);
      setInvestments(guestInvestments);
      setGoals(guestGoals);
      setMoneyOwed(guestMoneyOwed);
      setLoans(guestLoans);
      setBills(guestBills);
      setSubscriptions(guestSubs);
      if (guestEf) setEmergencyFund(guestEf);

      setMigrationPromptOpen(false);
      setCloudSyncStatus('synced');
      setLastSyncedAt(Date.now());
    } catch (e) {
      console.error('Migration error:', e);
      setCloudSyncStatus('error');
    }
  }, [user]);

  const dismissMigrationPrompt = useCallback(() => {
    setMigrationPromptOpen(false);
  }, []);

  // Stepper
  const nextMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const [year, month] = prev.split('-').map(Number);
      const nextDate = new Date(year, month, 1);
      return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

  const prevMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const [year, month] = prev.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

  // Domain-Specific Modal & Record Setters
  const setEditingInvestment = useCallback((inv: Investment | null) => {
    setEditingInvestmentState(inv);
    if (inv) setInvestmentModalOpen(true);
  }, []);

  const setEditingGoal = useCallback((g: FinancialGoal | null) => {
    setEditingGoalState(g);
    if (g) setGoalModalOpen(true);
  }, []);

  const setContributingGoal = useCallback((g: FinancialGoal | null) => {
    setContributingGoalState(g);
    if (g) setGoalModalOpen(true);
  }, []);

  const setEditingSaving = useCallback((s: SavingsRecord | null) => {
    setEditingSavingState(s);
    if (s) setSavingsModalOpen(true);
  }, []);

  const setEditingBill = useCallback((b: Bill | null) => {
    setEditingBillState(b);
    if (b) setBillModalOpen(true);
  }, []);

  const setEditingSubscription = useCallback((s: Subscription | null) => {
    setEditingSubscriptionState(s);
    if (s) setSubscriptionModalOpen(true);
  }, []);

  const setQuickAddOpen = useCallback(
    (open: boolean, type: FinTraQContextType['quickAddType'] = 'expense') => {
      setQuickAddType(type);
      if (!open) {
        setQuickAddOpenState(false);
        setEditingExpense(null);
        setInvestmentModalOpen(false);
        setEditingInvestmentState(null);
        setGoalModalOpen(false);
        setEditingGoalState(null);
        setContributingGoalState(null);
        setSavingsModalOpen(false);
        setEditingSavingState(null);
        setBillModalOpen(false);
        setEditingBillState(null);
        setSubscriptionModalOpen(false);
        setEditingSubscriptionState(null);
        return;
      }

      // Domain-specific modal routing (Requirement 15 & 16)
      if (type === 'investment') {
        setEditingInvestmentState(null);
        setInvestmentModalOpen(true);
        setQuickAddOpenState(false);
      } else if (type === 'goal') {
        setEditingGoalState(null);
        setContributingGoalState(null);
        setGoalModalOpen(true);
        setQuickAddOpenState(false);
      } else if (type === 'savings') {
        setEditingSavingState(null);
        setSavingsModalOpen(true);
        setQuickAddOpenState(false);
      } else if (type === 'bill') {
        setEditingBillState(null);
        setBillModalOpen(true);
        setQuickAddOpenState(false);
      } else if (type === 'subscription') {
        setEditingSubscriptionState(null);
        setSubscriptionModalOpen(true);
        setQuickAddOpenState(false);
      } else if (type === 'scan_receipt') {
        setReceiptScanModalOpen(true);
        setQuickAddOpenState(false);
      } else {
        // Generic expense / income / allowance / bonus / moneyOwed / transfer
        setQuickAddOpenState(true);
      }
    },
    []
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      const updated = { ...settings, ...newSettings, updatedAt: Date.now() };
      setSettings(updated);
      await storage.saveSettings(updated);
      if (user) saveCloudSettings(user.uid, updated).catch(console.warn);
    },
    [settings, user]
  );

  const setTheme = useCallback(
    async (newTheme: 'dark' | 'light') => {
      setThemeState(newTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem('money_vault_theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        if (newTheme === 'light') {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
          document.body.classList.remove('dark');
          document.body.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
          document.body.classList.remove('light');
          document.body.classList.add('dark');
        }
      }
      await updateSettings({ theme: newTheme });
    },
    [updateSettings]
  );

  // Sync theme with DOM on mount and settings change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeTheme = settings.theme || theme || 'dark';
      document.documentElement.setAttribute('data-theme', activeTheme);
      if (activeTheme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.body.classList.remove('dark');
        document.body.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        document.body.classList.remove('light');
        document.body.classList.add('dark');
      }
    }
  }, [theme, settings.theme]);

  // ==================== COMPUTED FINANCIAL METRICS ====================
  const incomeBreakdown = useMemo(
    () => calculateIncomeBreakdown(incomes, allowances, bonuses, selectedMonth),
    [incomes, allowances, bonuses, selectedMonth]
  );

  const monthlyIncome = useMemo(
    () => incomeBreakdown.totalInflow,
    [incomeBreakdown.totalInflow]
  );

  const monthlySpent = useMemo(
    () => calculateTotalExpenses(expenses, selectedMonth),
    [expenses, selectedMonth]
  );

  const monthlyRemaining = useMemo(
    () => monthlyIncome - monthlySpent,
    [monthlyIncome, monthlySpent]
  );

  const todaySpent = useMemo(
    () => calculateDailySpent(expenses, toDateString(new Date())),
    [expenses]
  );

  const monthIncomes = useMemo(
    () => incomes.filter((i) => i.date.startsWith(selectedMonth)),
    [incomes, selectedMonth]
  );

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  );

  const monthSavings = useMemo(
    () => savings.filter((s) => s.date.startsWith(selectedMonth)),
    [savings, selectedMonth]
  );

  const monthlySummary = useMemo(
    () => calculateMonthlySummary(incomes, expenses, savings, investments, allowances, bonuses, selectedMonth),
    [incomes, expenses, savings, investments, allowances, bonuses, selectedMonth]
  );

  const categorySummaries = useMemo(
    () => calculateCategorySummaries(expenses, settings, monthlyIncome, selectedMonth),
    [expenses, settings, monthlyIncome, selectedMonth]
  );

  const categoryDistribution = useMemo(
    () => calculateCategoryDistribution(expenses, selectedMonth),
    [expenses, selectedMonth]
  );

  const weeklySpending = useMemo(
    () => calculateWeeklyDailySpending(expenses, new Date(), settings.firstDayOfWeek),
    [expenses, settings.firstDayOfWeek]
  );

  const topSubcategories = useMemo(
    () => calculateTopSubcategories(expenses, selectedMonth, 6),
    [expenses, selectedMonth]
  );

  const investmentsSummary = useMemo(
    () => calculateInvestmentsSummary(investments),
    [investments]
  );

  const emergencyFundDetails = useMemo(
    () => calculateEmergencyFundDetails(emergencyFund, monthlySummary.needsSpent || 25000),
    [emergencyFund, monthlySummary.needsSpent]
  );

  const moneyOwedSummary = useMemo(
    () => calculateMoneyOwedSummary(moneyOwed),
    [moneyOwed]
  );

  const cashFlowSummary = useMemo(
    () => calculateCashFlow(incomes, allowances, bonuses, expenses, savings, investments, loans, selectedMonth),
    [incomes, allowances, bonuses, expenses, savings, investments, loans, selectedMonth]
  );

  const netWorthSummary = useMemo(
    () => calculateNetWorth(accounts, savings, emergencyFund, investments, moneyOwed, loans),
    [accounts, savings, emergencyFund, investments, moneyOwed, loans]
  );

  const upcomingObligations = useMemo(
    () => getUpcomingObligations(loans, reminders, bills, subscriptions, moneyOwed, 30),
    [loans, reminders, bills, subscriptions, moneyOwed]
  );

  const overdueObligations = useMemo(
    () => getOverdueObligations(loans, reminders, bills, subscriptions, moneyOwed),
    [loans, reminders, bills, subscriptions, moneyOwed]
  );

  const insights = useMemo(
    () => generateSmartInsights(incomes, expenses, settings, budgets, moneyOwed, emergencyFund, selectedMonth),
    [incomes, expenses, settings, budgets, moneyOwed, emergencyFund, selectedMonth]
  );

  // Periodic Alert & Notification Evaluation
  const runAlertChecks = useCallback(async () => {
    if (alerts.length === 0 && moneyOwed.length === 0 && loans.length === 0 && bills.length === 0) return;

    const evalContext: AlertEvaluationContext = {
      summary: monthlySummary,
      expenses: monthExpenses,
      incomes: monthIncomes,
      savings: monthSavings,
      investments,
      goals,
      moneyOwed,
      loans,
      reminders,
      bills,
      subscriptions,
      emergencyFund,
      selectedMonth,
    };

    const { updatedAlerts, triggeredEvents, newNotifications } = evaluateAllAlertsAndNotifications(
      alerts,
      notifications,
      evalContext
    );

    if (triggeredEvents.length > 0 || newNotifications.length > 0) {
      if (updatedAlerts.length > 0) {
        setAlerts(updatedAlerts);
        await storage.setAllAlerts(updatedAlerts);
        if (user) {
          for (const a of updatedAlerts) saveCloudAlert(user.uid, a).catch(console.warn);
        }
      }

      if (triggeredEvents.length > 0) {
        const newHist = [...triggeredEvents, ...alertHistory].slice(0, 100);
        setAlertHistory(newHist);
        await storage.setAllAlertHistory(newHist);
        if (user) {
          for (const ev of triggeredEvents) saveCloudAlertHistory(user.uid, ev).catch(console.warn);
        }
      }

      if (newNotifications.length > 0) {
        const mergedNotifs = [...newNotifications, ...notifications].slice(0, 100);
        setNotifications(mergedNotifs);
        await storage.setAllNotifications(mergedNotifs);
        if (user) {
          for (const n of newNotifications) saveCloudNotification(user.uid, n).catch(console.warn);
        }
      }
    }
  }, [
    alerts,
    notifications,
    alertHistory,
    monthlySummary,
    monthExpenses,
    monthIncomes,
    monthSavings,
    investments,
    goals,
    moneyOwed,
    loans,
    reminders,
    bills,
    subscriptions,
    emergencyFund,
    selectedMonth,
    user,
  ]);

  useEffect(() => {
    if (!isLoading) {
      runAlertChecks();
    }
  }, [
    monthExpenses.length,
    monthIncomes.length,
    moneyOwed.length,
    loans.length,
    bills.length,
    emergencyFund?.currentAmount,
  ]);

  // ==================== CRUD OPERATIONS ====================

  // Income
  const addIncome = useCallback(
    async (incData: Omit<Income, 'id' | 'createdAt'>): Promise<Income> => {
      const newIncome: Income = {
        ...incData,
        id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setIncomes((prev) => [newIncome, ...prev]);
      await storage.saveIncome(newIncome);
      if (user) saveCloudIncome(user.uid, newIncome).catch(console.warn);
      return newIncome;
    },
    [user]
  );

  const updateIncome = useCallback(
    async (inc: Income) => {
      const updated = { ...inc, updatedAt: Date.now() };
      setIncomes((prev) => prev.map((i) => (i.id === inc.id ? updated : i)));
      await storage.saveIncome(updated);
      if (user) saveCloudIncome(user.uid, updated).catch(console.warn);
    },
    [user]
  );

  const deleteIncome = useCallback(
    async (id: string) => {
      setIncomes((prev) => prev.filter((i) => i.id !== id));
      await storage.deleteIncome(id);
      if (user) deleteCloudIncome(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Allowances
  const addAllowance = useCallback(
    async (alData: Omit<Allowance, 'id' | 'createdAt'>): Promise<Allowance> => {
      const newAllowance: Allowance = {
        ...alData,
        id: `al-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setAllowances((prev) => [newAllowance, ...prev]);
      await storage.saveAllowance(newAllowance);
      if (user) saveCloudAllowance(user.uid, newAllowance).catch(console.warn);
      return newAllowance;
    },
    [user]
  );

  const deleteAllowance = useCallback(
    async (id: string) => {
      setAllowances((prev) => prev.filter((a) => a.id !== id));
      await storage.deleteAllowance(id);
      if (user) deleteCloudAllowance(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Bonuses
  const addBonus = useCallback(
    async (bData: Omit<Bonus, 'id' | 'createdAt'>): Promise<Bonus> => {
      const newBonus: Bonus = {
        ...bData,
        id: `bon-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setBonuses((prev) => [newBonus, ...prev]);
      await storage.saveBonus(newBonus);
      if (user) saveCloudBonus(user.uid, newBonus).catch(console.warn);
      return newBonus;
    },
    [user]
  );

  const deleteBonus = useCallback(
    async (id: string) => {
      setBonuses((prev) => prev.filter((b) => b.id !== id));
      await storage.deleteBonus(id);
      if (user) deleteCloudBonus(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Expense
  const addExpense = useCallback(
    async (expData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> => {
      const newExpense: Expense = {
        ...expData,
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setExpenses((prev) => [newExpense, ...prev]);
      await storage.saveExpense(newExpense);
      if (user) saveCloudExpense(user.uid, newExpense).catch(console.warn);

      // Check large expense threshold
      if (settings.largeExpenseThreshold && newExpense.amount >= settings.largeExpenseThreshold) {
        const notif: AppNotification = {
          id: `notif-lge-${newExpense.id}`,
          ownerId: user?.uid,
          title: 'Large Expense Detected',
          amount: newExpense.amount,
          reason: `A single expense of ${formatINR(newExpense.amount)} on ${newExpense.subcategory} was recorded.`,
          status: 'delivered',
          channel: 'in_app',
          relatedRecordType: 'alert',
          read: false,
          resolved: false,
          createdAt: Date.now(),
        };
        setNotifications((prev) => [notif, ...prev]);
        storage.saveNotification(notif).catch(console.warn);
      }

      return newExpense;
    },
    [user, settings.largeExpenseThreshold]
  );

  const updateExpense = useCallback(
    async (exp: Expense) => {
      const updated = { ...exp, updatedAt: Date.now() };
      setExpenses((prev) => prev.map((e) => (e.id === exp.id ? updated : e)));
      await storage.saveExpense(updated);
      if (user) saveCloudExpense(user.uid, updated).catch(console.warn);
    },
    [user]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      await storage.deleteExpense(id);
      if (user) deleteCloudExpense(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Money Owed (Lent & Borrowed)
  const addMoneyOwed = useCallback(
    async (itemData: Omit<MoneyOwed, 'id' | 'createdAt' | 'amountSettled'>): Promise<MoneyOwed> => {
      const newOwed: MoneyOwed = {
        ...itemData,
        id: `mo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        amountSettled: 0,
        remainingAmount: itemData.originalAmount,
        payments: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setMoneyOwed((prev) => [newOwed, ...prev]);
      await storage.saveMoneyOwed(newOwed);
      if (user) saveCloudMoneyOwed(user.uid, newOwed).catch(console.warn);
      return newOwed;
    },
    [user]
  );

  const recordMoneyOwedPayment = useCallback(
    async (id: string, paymentAmount: number, paymentMethod: any = 'UPI', note?: string) => {
      const target = moneyOwed.find((m) => m.id === id);
      if (!target) return;

      const payment: MoneyOwedPayment = {
        id: `mop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        moneyOwedId: id,
        amount: Math.round(paymentAmount),
        date: toDateString(new Date()),
        paymentMethod,
        note: note?.trim(),
        createdAt: Date.now(),
      };

      const newSettled = (target.amountSettled || 0) + payment.amount;
      const newRemaining = Math.max(0, target.originalAmount - newSettled);
      let newStatus: MoneyOwed['status'] = 'Partially Settled';
      if (newRemaining === 0) {
        newStatus = 'Settled';
      }

      const updated: MoneyOwed = {
        ...target,
        amountSettled: newSettled,
        remainingAmount: newRemaining,
        status: newStatus,
        payments: [...(target.payments || []), payment],
        updatedAt: Date.now(),
      };

      setMoneyOwed((prev) => prev.map((m) => (m.id === id ? updated : m)));
      await storage.saveMoneyOwed(updated);
      if (user) {
        saveCloudMoneyOwed(user.uid, updated).catch(console.warn);
        saveCloudMoneyOwedPayment(user.uid, id, payment).catch(console.warn);
      }
    },
    [moneyOwed, user]
  );

  const deleteMoneyOwed = useCallback(
    async (id: string) => {
      setMoneyOwed((prev) => prev.filter((m) => m.id !== id));
      await storage.deleteMoneyOwed(id);
      if (user) deleteCloudMoneyOwed(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Loans & EMIs
  const addLoan = useCallback(
    async (loanData: Omit<Loan, 'id' | 'createdAt'>): Promise<Loan> => {
      const newLoan: Loan = {
        ...loanData,
        id: `loan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setLoans((prev) => [newLoan, ...prev]);
      await storage.saveLoan(newLoan);
      if (user) saveCloudLoan(user.uid, newLoan).catch(console.warn);
      return newLoan;
    },
    [user]
  );

  const recordLoanPayment = useCallback(
    async (loanId: string, amount: number, paymentMethod: any = 'Bank Transfer', note?: string) => {
      const target = loans.find((l) => l.id === loanId);
      if (!target) return;

      const newOutstanding = Math.max(0, target.outstandingAmount - amount);
      const isClosed = newOutstanding === 0;

      const updated: Loan = {
        ...target,
        outstandingAmount: newOutstanding,
        status: isClosed ? 'Closed' : 'Active',
        updatedAt: Date.now(),
      };

      setLoans((prev) => prev.map((l) => (l.id === loanId ? updated : l)));
      await storage.saveLoan(updated);
      if (user) saveCloudLoan(user.uid, updated).catch(console.warn);
    },
    [loans, user]
  );

  const deleteLoan = useCallback(
    async (id: string) => {
      setLoans((prev) => prev.filter((l) => l.id !== id));
      await storage.deleteLoan(id);
      if (user) deleteCloudLoan(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Bills
  const addBill = useCallback(
    async (billData: Omit<Bill, 'id' | 'createdAt'>): Promise<Bill> => {
      const newBill: Bill = {
        ...billData,
        id: `bill-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setBills((prev) => [newBill, ...prev]);
      await storage.saveBill(newBill);
      if (user) saveCloudBill(user.uid, newBill).catch(console.warn);
      return newBill;
    },
    [user]
  );

  const updateBill = useCallback(
    async (bill: Bill) => {
      const updated = { ...bill, updatedAt: Date.now() };
      setBills((prev) => prev.map((b) => (b.id === bill.id ? updated : b)));
      await storage.saveBill(updated);
      if (user) saveCloudBill(user.uid, updated).catch(console.warn);
    },
    [user]
  );

  const markBillPaid = useCallback(
    async (id: string) => {
      const target = bills.find((b) => b.id === id);
      if (!target) return;
      const updated: Bill = {
        ...target,
        paid: true,
        paymentDate: toDateString(new Date()),
        updatedAt: Date.now(),
      };
      setBills((prev) => prev.map((b) => (b.id === id ? updated : b)));
      await storage.saveBill(updated);
      if (user) saveCloudBill(user.uid, updated).catch(console.warn);
    },
    [bills, user]
  );

  const deleteBill = useCallback(
    async (id: string) => {
      setBills((prev) => prev.filter((b) => b.id !== id));
      await storage.deleteBill(id);
      if (user) deleteCloudBill(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Subscriptions
  const addSubscription = useCallback(
    async (subData: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription> => {
      const newSub: Subscription = {
        ...subData,
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSubscriptions((prev) => [newSub, ...prev]);
      await storage.saveSubscription(newSub);
      if (user) saveCloudSubscription(user.uid, newSub).catch(console.warn);
      return newSub;
    },
    [user]
  );

  const updateSubscription = useCallback(
    async (sub: Subscription) => {
      const updated = { ...sub, updatedAt: Date.now() };
      setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
      await storage.saveSubscription(updated);
      if (user) saveCloudSubscription(user.uid, updated).catch(console.warn);
    },
    [user]
  );

  const toggleSubscriptionActive = useCallback(
    async (id: string) => {
      const target = subscriptions.find((s) => s.id === id);
      if (!target) return;
      const updated: Subscription = {
        ...target,
        isActive: !target.isActive,
        updatedAt: Date.now(),
      };
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      await storage.saveSubscription(updated);
      if (user) saveCloudSubscription(user.uid, updated).catch(console.warn);
    },
    [subscriptions, user]
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      await storage.deleteSubscription(id);
      if (user) deleteCloudSubscription(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Emergency Fund
  const updateEmergencyFundSetup = useCallback(
    async (
      essentialExpenses: number,
      targetMonths: number,
      currentAmount: number,
      monthlyContributionPlan?: number
    ) => {
      const updated: EmergencyFund = {
        id: 'main',
        ownerId: user?.uid,
        essentialMonthlyExpenses: Math.round(essentialExpenses),
        targetMonths,
        currentAmount: Math.round(currentAmount),
        monthlyContributionPlan: monthlyContributionPlan ? Math.round(monthlyContributionPlan) : 0,
        contributions: emergencyFund?.contributions || [],
        updatedAt: Date.now(),
      };
      setEmergencyFund(updated);
      await storage.saveEmergencyFund(updated);
      if (user) saveCloudEmergencyFund(user.uid, updated).catch(console.warn);
    },
    [emergencyFund, user]
  );

  const recordEmergencyFundContribution = useCallback(
    async (amount: number, note?: string) => {
      const current = emergencyFund || {
        id: 'main',
        ownerId: user?.uid,
        essentialMonthlyExpenses: 25000,
        targetMonths: 6,
        currentAmount: 0,
        contributions: [],
      };

      const contrib: EmergencyFundContribution = {
        id: `efc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'deposit',
        amount: Math.round(amount),
        date: toDateString(new Date()),
        note: note?.trim(),
        createdAt: Date.now(),
      };

      const updated: EmergencyFund = {
        ...current,
        currentAmount: current.currentAmount + contrib.amount,
        contributions: [contrib, ...(current.contributions || [])],
        updatedAt: Date.now(),
      };

      setEmergencyFund(updated);
      await storage.saveEmergencyFund(updated);
      if (user) {
        saveCloudEmergencyFund(user.uid, updated).catch(console.warn);
        saveCloudEmergencyContribution(user.uid, contrib).catch(console.warn);
      }
    },
    [emergencyFund, user]
  );

  const recordEmergencyFundWithdrawal = useCallback(
    async (amount: number, note?: string, associatedExpenseId?: string) => {
      if (!emergencyFund) return;

      const contrib: EmergencyFundContribution = {
        id: `efw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'withdrawal',
        amount: Math.round(amount),
        date: toDateString(new Date()),
        note: note?.trim(),
        associatedExpenseId,
        createdAt: Date.now(),
      };

      const updated: EmergencyFund = {
        ...emergencyFund,
        currentAmount: Math.max(0, emergencyFund.currentAmount - contrib.amount),
        contributions: [contrib, ...(emergencyFund.contributions || [])],
        updatedAt: Date.now(),
      };

      setEmergencyFund(updated);
      await storage.saveEmergencyFund(updated);
      if (user) {
        saveCloudEmergencyFund(user.uid, updated).catch(console.warn);
        saveCloudEmergencyContribution(user.uid, contrib).catch(console.warn);
      }
    },
    [emergencyFund, user]
  );

  // Financial Reminders
  const addReminder = useCallback(
    async (remData: Omit<FinancialReminder, 'id' | 'createdAt'>): Promise<FinancialReminder> => {
      const newRem: FinancialReminder = {
        ...remData,
        id: `rem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setReminders((prev) => [newRem, ...prev]);
      await storage.saveReminder(newRem);
      if (user) saveCloudReminder(user.uid, newRem).catch(console.warn);
      return newRem;
    },
    [user]
  );

  const markReminderPaid = useCallback(
    async (id: string) => {
      const target = reminders.find((r) => r.id === id);
      if (!target) return;
      const updated: FinancialReminder = {
        ...target,
        status: 'Paid',
        lastPaidDate: toDateString(new Date()),
        updatedAt: Date.now(),
      };
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      await storage.saveReminder(updated);
      if (user) saveCloudReminder(user.uid, updated).catch(console.warn);
    },
    [reminders, user]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      setReminders((prev) => prev.filter((r) => r.id !== id));
      await storage.deleteReminder(id);
      if (user) deleteCloudReminder(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Transfers
  const addTransfer = useCallback(
    async (trData: Omit<Transfer, 'id' | 'createdAt'>): Promise<Transfer> => {
      const newTransfer: Transfer = {
        ...trData,
        id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
      };
      setTransfers((prev) => [newTransfer, ...prev]);
      await storage.saveTransfer(newTransfer);
      if (user) saveCloudTransfer(user.uid, newTransfer).catch(console.warn);
      return newTransfer;
    },
    [user]
  );

  // Accounts
  const addAccount = useCallback(
    async (accData: Omit<FinancialAccount, 'id'>): Promise<FinancialAccount> => {
      const newAcc: FinancialAccount = {
        ...accData,
        id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        updatedAt: Date.now(),
      };
      setAccounts((prev) => [...prev, newAcc]);
      await storage.saveAccount(newAcc);
      if (user) saveCloudAccount(user.uid, newAcc).catch(console.warn);
      return newAcc;
    },
    [user]
  );

  const updateAccountBalance = useCallback(
    async (id: string, newBalance: number) => {
      const target = accounts.find((a) => a.id === id);
      if (!target) return;
      const updated: FinancialAccount = { ...target, balance: newBalance, updatedAt: Date.now() };
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      await storage.saveAccount(updated);
      if (user) saveCloudAccount(user.uid, updated).catch(console.warn);
    },
    [accounts, user]
  );

  // Notifications
  const markNotificationRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, updatedAt: Date.now() } : n))
      );
      const target = notifications.find((n) => n.id === id);
      if (target) {
        const updated = { ...target, read: true, updatedAt: Date.now() };
        await storage.saveNotification(updated);
        if (user) saveCloudNotification(user.uid, updated).catch(console.warn);
      }
    },
    [notifications, user]
  );

  const resolveNotification = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, resolved: true, status: 'resolved', updatedAt: Date.now() } : n))
      );
      const target = notifications.find((n) => n.id === id);
      if (target) {
        const updated: AppNotification = { ...target, resolved: true, status: 'resolved', updatedAt: Date.now() };
        await storage.saveNotification(updated);
        if (user) saveCloudNotification(user.uid, updated).catch(console.warn);
      }
    },
    [notifications, user]
  );

  const clearAllNotifications = useCallback(async () => {
    setNotifications([]);
    await storage.setAllNotifications([]);
  }, []);

  // Savings
  const addSavings = useCallback(
    async (recData: Omit<SavingsRecord, 'id' | 'createdAt'>): Promise<SavingsRecord> => {
      const newSavings: SavingsRecord = {
        ...recData,
        id: `sav-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSavings((prev) => [newSavings, ...prev]);
      await storage.saveSavings(newSavings);
      if (user) saveCloudSavings(user.uid, newSavings).catch(console.warn);
      return newSavings;
    },
    [user]
  );

  const updateSavings = useCallback(
    async (rec: SavingsRecord) => {
      const updated = { ...rec, updatedAt: Date.now() };
      setSavings((prev) => prev.map((s) => (s.id === rec.id ? updated : s)));
      await storage.saveSavings(updated);
      if (user) saveCloudSavings(user.uid, updated).catch(console.warn);
    },
    [user]
  );

  const deleteSavings = useCallback(
    async (id: string) => {
      setSavings((prev) => prev.filter((s) => s.id !== id));
      await storage.deleteSavings(id);
      if (user) deleteCloudSavings(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Investment
  const addInvestment = useCallback(
    async (invData: Omit<Investment, 'id' | 'createdAt'>): Promise<Investment> => {
      const newInv: Investment = {
        ...invData,
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setInvestments((prev) => [newInv, ...prev]);
      await storage.saveInvestment(newInv);
      if (user) saveCloudInvestment(user.uid, newInv).catch(console.warn);
      return newInv;
    },
    [user]
  );

  const updateInvestment = useCallback(
    async (inv: Investment) => {
      const updated = { ...inv, updatedAt: Date.now() };
      setInvestments((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
      await storage.saveInvestment(updated);
      if (user) saveCloudInvestment(user.uid, updated).catch(console.warn);
    },
    [user]
  );

  const deleteInvestment = useCallback(
    async (id: string) => {
      setInvestments((prev) => prev.filter((i) => i.id !== id));
      await storage.deleteInvestment(id);
      if (user) deleteCloudInvestment(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Goals
  const addGoal = useCallback(
    async (goalData: Omit<FinancialGoal, 'id' | 'createdAt'>): Promise<FinancialGoal> => {
      const newGoal: FinancialGoal = {
        ...goalData,
        id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setGoals((prev) => [...prev, newGoal]);
      await storage.saveGoal(newGoal);
      if (user) saveCloudGoal(user.uid, newGoal).catch(console.warn);
      return newGoal;
    },
    [user]
  );

  const updateGoal = useCallback(
    async (goal: FinancialGoal) => {
      const updated = { ...goal, updatedAt: Date.now() };
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
      await storage.saveGoal(updated);
      if (user) saveCloudGoal(user.uid, updated).catch(console.warn);
    },
    [user]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      await storage.deleteGoal(id);
      if (user) deleteCloudGoal(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Subcategory Budgets
  const setSubcategoryBudget = useCallback(
    async (category: CategoryType, subcategory: string, amount: number, month = selectedMonth) => {
      const id = `bud-${month}-${subcategory.toLowerCase().replace(/\s+/g, '-')}`;
      const newBudget: SubcategoryBudget = {
        id,
        ownerId: user?.uid,
        category,
        subcategory,
        amount,
        month,
        updatedAt: Date.now(),
      };
      setBudgets((prev) => {
        const idx = prev.findIndex((b) => b.subcategory.toLowerCase() === subcategory.toLowerCase() && b.month === month);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = newBudget;
          return updated;
        }
        return [...prev, newBudget];
      });
      await storage.saveBudget(newBudget);
      if (user) saveCloudBudget(user.uid, newBudget).catch(console.warn);
    },
    [selectedMonth, user]
  );

  // Subcategories
  const addSubcategory = useCallback(
    async (name: string, category: CategoryType, iconName = 'Tag') => {
      const id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const subcat: Subcategory = { id, ownerId: user?.uid, name, category, iconName };
      setSubcategories((prev) => [...prev, subcat]);
      await storage.saveSubcategory(subcat);
      if (user) saveCloudSubcategory(user.uid, subcat).catch(console.warn);
    },
    [user]
  );

  const deleteSubcategory = useCallback(
    async (id: string) => {
      setSubcategories((prev) => prev.filter((s) => s.id !== id));
      await storage.deleteSubcategory(id);
      if (user) deleteCloudSubcategory(user.uid, id).catch(console.warn);
    },
    [user]
  );

  // Alerts
  const addAlert = useCallback(
    async (alertData: Omit<Alert, 'id' | 'createdAt' | 'ownerId'>): Promise<Alert> => {
      const newAlert: Alert = {
        ...alertData,
        id: `alt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: user?.uid || 'local_user',
        status: 'armed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setAlerts((prev) => [newAlert, ...prev]);
      await storage.saveAlert(newAlert);
      if (user) saveCloudAlert(user.uid, newAlert).catch(console.warn);
      return newAlert;
    },
    [user]
  );

  const updateAlert = useCallback(
    async (alert: Alert) => {
      const updated = { ...alert, updatedAt: Date.now() };
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
      await storage.saveAlert(updated);
      if (user) saveCloudAlert(user.uid, updated).catch(console.warn);
    },
    [user]
  );

  const deleteAlert = useCallback(
    async (id: string) => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      await storage.deleteAlert(id);
      if (user) deleteCloudAlert(user.uid, id).catch(console.warn);
    },
    [user]
  );

  const activeTriggeredAlertsCount = useMemo(
    () => alerts.filter((a) => a.enabled && a.status === 'triggered').length + notifications.filter((n) => !n.read).length,
    [alerts, notifications]
  );

  // AI Assistant Query Handler with Full Summarized Financial Context
  const askFinTraQAI = useCallback(
    async (question: string): Promise<string> => {
      setIsAiLoading(true);
      setAiStatusError(null);

      // (1) If there is no signed-in user, do not call the server.
      if (!user) {
        setIsAiLoading(false);
        const unauthError = createAiStatusError(null, true);
        setAiStatusError(unauthError);
        return unauthError.message;
      }

      const startingUid = user.uid;
      const getCurrentUid = () => (userRef.current ? userRef.current.uid : auth.currentUser ? auth.currentUser.uid : null);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        try {
          const idToken = await user.getIdToken();
          if (idToken && typeof idToken === 'string' && idToken.trim().length > 0) {
            headers['Authorization'] = `Bearer ${idToken.trim()}`;
          }
        } catch {
          // Token error fallback
        }

        const financialContext = {
          selectedMonth,
          incomeBreakdown,
          summary: monthlySummary,
          categories: categorySummaries,
          emergencyFund: emergencyFundDetails,
          moneyOwed,
          loans,
          upcoming: upcomingObligations,
          overdue: overdueObligations,
          subscriptions,
          investments,
          goals,
          netWorth: netWorthSummary,
        };

        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: question,
            history: chatMessages.slice(-8).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            financialContext,
          }),
        });

        if (!res.ok) {
          if (!shouldApplyAiReply(startingUid, getCurrentUid())) {
            return '';
          }
          // (2) Map status codes to honest messages: 401, 429, 503, other
          const statusError = createAiStatusError(res.status, false);
          setAiStatusError(statusError);
          // (3) Never save a failure message as if it were a real assistant reply in stored chat history
          return statusError.message;
        }

        const data = await res.json();
        const reply = data.reply;

        if (!shouldApplyAiReply(startingUid, getCurrentUid())) {
          return '';
        }

        const userMsg: ChatMessage = {
          id: `msg-u-${Date.now()}`,
          role: 'user',
          content: question,
          timestamp: Date.now(),
        };
        const assistantMsg: ChatMessage = {
          id: `msg-a-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: Date.now(),
          contextSummary: data.contextSnippet,
          actionProposal: data.actionProposal,
        };

        // Before the two storage.saveChatMessage calls, re-check the user and active storage scope
        if (!shouldApplyAiReply(startingUid, getCurrentUid()) || storage.getScope() !== `user_${startingUid}`) {
          return '';
        }

        const updated = [...chatMessages, userMsg, assistantMsg];
        setChatMessages(updated);
        await storage.saveChatMessage(userMsg);

        // After the first save, check again. If the user changed or scope switched in between, do not write the assistant message.
        if (!shouldApplyAiReply(startingUid, getCurrentUid()) || storage.getScope() !== `user_${startingUid}`) {
          return '';
        }

        await storage.saveChatMessage(assistantMsg);
        return reply;
      } catch (err: any) {
        console.warn('AI Assistant notice:', err);
        if (!shouldApplyAiReply(startingUid, getCurrentUid())) {
          return '';
        }
        const statusError = createAiStatusError(err?.status || 500, false);
        setAiStatusError(statusError);
        // (3) Never save a failure message as if it were a real assistant reply in stored chat history
        return statusError.message;
      } finally {
        if (shouldApplyAiReply(startingUid, getCurrentUid())) {
          setIsAiLoading(false);
        }
      }
    },
    [
      user,
      selectedMonth,
      incomeBreakdown,
      monthlySummary,
      categorySummaries,
      emergencyFundDetails,
      moneyOwed,
      loans,
      upcomingObligations,
      overdueObligations,
      subscriptions,
      investments,
      goals,
      netWorthSummary,
      chatMessages,
    ]
  );

  const clearChatMessages = useCallback(async () => {
    setChatMessages([]);
    await storage.clearChatMessages();
  }, []);

  // Backup & Import
  const exportData = useCallback(async () => {
    return storage.exportBackup();
  }, []);

  const importData = useCallback(
    async (jsonString: string) => {
      const res = await storage.importBackup(jsonString);
      if (res.success) {
        await loadLocalCache();
      }
      return res;
    },
    [loadLocalCache]
  );

  // ==================== SPLIT / GROUP EXPENSES ====================

  const globalGroupBalancesSummary = useMemo<GlobalGroupBalancesSummary>(() => {
    let totalYouAreOwed = 0;
    let totalYouOwe = 0;
    const unsettledGroups: Array<{ groupId: string; groupName: string; userNet: number }> = [];

    const activeGroups = splitGroups.filter((g) => !g.isArchived);

    for (const group of activeGroups) {
      const expensesList = groupExpenses[group.id] || [];
      const settlementsList = groupSettlements[group.id] || [];
      const balances = SplitSettlementEngine.calculateMemberBalances(group.members, expensesList, settlementsList);
      const userBal = balances.find((b) => b.isCurrentUser);

      if (userBal && userBal.netBalance !== 0) {
        if (userBal.netBalance > 0) {
          totalYouAreOwed += userBal.netBalance;
        } else {
          totalYouOwe += Math.abs(userBal.netBalance);
        }
        unsettledGroups.push({
          groupId: group.id,
          groupName: group.name,
          userNet: userBal.netBalance,
        });
      }
    }

    return {
      totalYouAreOwed: Math.round(totalYouAreOwed * 100) / 100,
      totalYouOwe: Math.round(totalYouOwe * 100) / 100,
      netGroupBalance: Math.round((totalYouAreOwed - totalYouOwe) * 100) / 100,
      activeGroupCount: activeGroups.length,
      unsettledGroups,
    };
  }, [splitGroups, groupExpenses, groupSettlements]);

  const getGroupFinancialSummary = useCallback(
    (groupId: string): GroupFinancialSummary => {
      const group = splitGroups.find((g) => g.id === groupId);
      if (!group) {
        return {
          totalSpent: 0,
          totalSettled: 0,
          currentUserPaid: 0,
          currentUserShare: 0,
          currentUserNetBalance: 0,
          memberBalances: [],
          optimalSettlements: [],
          expenseCount: 0,
          settlementCount: 0,
        };
      }
      const expensesList = groupExpenses[groupId] || [];
      const settlementsList = groupSettlements[groupId] || [];
      return SplitSettlementEngine.calculateGroupSummary(group.members, expensesList, settlementsList);
    },
    [splitGroups, groupExpenses, groupSettlements]
  );

  // Realtime subscription to the active group (scoped strictly to authenticated member)
  useEffect(() => {
    if (!activeSplitGroupId || !user?.uid || !auth.currentUser?.uid) return;

    // 1. Subscribe to group doc
    const unsubDoc = subscribeToSharedGroupDoc(activeSplitGroupId, (remoteGroup) => {
      if (remoteGroup) {
        setSplitGroups((prev) => {
          const idx = prev.findIndex((g) => g.id === remoteGroup.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = remoteGroup;
            return next;
          }
          return [remoteGroup, ...prev];
        });
        storage.saveSplitGroup(remoteGroup).catch(console.warn);
      }
    });

    // 2. Subscribe to expenses
    const unsubExp = subscribeToSharedGroupExpenses(activeSplitGroupId, (remoteExpenses) => {
      setGroupExpenses((prev) => ({
        ...prev,
        [activeSplitGroupId]: remoteExpenses,
      }));
      remoteExpenses.forEach((exp) => storage.saveGroupExpense(exp).catch(console.warn));
    });

    // 3. Subscribe to settlements
    const unsubSet = subscribeToSharedGroupSettlements(activeSplitGroupId, (remoteSettlements) => {
      setGroupSettlements((prev) => ({
        ...prev,
        [activeSplitGroupId]: remoteSettlements,
      }));
      remoteSettlements.forEach((s) => storage.saveGroupSettlement(s).catch(console.warn));
    });

    // 4. Subscribe to activities
    const unsubAct = subscribeToSharedGroupActivity(activeSplitGroupId, (remoteActivities) => {
      setGroupActivities((prev) => ({
        ...prev,
        [activeSplitGroupId]: remoteActivities,
      }));
    });

    // 5. Fetch invitations for group
    fetchGroupInvitations(activeSplitGroupId)
      .then((invs) => {
        setGroupInvitations((prev) => ({
          ...prev,
          [activeSplitGroupId]: invs,
        }));
      })
      .catch(console.warn);

    return () => {
      unsubDoc();
      unsubExp();
      unsubSet();
      unsubAct();
    };
  }, [activeSplitGroupId, user?.uid]);

  const createSplitGroup = useCallback(
    async (
      name: string,
      description?: string,
      membersList?: { name: string; email?: string; phone?: string; role?: MemberRole }[],
      icon?: string,
      color?: string
    ): Promise<SplitGroup> => {
      const currentUserName = user?.displayName ? user.displayName.split(' ')[0] : 'You';
      const currentUserMember: GroupMember = {
        id: user?.uid || 'member-me',
        uid: user?.uid,
        name: currentUserName,
        email: user?.email || undefined,
        role: 'owner',
        status: 'joined',
        joinedAt: Date.now(),
        isCurrentUser: true,
      };

      const otherMembers: GroupMember[] = (membersList || []).map((m, idx) => ({
        id: `mem-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        name: m.name.trim(),
        email: m.email?.trim() || undefined,
        phone: m.phone?.trim() || undefined,
        role: m.role || 'member',
        status: m.email || m.phone ? 'invited' : 'joined',
        isCurrentUser: false,
      }));

      const memberUids: string[] = [];
      const authenticatedUid = user?.uid || auth.currentUser?.uid;
      const currentOwnerId = authenticatedUid || 'local_user';
      if (authenticatedUid) memberUids.push(authenticatedUid);

      const newGroup: SplitGroup = {
        id: `grp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: currentOwnerId,
        ownerName: user?.displayName || user?.email?.split('@')[0] || currentUserName,
        memberUids,
        name: name.trim(),
        description: description?.trim() || undefined,
        currency: 'INR',
        icon: icon || 'Users',
        color: color || '#10B981',
        members: [currentUserMember, ...otherMembers],
        isArchived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setSplitGroups((prev) => [newGroup, ...prev]);
      setActiveSplitGroupId(newGroup.id);
      await storage.saveSplitGroup(newGroup);

      // Save to shared Firestore collection ONLY when user is fully authenticated
      if (authenticatedUid && auth.currentUser?.uid) {
        await saveSharedGroup(newGroup).catch(console.warn);
        saveCloudSplitGroup(authenticatedUid, newGroup).catch(console.warn);

        // Record Activity
        await recordSharedGroupActivity(newGroup.id, {
          id: `act-${Date.now()}`,
          groupId: newGroup.id,
          actorUid: authenticatedUid,
          actorName: currentUserName,
          action: 'created_group',
          title: `${currentUserName} created the group "${newGroup.name}"`,
          timestamp: Date.now(),
        }).catch(console.warn);
      }

      return newGroup;
    },
    [user]
  );

  const updateSplitGroup = useCallback(
    async (group: SplitGroup): Promise<void> => {
      const updated = { ...group, updatedAt: Date.now() };
      setSplitGroups((prev) => prev.map((g) => (g.id === group.id ? updated : g)));
      await storage.saveSplitGroup(updated);
      if (user?.uid) {
        await saveSharedGroup(updated).catch(console.warn);
        saveCloudSplitGroup(user.uid, updated).catch(console.warn);
      }
    },
    [user]
  );

  const archiveSplitGroup = useCallback(
    async (groupId: string, isArchived: boolean): Promise<void> => {
      const group = splitGroups.find((g) => g.id === groupId);
      if (!group) return;
      const updated = { ...group, isArchived, updatedAt: Date.now() };
      setSplitGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
      await storage.saveSplitGroup(updated);
      if (user?.uid) {
        await saveSharedGroup(updated).catch(console.warn);
        saveCloudSplitGroup(user.uid, updated).catch(console.warn);
      }
    },
    [splitGroups, user]
  );

  const deleteSplitGroup = useCallback(
    async (groupId: string): Promise<void> => {
      const group = splitGroups.find((g) => g.id === groupId);
      if (!group) return;

      // Authorization invariant: Only group owner or local creator can delete the group
      const currentUid = user?.uid;
      const isOwner =
        !group.ownerId ||
        group.ownerId === 'local_user' ||
        (currentUid && group.ownerId === currentUid);

      if (!isOwner) {
        throw new Error('Only the group owner is authorized to delete this group.');
      }

      // Accounting safety: Reconcile linked personal expenses and receivables
      let expensesList = groupExpenses[groupId] || [];
      if (expensesList.length === 0) {
        try {
          const stored = await storage.getGroupExpenses(groupId);
          if (stored && stored.length > 0) expensesList = stored;
        } catch (e) {
          console.warn('Storage fetch fallback notice in deleteSplitGroup:', e);
        }
      }
      for (const exp of expensesList) {
        if (exp.linkedPersonalExpenseId) {
          await deleteExpense(exp.linkedPersonalExpenseId).catch(console.warn);
        }
        if (exp.linkedMoneyOwedIds) {
          for (const oid of exp.linkedMoneyOwedIds) {
            await deleteMoneyOwed(oid).catch(console.warn);
          }
        }
      }

      // Clear in-memory group states
      setSplitGroups((prev) => {
        const remaining = prev.filter((g) => g.id !== groupId);
        return remaining;
      });

      if (activeSplitGroupId === groupId) {
        const remaining = splitGroups.filter((g) => g.id !== groupId);
        setActiveSplitGroupId(remaining.length > 0 ? remaining[0].id : null);
      }

      setGroupExpenses((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });

      setGroupSettlements((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });

      setGroupActivities((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });

      setGroupInvitations((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });

      // Local persistent IndexedDB deletion
      await storage.deleteSplitGroup(groupId);

      // Cloud Firestore authoritative deletion
      if (user?.uid) {
        await deleteSharedGroup(groupId).catch(console.warn);
        deleteCloudSplitGroup(user.uid, groupId).catch(console.warn);
      }
    },
    [splitGroups, activeSplitGroupId, groupExpenses, user, deleteExpense, deleteMoneyOwed]
  );

  // --- COLLABORATIVE INVITATIONS ---

  const inviteMemberToGroup = useCallback(
    async (
      groupId: string,
      identifier: string,
      type: 'email' | 'phone',
      recipientName?: string,
      role: MemberRole = 'member'
    ): Promise<{ invitation: GroupInvitation; deliveryResult: DeliveryResult }> => {
      const group = splitGroups.find((g) => g.id === groupId);
      if (!group) throw new Error('Group not found');

      // Strict validation
      let cleanId = identifier.trim();
      let normalizedEmail: string | undefined;
      let normalizedPhone: string | undefined;

      if (type === 'email') {
        const val = validateEmail(cleanId);
        if (!val.isValid) throw new Error(val.error || 'Please enter a valid email address.');
        cleanId = val.normalized;
        normalizedEmail = val.normalized;
      } else {
        const val = validatePhone(cleanId);
        if (!val.isValid) throw new Error(val.error || 'Please enter a valid phone number.');
        cleanId = val.normalized;
        normalizedPhone = val.normalized;
      }

      // Check existing active membership (Requirement 18)
      const existingMember = group.members.find(
        (m) =>
          !m.isInactive &&
          m.status === 'joined' &&
          ((type === 'email' && m.email?.toLowerCase() === cleanId.toLowerCase()) ||
            (type === 'phone' && m.phone === cleanId))
      );
      if (existingMember) {
        throw new Error(`${recipientName || cleanId} is already a member of this group.`);
      }

      // Try server endpoint first (Requirement 13)
      let idToken = '';
      if (user) {
        try {
          idToken = (await user.getIdToken()) || '';
        } catch (tokErr) {
          console.warn('Failed to obtain user ID token:', tokErr);
        }
      }

      if (idToken) {
        try {
          const apiRes = await InvitationDeliveryProvider.createGroupInvitation(
            groupId,
            {
              email: normalizedEmail,
              phone: normalizedPhone,
              name: recipientName?.trim() || undefined,
              role: role === 'admin' ? 'admin' : 'member',
              inviterName: user?.displayName || user?.email?.split('@')[0] || 'A Money Vault Member',
              groupData: group,
            },
            idToken
          );

          const { invitation, deliveryResult } = apiRes;

          // Update local context
          setGroupInvitations((prev) => ({
            ...prev,
            [groupId]: [invitation, ...(prev[groupId] || []).filter((i) => i.id !== invitation.id)],
          }));

          // Add placeholder member to group in local state
          const placeholderExists = group.members.some(
            (m) =>
              (type === 'email' && m.email?.toLowerCase() === cleanId.toLowerCase()) ||
              (type === 'phone' && m.phone === cleanId)
          );
          if (!placeholderExists) {
            const newMember: GroupMember = {
              id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: recipientName?.trim() || cleanId.split('@')[0],
              email: normalizedEmail,
              phone: normalizedPhone,
              role,
              status: 'invited',
              isCurrentUser: false,
            };
            const updatedGroup = {
              ...group,
              members: [...group.members, newMember],
              updatedAt: Date.now(),
            };
            setSplitGroups((prev) => prev.map((g) => (g.id === groupId ? updatedGroup : g)));
            await storage.saveSplitGroup(updatedGroup).catch(console.warn);
          }

          return { invitation, deliveryResult };
        } catch (apiErr: any) {
          if (apiErr?.isDuplicate) {
            throw apiErr;
          }
          console.warn('Backend invitation dispatch error, falling back to client dispatch:', apiErr);
        }
      }

      // Client-side fallback if server offline
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      const secureToken = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
      const inviterName = user?.displayName || user?.email?.split('@')[0] || 'A Money Vault Member';

      const invitation: GroupInvitation = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        token: secureToken,
        groupId,
        groupName: group.name,
        groupDescription: group.description,
        currency: group.currency || 'INR',
        invitedByUid: user?.uid || 'local-user',
        invitedByName: inviterName,
        recipientIdentifier: cleanId,
        recipientType: type,
        recipientEmail: normalizedEmail,
        recipientPhone: normalizedPhone,
        recipientName: recipientName?.trim() || undefined,
        role: role === 'admin' ? 'admin' : 'member',
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        status: 'pending',
        deliveryStatus: 'not_configured',
      };

      let deliveryResult: DeliveryResult;
      if (idToken) {
        try {
          if (type === 'email') {
            deliveryResult = await InvitationDeliveryProvider.sendEmailInvitation(
              invitation,
              cleanId,
              recipientName?.trim() || undefined,
              idToken
            );
          } else {
            deliveryResult = await InvitationDeliveryProvider.sendSmsInvitation(
              invitation,
              cleanId,
              idToken
            );
          }
        } catch (sendErr: any) {
          deliveryResult = {
            success: false,
            deliveryStatus: 'failed',
            failureReason: sendErr?.message || 'Failed to dispatch invitation',
            message: sendErr?.message || 'Failed to dispatch invitation',
            shareableUrl: InvitationDeliveryProvider.getInviteUrl(invitation.token),
          };
        }
      } else {
        deliveryResult = {
          success: false,
          deliveryStatus: 'not_configured',
          message: 'Sign in to deliver invitations via email or SMS. You can copy or share the invitation link below.',
          shareableUrl: InvitationDeliveryProvider.getInviteUrl(invitation.token),
        };
      }

      invitation.deliveryStatus = deliveryResult.deliveryStatus;
      invitation.deliveryProvider = deliveryResult.provider;
      invitation.deliveryMessage = deliveryResult.message;
      invitation.failureReason = deliveryResult.failureReason;

      await saveGroupInvitation(invitation).catch(console.warn);
      setGroupInvitations((prev) => ({
        ...prev,
        [groupId]: [invitation, ...(prev[groupId] || []).filter((i) => i.id !== invitation.id)],
      }));

      return { invitation, deliveryResult };
    },
    [splitGroups, user]
  );

  const resendGroupInvitation = useCallback(
    async (invitation: GroupInvitation): Promise<DeliveryResult> => {
      let idToken = '';
      if (user) {
        try {
          idToken = (await user.getIdToken()) || '';
        } catch (tokErr) {
          console.warn('Failed to obtain user ID token for resend:', tokErr);
        }
      }

      if (!idToken) {
        return {
          success: false,
          deliveryStatus: 'failed',
          failureReason: 'Authentication required to resend invitations.',
          message: 'Please sign in to resend invitations.',
          shareableUrl: InvitationDeliveryProvider.getInviteUrl(invitation.token),
        };
      }

      try {
        const result = await InvitationDeliveryProvider.resendGroupInvitation(
          invitation.groupId,
          invitation.id,
          idToken
        );
        setGroupInvitations((prev) => ({
          ...prev,
          [invitation.groupId]: (prev[invitation.groupId] || []).map((i) =>
            i.id === invitation.id
              ? {
                  ...i,
                  deliveryStatus: result.deliveryStatus,
                  deliveryProvider: result.provider || i.deliveryProvider,
                  failureReason: result.failureReason,
                  lastDeliveryAttemptAt: Date.now(),
                }
              : i
          ),
        }));
        return result;
      } catch (err: any) {
        if (invitation.recipientType === 'email') {
          return await InvitationDeliveryProvider.sendEmailInvitation(
            invitation,
            invitation.recipientIdentifier,
            invitation.recipientName,
            idToken
          ).catch((e: any) => ({
            success: false,
            deliveryStatus: 'failed',
            failureReason: e?.message || 'Delivery failed',
            message: e?.message || 'Delivery failed',
            shareableUrl: InvitationDeliveryProvider.getInviteUrl(invitation.token),
          }));
        } else {
          return await InvitationDeliveryProvider.sendSmsInvitation(
            invitation,
            invitation.recipientIdentifier,
            idToken
          ).catch((e: any) => ({
            success: false,
            deliveryStatus: 'failed',
            failureReason: e?.message || 'Delivery failed',
            message: e?.message || 'Delivery failed',
            shareableUrl: InvitationDeliveryProvider.getInviteUrl(invitation.token),
          }));
        }
      }
    },
    [user]
  );

  const revokeGroupInvitation = useCallback(
    async (groupId: string, token: string): Promise<void> => {
      const inv = (groupInvitations[groupId] || []).find((i) => i.token === token);
      if (inv && user) {
        try {
          const idToken = (await user.getIdToken()) || '';
          if (idToken) {
            await InvitationDeliveryProvider.revokeGroupInvitation(groupId, inv.id, idToken).catch(
              console.warn
            );
          }
        } catch (revErr) {
          console.warn('Revoke invitation error:', revErr);
        }
      }
      await updateGroupInvitationStatus(token, 'revoked').catch(console.warn);
      setGroupInvitations((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).map((i) => (i.token === token ? { ...i, status: 'revoked' } : i)),
      }));

      const group = splitGroups.find((g) => g.id === groupId);
      if (group && inv) {
        const updatedMembers = group.members.filter(
          (m) =>
            !(
              m.status === 'invited' &&
              ((inv.recipientType === 'email' && m.email === inv.recipientIdentifier) ||
                (inv.recipientType === 'phone' && m.phone === inv.recipientIdentifier))
            )
        );
        if (updatedMembers.length !== group.members.length) {
          await updateSplitGroup({ ...group, members: updatedMembers });
        }
      }
    },
    [splitGroups, groupInvitations, user, updateSplitGroup]
  );

  const joinGroupByInvitation = useCallback(
    async (
      token: string,
      options?: { confirmMismatchedIdentity?: boolean }
    ): Promise<{ success: boolean; group?: SplitGroup; error?: string }> => {
      if (!user) {
        return { success: false, error: 'Authentication required. Please sign in or create an account.' };
      }

      // 1. Try server acceptance endpoint first
      try {
        const idToken = await user.getIdToken().catch(() => undefined);
        const serverRes = await InvitationDeliveryProvider.acceptInvitation(
          token,
          {
            userUid: user.uid,
            userName: user.displayName || user.email?.split('@')[0] || 'Member',
            userEmail: user.email || undefined,
            confirmMismatchedIdentity: options?.confirmMismatchedIdentity,
          },
          idToken
        );
        if (serverRes.success && serverRes.group) {
          await storage.saveSplitGroup(serverRes.group).catch(console.warn);
          setSplitGroups((prev) => {
            const idx = prev.findIndex((g) => g.id === serverRes.group.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = serverRes.group;
              return next;
            }
            return [serverRes.group, ...prev];
          });
          setActiveSplitGroupId(serverRes.group.id);
          return { success: true, group: serverRes.group };
        }
      } catch (serverErr: any) {
        if (serverErr?.requiresExplicitConfirmation) {
          return {
            success: false,
            error: serverErr.message || 'Identity confirmation required.',
          };
        }
        console.warn('Server join fallback to Firestore:', serverErr?.message);
      }

      // 2. Direct Firestore fallback
      const invite = await fetchGroupInvitationByToken(token);
      if (!invite) {
        return { success: false, error: 'Invitation not found or link is invalid.' };
      }

      if (invite.status === 'revoked') {
        return { success: false, error: 'This invitation was revoked by the group owner.' };
      }

      if (invite.expiresAt < Date.now()) {
        return { success: false, error: 'This invitation has expired (valid for 7 days).' };
      }

      let group = await fetchSharedGroup(invite.groupId);
      if (!group) {
        group = splitGroups.find((g) => g.id === invite.groupId) || null;
      }
      if (!group) {
        return { success: false, error: 'Group workspace could not be found.' };
      }

      const userName = user.displayName || user.email?.split('@')[0] || 'Member';
      const existingMember = group.members.find(
        (m) => m.uid === user.uid || (user.email && m.email?.toLowerCase() === user.email.toLowerCase())
      );

      let updatedMembers: GroupMember[];
      if (existingMember) {
        updatedMembers = group.members.map((m) =>
          m.id === existingMember.id
            ? {
                ...m,
                uid: user.uid,
                name: m.name || userName,
                email: user.email || m.email,
                status: 'joined' as const,
                isInactive: false,
                isCurrentUser: true,
                joinedAt: Date.now(),
              }
            : { ...m, isCurrentUser: false }
        );
      } else {
        const newMember: GroupMember = {
          id: user.uid,
          uid: user.uid,
          name: userName,
          email: user.email || undefined,
          role: invite.role || 'member',
          status: 'joined',
          isCurrentUser: true,
          joinedAt: Date.now(),
        };
        updatedMembers = [...group.members.map((m) => ({ ...m, isCurrentUser: false })), newMember];
      }

      const uids = new Set(group.memberUids || []);
      uids.add(user.uid);
      if (group.ownerId) uids.add(group.ownerId);

      const updatedGroup: SplitGroup = {
        ...group,
        members: updatedMembers,
        memberUids: Array.from(uids),
        updatedAt: Date.now(),
      };

      await saveSharedGroup(updatedGroup);
      await storage.saveSplitGroup(updatedGroup);
      await updateGroupInvitationStatus(token, 'accepted', user.uid, userName);

      await recordSharedGroupActivity(group.id, {
        id: `act-${Date.now()}`,
        groupId: group.id,
        actorUid: user.uid,
        actorName: userName,
        action: 'joined_group',
        title: `${userName} joined "${group.name}"`,
        timestamp: Date.now(),
      }).catch(console.warn);

      setSplitGroups((prev) => {
        const idx = prev.findIndex((g) => g.id === updatedGroup.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedGroup;
          return next;
        }
        return [updatedGroup, ...prev];
      });
      setActiveSplitGroupId(updatedGroup.id);

      return { success: true, group: updatedGroup };
    },
    [user, splitGroups]
  );

  const removeGroupMember = useCallback(
    async (groupId: string, memberId: string): Promise<void> => {
      const group = splitGroups.find((g) => g.id === groupId);
      if (!group) return;

      const member = group.members.find((m) => m.id === memberId);
      if (!member) return;

      if (member.role === 'owner' || group.ownerId === member.uid || group.ownerId === member.id) {
        throw new Error('Cannot remove the group owner.');
      }

      const expensesList = groupExpenses[groupId] || [];
      const settlementsList = groupSettlements[groupId] || [];
      const hasHistory =
        expensesList.some(
          (e) =>
            e.createdBy === member.uid ||
            e.paidBy.some((p) => p.memberId === memberId) ||
            e.splitBetween.includes(memberId)
        ) ||
        settlementsList.some((s) => s.fromMemberId === memberId || s.toMemberId === memberId);

      let updatedMembers: GroupMember[];
      if (hasHistory) {
        // Soft removal preserves historical records and settlement balances
        updatedMembers = group.members.map((m) =>
          m.id === memberId ? { ...m, isInactive: true, status: 'inactive' as const } : m
        );
      } else {
        updatedMembers = group.members.filter((m) => m.id !== memberId);
      }

      const uids = new Set<string>();
      if (group.ownerId) uids.add(group.ownerId);
      updatedMembers.forEach((m) => {
        if (m.uid && !m.isInactive) uids.add(m.uid);
      });

      const updatedGroup: SplitGroup = {
        ...group,
        members: updatedMembers,
        memberUids: Array.from(uids),
        updatedAt: Date.now(),
      };

      // CRITICAL ORDER: Delete member subcollection record FIRST before updating group document
      if (!hasHistory && user?.uid) {
        await deleteSharedGroupMember(groupId, memberId).catch(console.warn);
      }

      await updateSplitGroup(updatedGroup);
      if (user?.uid && auth.currentUser?.uid) {
        await recordSharedGroupActivity(groupId, {
          id: `act-${Date.now()}`,
          groupId,
          actorUid: user.uid,
          actorName: user.displayName || 'Admin',
          action: 'removed_member',
          title: `${member.name} was ${hasHistory ? 'marked inactive' : 'removed from the group'}`,
          timestamp: Date.now(),
        }).catch(console.warn);
      }
    },
    [splitGroups, groupExpenses, groupSettlements, updateSplitGroup, user]
  );

  const leaveSplitGroup = useCallback(
    async (groupId: string): Promise<void> => {
      const group = splitGroups.find((g) => g.id === groupId);
      if (!group) return;
      const currentUid = user?.uid;
      const member = group.members.find((m) => m.isCurrentUser || (currentUid && m.uid === currentUid));
      if (!member) return;

      if (group.ownerId === currentUid || member.role === 'owner') {
        throw new Error('Group owner cannot leave the group. Transfer ownership or delete the group.');
      }

      // CRITICAL LEAVE-GROUP FLOW ORDER:
      // 1. Delete member record in subcollection FIRST while user is still in memberUids
      if (user?.uid) {
        await deleteSharedGroupMember(groupId, member.id).catch(console.warn);
      }

      // 2. Update parent group document AFTER member document deletion
      const updatedMembers = group.members.filter((m) => m.id !== member.id);
      const updatedUids = (group.memberUids || []).filter((u) => u !== currentUid && u !== member.uid);

      const updatedGroup: SplitGroup = {
        ...group,
        members: updatedMembers,
        memberUids: updatedUids,
        updatedAt: Date.now(),
      };

      setSplitGroups((prev) => prev.map((g) => (g.id === groupId ? updatedGroup : g)));
      await storage.saveSplitGroup(updatedGroup);
      if (user?.uid) {
        await updateSplitGroup(updatedGroup);
      }
    },
    [splitGroups, user, updateSplitGroup]
  );

  const transferGroupOwnership = useCallback(
    async (groupId: string, newOwnerMemberId: string): Promise<void> => {
      const group = splitGroups.find((g) => g.id === groupId);
      if (!group) return;
      if (user?.uid && group.ownerId && group.ownerId !== user.uid) {
        throw new Error('Only the current group owner can transfer ownership.');
      }

      const targetMember = group.members.find((m) => m.id === newOwnerMemberId);
      if (!targetMember) throw new Error('Target member not found');

      const updatedMembers = group.members.map((m) => {
        if (m.id === newOwnerMemberId) return { ...m, role: 'owner' as const };
        if (m.role === 'owner') return { ...m, role: 'admin' as const };
        return m;
      });

      const updatedGroup: SplitGroup = {
        ...group,
        ownerId: targetMember.uid || targetMember.id,
        ownerName: targetMember.name,
        members: updatedMembers,
        updatedAt: Date.now(),
      };

      await updateSplitGroup(updatedGroup);
      if (user?.uid && auth.currentUser?.uid) {
        await recordSharedGroupActivity(groupId, {
          id: `act-${Date.now()}`,
          groupId,
          actorUid: user.uid,
          actorName: user.displayName || 'Owner',
          action: 'transferred_ownership',
          title: `Group ownership transferred to ${targetMember.name}`,
          timestamp: Date.now(),
        }).catch(console.warn);
      }
    },
    [splitGroups, user, updateSplitGroup]
  );

  // --- EXPENSE MANAGEMENT ---

  const addGroupExpense = useCallback(
    async (
      expenseData: Omit<GroupExpense, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<GroupExpense> => {
      const currentUserName = user?.displayName || user?.email?.split('@')[0] || 'Member';
      const currentUid = user?.uid || 'local_user';
      const newExpense: GroupExpense = {
        ...expenseData,
        id: `gexp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: currentUid,
        createdBy: currentUid,
        createdByName: currentUserName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Real Financial Accounting Decomposition
      const group = splitGroups.find((g) => g.id === newExpense.groupId);
      const currentUserMember =
        group?.members.find((m) => m.isCurrentUser || (user?.uid && m.uid === user.uid)) ||
        group?.members.find((m) => m.id === 'member-me');

      if (currentUserMember && group) {
        const accounting = SplitSettlementEngine.decomposeUserExpenseAccounting(
          newExpense,
          currentUserMember.id
        );

        // A. Personal Share -> Personal Budget Expense
        if (accounting.userPersonalShare > 0) {
          const personalExp = await addExpense({
            amount: accounting.userPersonalShare,
            category: (newExpense.category as any) || 'Needs',
            subcategory: `Group: ${group.name}`,
            date: newExpense.date,
            paymentMethod: 'UPI',
            note: `[Group: ${group.name}] ${newExpense.title} (Your Personal Share)`,
          });
          newExpense.linkedPersonalExpenseId = personalExp.id;
        }

        // B. Money paid on behalf of others -> MoneyOwed (lent)
        if (accounting.receivableFromOthers > 0) {
          const owedRec = await addMoneyOwed({
            type: 'lent',
            personName: `${group.name} (Group)`,
            originalAmount: accounting.receivableFromOthers,
            remainingAmount: accounting.receivableFromOthers,
            dateGivenOrBorrowed: newExpense.date,
            dueDate: newExpense.date,
            description: `Group Expense: ${newExpense.title} (Paid ₹${accounting.userPaid}, share ₹${accounting.userPersonalShare})`,
            status: 'Pending',
            reminderEnabled: true,
          });
          newExpense.linkedMoneyOwedIds = [owedRec.id];
        } else if (accounting.payableToOthers > 0) {
          // C. Money owed to others -> MoneyOwed (borrowed)
          const owedRec = await addMoneyOwed({
            type: 'borrowed',
            personName: `${group.name} (Group)`,
            originalAmount: accounting.payableToOthers,
            remainingAmount: accounting.payableToOthers,
            dateGivenOrBorrowed: newExpense.date,
            dueDate: newExpense.date,
            description: `Group Expense: ${newExpense.title} (Share ₹${accounting.userPersonalShare})`,
            status: 'Pending',
            reminderEnabled: true,
          });
          newExpense.linkedMoneyOwedIds = [owedRec.id];
        }
      }

      setGroupExpenses((prev) => ({
        ...prev,
        [newExpense.groupId]: [newExpense, ...(prev[newExpense.groupId] || [])],
      }));

      await storage.saveGroupExpense(newExpense);
      if (user?.uid) {
        await saveSharedGroupExpense(newExpense.groupId, newExpense).catch(console.warn);
        saveCloudGroupExpense(user.uid, newExpense.groupId, newExpense).catch(console.warn);

        // Record Activity
        await recordSharedGroupActivity(newExpense.groupId, {
          id: `act-${Date.now()}`,
          groupId: newExpense.groupId,
          actorUid: user.uid,
          actorName: currentUserName,
          action: 'added_expense',
          title: `${currentUserName} added "${newExpense.title}" (₹${newExpense.amount})`,
          amount: newExpense.amount,
          timestamp: Date.now(),
        }).catch(console.warn);
      }

      return newExpense;
    },
    [user, splitGroups, addExpense, addMoneyOwed]
  );

  const updateGroupExpense = useCallback(
    async (expense: GroupExpense): Promise<void> => {
      const updated = { ...expense, updatedAt: Date.now() };

      setGroupExpenses((prev) => ({
        ...prev,
        [expense.groupId]: (prev[expense.groupId] || []).map((e) => (e.id === expense.id ? updated : e)),
      }));

      await storage.saveGroupExpense(updated);
      if (user?.uid) {
        await saveSharedGroupExpense(expense.groupId, updated).catch(console.warn);
        saveCloudGroupExpense(user.uid, expense.groupId, updated).catch(console.warn);

        const actorName = user?.displayName || 'Member';
        await recordSharedGroupActivity(expense.groupId, {
          id: `act-${Date.now()}`,
          groupId: expense.groupId,
          actorUid: user.uid,
          actorName,
          action: 'edited_expense',
          title: `${actorName} updated "${expense.title}"`,
          amount: expense.amount,
          timestamp: Date.now(),
        }).catch(console.warn);
      }
    },
    [user]
  );

  const deleteGroupExpense = useCallback(
    async (groupId: string, expenseId: string): Promise<void> => {
      const expensesList = groupExpenses[groupId] || [];
      const exp = expensesList.find((e) => e.id === expenseId);

      // Reconcile linked personal expense
      if (exp?.linkedPersonalExpenseId) {
        await deleteExpense(exp.linkedPersonalExpenseId);
      }
      // Reconcile linked MoneyOwed
      if (exp?.linkedMoneyOwedIds) {
        for (const oid of exp.linkedMoneyOwedIds) {
          await deleteMoneyOwed(oid);
        }
      }

      setGroupExpenses((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter((e) => e.id !== expenseId),
      }));

      await storage.deleteGroupExpense(expenseId);
      if (user?.uid) {
        await deleteSharedGroupExpense(groupId, expenseId).catch(console.warn);
        deleteCloudGroupExpense(user.uid, groupId, expenseId).catch(console.warn);

        const actorName = user?.displayName || 'Member';
        if (exp) {
          await recordSharedGroupActivity(groupId, {
            id: `act-${Date.now()}`,
            groupId,
            actorUid: user.uid,
            actorName,
            action: 'deleted_expense',
            title: `${actorName} deleted "${exp.title}"`,
            amount: exp.amount,
            timestamp: Date.now(),
          }).catch(console.warn);
        }
      }
    },
    [user, groupExpenses, deleteExpense, deleteMoneyOwed]
  );

  const recordGroupSettlement = useCallback(
    async (
      settlementData: Omit<GroupSettlement, 'id' | 'createdAt'>
    ): Promise<GroupSettlement> => {
      const currentUserName = user?.displayName || user?.email?.split('@')[0] || 'Member';
      const currentUid = user?.uid || 'local_user';
      const newSettlement: GroupSettlement = {
        ...settlementData,
        id: `gset-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ownerId: currentUid,
        recordedBy: currentUid,
        recordedByName: currentUserName,
        createdAt: Date.now(),
      };

      const group = splitGroups.find((g) => g.id === newSettlement.groupId);
      const currentUserMember =
        group?.members.find((m) => m.isCurrentUser || (user?.uid && m.uid === user.uid)) ||
        group?.members.find((m) => m.id === 'member-me');

      // Repayment Accounting:
      // When someone pays Alvin, cash increases and receivable decreases. NEVER recorded as income!
      if (currentUserMember && newSettlement.toMemberId === currentUserMember.id) {
        const matchingOwed = moneyOwed.find(
          (m) =>
            m.type === 'lent' &&
            m.status !== 'Settled' &&
            m.personName.includes(group?.name || '')
        );
        if (matchingOwed) {
          await recordMoneyOwedPayment(
            matchingOwed.id,
            newSettlement.amount,
            newSettlement.paymentMethod || 'UPI',
            `Group settlement: ${group?.name}`
          );
          newSettlement.linkedMoneyOwedPaymentId = matchingOwed.id;
        }
      } else if (currentUserMember && newSettlement.fromMemberId === currentUserMember.id) {
        const matchingOwed = moneyOwed.find(
          (m) =>
            m.type === 'borrowed' &&
            m.status !== 'Settled' &&
            m.personName.includes(group?.name || '')
        );
        if (matchingOwed) {
          await recordMoneyOwedPayment(
            matchingOwed.id,
            newSettlement.amount,
            newSettlement.paymentMethod || 'UPI',
            `Group settlement: ${group?.name}`
          );
          newSettlement.linkedMoneyOwedPaymentId = matchingOwed.id;
        }
      }

      setGroupSettlements((prev) => ({
        ...prev,
        [newSettlement.groupId]: [newSettlement, ...(prev[newSettlement.groupId] || [])],
      }));

      await storage.saveGroupSettlement(newSettlement);
      if (user?.uid) {
        await saveSharedGroupSettlement(newSettlement.groupId, newSettlement).catch(console.warn);
        saveCloudGroupSettlement(user.uid, newSettlement.groupId, newSettlement).catch(console.warn);

        // Record Activity
        const fromMember = group?.members.find((m) => m.id === newSettlement.fromMemberId);
        const toMember = group?.members.find((m) => m.id === newSettlement.toMemberId);
        await recordSharedGroupActivity(newSettlement.groupId, {
          id: `act-${Date.now()}`,
          groupId: newSettlement.groupId,
          actorUid: user.uid,
          actorName: currentUserName,
          action: 'recorded_settlement',
          title: `${fromMember?.name || 'Someone'} paid ₹${newSettlement.amount} to ${toMember?.name || 'Someone'} (${newSettlement.paymentMethod || 'UPI'})`,
          amount: newSettlement.amount,
          timestamp: Date.now(),
        }).catch(console.warn);
      }

      return newSettlement;
    },
    [user, splitGroups, moneyOwed, recordMoneyOwedPayment]
  );

  const deleteGroupSettlement = useCallback(
    async (groupId: string, settlementId: string): Promise<void> => {
      setGroupSettlements((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter((s) => s.id !== settlementId),
      }));

      await storage.deleteGroupSettlement(settlementId);
      if (user?.uid) {
        await deleteSharedGroupSettlement(groupId, settlementId).catch(console.warn);
        deleteCloudGroupSettlement(user.uid, groupId, settlementId).catch(console.warn);
      }
    },
    [user]
  );

  const clearAllData = useCallback(async () => {
    await storage.clearAllData();
    setIncomes([]);
    setAllowances([]);
    setBonuses([]);
    setExpenses([]);
    setBudgets([]);
    setSavings([]);
    setInvestments([]);
    setGoals([]);
    setRecurring([]);
    setMoneyOwed([]);
    setLoans([]);
    setBills([]);
    setSubscriptions([]);
    setEmergencyFund(null);
    setReminders([]);
    setNotifications([]);
    setTransfers([]);
    setAccounts([]);
    setAlerts([]);
    setAlertHistory([]);
    setChatMessages([]);
    setSplitGroups([]);
    setGroupExpenses({});
    setGroupSettlements({});
    setActiveSplitGroupId(null);
    setSettings(DEFAULT_SETTINGS);
    setOnboardingOpen(true);
  }, []);

  const isLocalOnly = !user;
  const storageMode: 'local' | 'cloud' = user ? 'cloud' : 'local';
  const storageScope = storage.getScope();

  return (
    <FinTraQContext.Provider
      value={{
        user,
        userProfile,
        isAuthLoading,
        authError,
        setAuthError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        signOut,
        deleteUserAccount,
        cloudSyncStatus,
        lastSyncedAt,
        migrationPromptOpen,
        setMigrationPromptOpen,
        migrateLocalDataToCloud,
        dismissMigrationPrompt,
        storageMode,
        storageScope,
        isLocalOnly,
        isLoading,
        settings,
        selectedMonth,
        isOffline,
        activeTab,
        quickAddOpen,
        quickAddType,
        editingExpense,
        onboardingOpen,

        // Domain Modals & Editing
        investmentModalOpen,
        setInvestmentModalOpen,
        editingInvestment,
        setEditingInvestment,
        goalModalOpen,
        setGoalModalOpen,
        editingGoal,
        setEditingGoal,
        contributingGoal,
        setContributingGoal,
        savingsModalOpen,
        setSavingsModalOpen,
        editingSaving,
        setEditingSaving,
        billModalOpen,
        setBillModalOpen,
        editingBill,
        setEditingBill,
        subscriptionModalOpen,
        setSubscriptionModalOpen,
        editingSubscription,
        setEditingSubscription,

        // Receipt OCR Scanning
        receiptScanModalOpen,
        setReceiptScanModalOpen,

        // Theme
        theme,
        setTheme,

        incomes,
        allowances,
        bonuses,
        expenses,
        savings,
        investments,
        goals,
        recurring,
        budgets,
        subcategories,
        moneyOwed,
        loans,
        bills,
        subscriptions,
        emergencyFund,
        reminders,
        notifications,
        transfers,
        accounts,
        alerts,
        alertHistory,
        chatMessages,

        // Group / Split Expenses
        splitGroups,
        groupExpenses,
        groupSettlements,
        groupActivities,
        groupInvitations,
        activeSplitGroupId,
        setActiveSplitGroupId,
        createSplitGroup,
        updateSplitGroup,
        deleteSplitGroup,
        archiveSplitGroup,
        addGroupExpense,
        updateGroupExpense,
        deleteGroupExpense,
        recordGroupSettlement,
        deleteGroupSettlement,
        getGroupFinancialSummary,
        globalGroupBalancesSummary,

        // Collaborative Group Actions
        inviteMemberToGroup,
        resendGroupInvitation,
        revokeGroupInvitation,
        joinGroupByInvitation,
        removeGroupMember,
        leaveSplitGroup,
        transferGroupOwnership,

        setActiveTab,
        setSelectedMonth,
        nextMonth,
        prevMonth,
        setQuickAddOpen,
        setEditingExpense,
        setOnboardingOpen,
        alertsModalOpen,
        setAlertsModalOpen,
        updateSettings,
        addIncome,
        updateIncome,
        deleteIncome,
        addAllowance,
        deleteAllowance,
        addBonus,
        deleteBonus,
        addExpense,
        updateExpense,
        deleteExpense,
        addMoneyOwed,
        recordMoneyOwedPayment,
        deleteMoneyOwed,
        addLoan,
        recordLoanPayment,
        deleteLoan,
        addBill,
        updateBill,
        markBillPaid,
        deleteBill,
        addSubscription,
        updateSubscription,
        toggleSubscriptionActive,
        deleteSubscription,
        updateEmergencyFundSetup,
        recordEmergencyFundContribution,
        recordEmergencyFundWithdrawal,
        addReminder,
        markReminderPaid,
        deleteReminder,
        addTransfer,
        addAccount,
        updateAccountBalance,
        markNotificationRead,
        resolveNotification,
        clearAllNotifications,
        addSavings,
        updateSavings,
        deleteSavings,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        addGoal,
        updateGoal,
        deleteGoal,
        setSubcategoryBudget,
        addSubcategory,
        deleteSubcategory,
        addAlert,
        updateAlert,
        deleteAlert,
        activeTriggeredAlertsCount,
        isAiLoading,
        askFinTraQAI,
        clearChatMessages,
        aiStatusError,
        clearAiStatusError,
        exportData,
        importData,
        clearAllData,
        monthlyIncome,
        monthlySalary: incomeBreakdown.baseIncome || monthlyIncome,
        monthlySpent,
        monthlyRemaining,
        todaySpent,
        incomeBreakdown,
        monthlySummary,
        categorySummaries,
        categoryDistribution,
        weeklySpending,
        topSubcategories,
        investmentsSummary,
        emergencyFundDetails,
        moneyOwedSummary,
        cashFlowSummary,
        netWorthSummary,
        upcomingObligations,
        overdueObligations,
        insights,
        monthIncomes,
        monthExpenses,
        monthSavings,
      }}
    >
      {children}
    </FinTraQContext.Provider>
  );
};

export const useFinTraQ = () => {
  const context = useContext(FinTraQContext);
  if (!context) {
    throw new Error('useFinTraQ must be used within a FinTraQProvider');
  }
  return context;
};
