/**
 * Money Vault Domain Types & Interfaces
 * Complete Personal Financial Organization System
 * Secure Your Money. Master Your Future.
 */

export type CategoryType = 'Needs' | 'Wants' | 'Savings';

export type PaymentMethod =
  | 'UPI'
  | 'Cash'
  | 'Credit Card'
  | 'Debit Card'
  | 'Bank Transfer'
  | 'Other';

export type IncomeType =
  | 'Salary'
  | 'Freelance'
  | 'Business'
  | 'Investments'
  | 'Rental'
  | 'Gift'
  | 'Other';

export type AllowanceType =
  | 'Travel'
  | 'Food'
  | 'Housing'
  | 'Medical'
  | 'Transport'
  | 'Phone'
  | 'Daily'
  | 'Other';

export type BonusType =
  | 'Annual bonus'
  | 'Performance bonus'
  | 'Joining bonus'
  | 'Festival bonus'
  | 'Referral bonus'
  | 'Commission'
  | 'Cash gift'
  | 'Freelance payment'
  | 'Side income'
  | 'Other';

export type SavingsType =
  | 'Emergency Fund'
  | 'Savings Account'
  | 'Fixed Deposit'
  | 'Recurring Deposit'
  | 'Cash Reserve'
  | 'Other';

export type InvestmentType =
  | 'Mutual Funds'
  | 'Stocks'
  | 'ETFs'
  | 'Fixed Deposits'
  | 'Gold'
  | 'Bonds'
  | 'PPF'
  | 'NPS'
  | 'Crypto'
  | 'Real Estate'
  | 'Other';

export type GoalCategory =
  | 'Emergency Fund'
  | 'Vehicle'
  | 'Gadget'
  | 'Travel'
  | 'Home'
  | 'Education'
  | 'Wedding'
  | 'Retirement'
  | 'Custom';

export type RecurringFrequency = 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-yearly' | 'Yearly';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Subcategory {
  id: string;
  ownerId?: string;
  name: string;
  category: CategoryType;
  iconName: string;
  isDefault?: boolean;
  createdAt?: number;
}

export interface Income {
  id: string;
  ownerId?: string;
  amount: number;
  source: string;
  date: string; // YYYY-MM-DD
  type: IncomeType;
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Allowance {
  id: string;
  ownerId?: string;
  name: string;
  amount: number;
  type: AllowanceType;
  date: string; // YYYY-MM-DD
  recurring: boolean;
  frequency?: 'Monthly' | 'Weekly' | 'Daily' | 'One-time';
  source?: string;
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Bonus {
  id: string;
  ownerId?: string;
  name: string;
  amount: number;
  type: BonusType;
  date: string; // YYYY-MM-DD
  source?: string;
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Expense {
  id: string;
  ownerId?: string;
  amount: number;
  categoryId?: string;
  category: CategoryType;
  subcategoryId?: string;
  subcategory: string;
  paymentMethod?: PaymentMethod;
  note?: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt?: number;
}

export interface SavingsRecord {
  id: string;
  ownerId?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: SavingsType;
  accountName: string;
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Investment {
  id: string;
  ownerId?: string;
  name: string;
  type: InvestmentType;
  amountInvested: number;
  currentValue: number;
  date: string; // YYYY-MM-DD
  units?: number;
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface FinancialGoal {
  id: string;
  ownerId?: string;
  name: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface SubcategoryBudget {
  id: string;
  ownerId?: string;
  category: CategoryType;
  subcategory: string;
  amount: number;
  month: string; // YYYY-MM
  createdAt?: number;
  updatedAt?: number;
}

export interface RecurringTransaction {
  id: string;
  ownerId?: string;
  title: string;
  amount: number;
  kind: 'expense' | 'income';
  category: CategoryType;
  subcategory: string;
  frequency: RecurringFrequency;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  note?: string;
  isActive: boolean;
  createdAt: number;
}

// ==================== 1. MONEY OWED (LENT / BORROWED) ====================
export type MoneyOwedType = 'lent' | 'borrowed'; // 'lent' = Money to receive; 'borrowed' = Money to give back
export type MoneyOwedStatus = 'Pending' | 'Partially Settled' | 'Overdue' | 'Settled';

export interface MoneyOwedPayment {
  id: string;
  moneyOwedId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod?: PaymentMethod;
  note?: string;
  createdAt: number;
}

export interface MoneyOwed {
  id: string;
  ownerId?: string;
  type: MoneyOwedType;
  personName: string;
  originalAmount: number;
  amountSettled: number;
  remainingAmount: number;
  dateGivenOrBorrowed: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  description?: string;
  paymentMethod?: PaymentMethod;
  note?: string;
  status: MoneyOwedStatus;
  reminderEnabled: boolean;
  reminderDaysBefore?: number;
  payments?: MoneyOwedPayment[];
  createdAt: number;
  updatedAt?: number;
}

// ==================== 2. LOANS & DEBT & EMIs ====================
export type LoanType =
  | 'Personal borrowing'
  | 'Bank loan'
  | 'Vehicle loan'
  | 'Education loan'
  | 'Credit card outstanding'
  | 'Other liability';

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  principalPortion?: number;
  interestPortion?: number;
  date: string;
  paymentMethod?: PaymentMethod;
  note?: string;
  createdAt: number;
}

export interface Loan {
  id: string;
  ownerId?: string;
  name: string;
  type: LoanType;
  originalAmount: number;
  outstandingAmount: number;
  interestRate?: number; // % e.g. 0% for personal loan, 9.5% for vehicle
  emiAmount: number;
  dueDate: string; // Day of month or YYYY-MM-DD
  frequency: 'Monthly' | 'Weekly' | 'Quarterly' | 'Yearly';
  startDate: string;
  endDate?: string;
  nextPaymentDate: string; // YYYY-MM-DD
  reminderEnabled: boolean;
  reminderDaysBefore?: number;
  notes?: string;
  status: 'Active' | 'Closed';
  createdAt: number;
  updatedAt?: number;
}

// ==================== 3. FINANCIAL REMINDERS & BILLS ====================
export type ReminderType =
  | 'Bill'
  | 'EMI'
  | 'Loan Payment'
  | 'Insurance'
  | 'Subscription'
  | 'Rent'
  | 'Tax'
  | 'Investment'
  | 'Savings'
  | 'Rent deposit'
  | 'Membership'
  | 'Annual renewal'
  | 'Vehicle insurance'
  | 'Health insurance'
  | 'Other';

export interface FinancialReminder {
  id: string;
  ownerId?: string;
  title: string;
  type: ReminderType;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  frequency: RecurringFrequency | 'Once';
  recurrenceEndDate?: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number; // 7, 3, 1, 0
  notificationChannels: 'in_app' | 'email' | 'both';
  status: 'Upcoming' | 'Due today' | 'Overdue' | 'Paid' | 'Cancelled';
  note?: string;
  relatedEntityId?: string;
  lastPaidDate?: string;
  createdAt: number;
  updatedAt?: number;
}

// ==================== 4. SUBSCRIPTIONS ====================
export interface Subscription {
  id: string;
  ownerId?: string;
  name: string;
  amount: number;
  frequency: 'Monthly' | 'Quarterly' | 'Yearly';
  nextBillingDate: string; // YYYY-MM-DD
  category: string;
  paymentMethod?: PaymentMethod;
  reminderEnabled: boolean;
  reminderDaysBefore?: number;
  isActive: boolean;
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

// ==================== 5. BILLS ====================
export type BillCategory =
  | 'Electricity'
  | 'Water'
  | 'Internet'
  | 'Mobile'
  | 'Rent'
  | 'Insurance'
  | 'Credit card'
  | 'Education'
  | 'Tax'
  | 'Other';

export interface Bill {
  id: string;
  ownerId?: string;
  name: string;
  category: BillCategory;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paid: boolean;
  recurring: boolean;
  frequency?: RecurringFrequency;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  reminderEnabled: boolean;
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

// ==================== 6. EMERGENCY FUND ====================
export interface EmergencyFundContribution {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: string; // YYYY-MM-DD
  associatedExpenseId?: string;
  note?: string;
  createdAt: number;
}

export interface EmergencyFund {
  id: string;
  ownerId?: string;
  essentialMonthlyExpenses: number;
  targetMonths: number; // e.g. 1, 2, 3, 4, 5, 6, 9, 12, or custom
  currentAmount: number;
  monthlyContributionPlan?: number;
  contributions?: EmergencyFundContribution[];
  updatedAt?: number;
}

// ==================== 7. TRANSFERS & ACCOUNTS ====================
export interface Transfer {
  id: string;
  ownerId?: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
}

export type AccountType =
  | 'Cash'
  | 'Bank account'
  | 'Savings account'
  | 'Credit card'
  | 'Investment account'
  | 'Other';

export interface FinancialAccount {
  id: string;
  ownerId?: string;
  name: string;
  type: AccountType;
  balance: number;
  institution?: string;
  updatedAt?: number;
}

// ==================== 8. NOTIFICATIONS & ALERTS ====================
export type NotificationStatus = 'scheduled' | 'sent' | 'delivered' | 'failed' | 'resolved' | 'cancelled';

export interface AppNotification {
  id: string;
  ownerId?: string;
  title: string;
  amount?: number;
  dueDate?: string;
  reason?: string;
  actionLabel?: string;
  status: NotificationStatus;
  channel: 'in_app' | 'email' | 'both';
  relatedRecordType?: 'moneyOwed' | 'loan' | 'reminder' | 'bill' | 'subscription' | 'alert' | 'emergencyFund';
  relatedRecordId?: string;
  read: boolean;
  resolved: boolean;
  createdAt: number;
  updatedAt?: number;
}

export type AlertMetric =
  | 'total_monthly_spending'
  | 'needs_spending'
  | 'wants_spending'
  | 'food_spending'
  | 'travel_spending'
  | 'subscription_spending'
  | 'savings_balance'
  | 'investment_value'
  | 'remaining_budget'
  | 'goal_progress'
  | 'large_expense'
  | 'unusual_spending'
  | 'low_balance';

export type AlertCondition = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'pct_exceeds';

export interface Alert {
  id: string;
  ownerId: string;
  name?: string;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number;
  alertType: 'in_app' | 'email' | 'both';
  emailAddress?: string;
  enabled: boolean;
  cooldownHours: number;
  lastTriggeredAt?: number;
  status: 'armed' | 'triggered' | 'cooldown' | 'resolved';
  createdAt: number;
  updatedAt?: number;
}

export interface AlertHistory {
  id: string;
  ownerId: string;
  alertId: string;
  alertName: string;
  triggeredAt: number;
  metricValue: number;
  threshold: number;
  status: 'triggered' | 'resolved';
  notificationStatus: 'in_app' | 'sent' | 'queued' | 'disabled';
  emailAddress?: string;
  createdAt: number;
}

// ==================== SETTINGS & MISC ====================
export interface AppSettings {
  currency: string;
  secondaryCurrencies?: string[];
  monthlyIncome?: number;
  monthlySalary?: number;
  needsPercentage: number;
  wantsPercentage: number;
  savingsPercentage: number;
  onboardingCompleted: boolean;
  firstDayOfWeek: 'Monday' | 'Sunday';
  defaultCategory: CategoryType;
  defaultPaymentMethod: PaymentMethod;
  largeExpenseThreshold?: number;
  unusualSpendingEnabled?: boolean;
  theme?: 'dark' | 'light';
  updatedAt?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  contextSummary?: string;
  actionProposal?: {
    type: 'expense' | 'income' | 'bill';
    amount: number;
    category?: string;
    subcategory?: string;
    date?: string;
    note?: string;
    executed?: boolean;
  };
  receiptData?: any;
}

// ==================== COMPUTED METRICS ====================
export interface SalarySplit {
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
}

export interface BudgetStatus {
  budget: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  isOverBudget: boolean;
  overAmount: number;
  status: 'safe' | 'warning' | 'danger';
}

export interface CategorySummary {
  category: CategoryType;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  percentageUsed: number;
  isOverBudget: boolean;
  color: string;
  accentBg: string;
  borderColor: string;
}

export interface SmartInsight {
  id: string;
  title: string;
  description: string;
  type: 'neutral' | 'alert' | 'success' | 'info';
  category?: CategoryType;
  icon?: string;
}

export interface DaySpending {
  dayName: string;
  shortDate: string;
  fullDate: string;
  amount: number;
  isToday: boolean;
}

export interface MonthlyFinancialSummary {
  totalIncome: number;
  regularIncome: number;
  allowancesTotal: number;
  bonusesTotal: number;
  otherIncomeTotal: number;
  totalExpenses: number;
  totalSavings: number;
  totalInvestments: number;
  netRemaining: number;
  savingsRate: number;
  needsSpent: number;
  wantsSpent: number;
  savingsSpent: number;
}

export interface EmergencyFundCalculation {
  essentialMonthlyExpenses: number;
  targetMonths: number;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  monthsCovered: number;
  monthlyContributionPlan: number;
  estimatedMonthsToComplete: number;
  estimatedCompletionDate: string;
}

export interface MoneyOwedSummary {
  toReceiveTotal: number; // Sum of remainingAmount for 'lent'
  toRepayTotal: number; // Sum of remainingAmount for 'borrowed'
  netOutstanding: number; // toReceiveTotal - toRepayTotal
  lentRecords: MoneyOwed[];
  borrowedRecords: MoneyOwed[];
  overdueCount: number;
  dueSoonCount: number;
}

export interface CashFlowSummary {
  regularIncome: number;
  allowances: number;
  bonus: number;
  otherIncome: number;
  totalInflow: number;
  expenses: number;
  savings: number;
  investment: number;
  debtEmi: number;
  remainingCashFlow: number;
}

export interface NetWorthSummary {
  assets: {
    cashAndBank: number;
    savings: number;
    emergencyFund: number;
    investments: number;
    moneyToReceive: number;
    otherAssets: number;
    total: number;
  };
  liabilities: {
    moneyToRepay: number;
    loansOutstanding: number;
    creditCardOutstanding: number;
    otherDebts: number;
    total: number;
  };
  netWorth: number;
}

export interface ObligationItem {
  id: string;
  sourceType: 'loan' | 'reminder' | 'bill' | 'subscription' | 'moneyOwed';
  title: string;
  amount: number;
  dueDate: string;
  categoryOrType: string;
  diffDays: number;
  dueLabel: string;
  statusBadge: 'Overdue' | 'Due today' | 'Due soon' | 'Upcoming';
  isOverdue: boolean;
  relatedRecord: any;
}

// Re-export Group / Split Expenses Types
export * from './splitExpenses';

