/**
 * Money Vault Financial Calculation Engine
 * Pure, centralized, dynamic calculations for:
 * - Real income & classification (Salary, Allowances, Bonuses, Other)
 * - Money Lent / Money Borrowed (Money to receive / Money to give back)
 * - Emergency Fund system (Targets, Months Covered, Contributions, Plans)
 * - Loans, EMIs & Debt obligations
 * - Financial Reminders, Bills & Subscriptions
 * - Cash Flow & Net Worth (Assets vs Liabilities)
 * - Indian Rupee (INR) numbering representation
 */

import {
CategoryType,
Expense,
Income,
Allowance,
Bonus,
SavingsRecord,
Investment,
FinancialGoal,
AppSettings,
SubcategoryBudget,
SalarySplit,
BudgetStatus,
CategorySummary,
SmartInsight,
DaySpending,
MonthlyFinancialSummary,
MoneyOwed,
Loan,
FinancialReminder,
Bill,
Subscription,
EmergencyFund,
FinancialAccount,
EmergencyFundCalculation,
MoneyOwedSummary,
CashFlowSummary,
NetWorthSummary,
} from '../types';

/**
 * Format a number into Indian Rupee Currency representation:
 * E.g., 300 -> "₹ 300"
 * 1500 -> "₹ 1,500"
 * 10500 -> "₹ 10,500"
 * 35000 -> "₹ 35,000"
 * 100000 -> "₹ 1,00,000"
 * 1250000 -> "₹ 12,50,000"
 */
export function formatINR(val: number | null | undefined, showSymbol: boolean = true): string {
  if (val === null || val === undefined || isNaN(val)) {
    return showSymbol ? '₹ 0' : '0';
  }
  const isNegative = val < 0;
  const absVal = Math.round(Math.abs(val));
  const numStr = absVal.toString();
  let formatted = '';

  if (numStr.length <= 3) {
    formatted = numStr;
  } else {
    const lastThree = numStr.substring(numStr.length - 3);
    const otherDigits = numStr.substring(0, numStr.length - 3);
    const withCommas = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = `${withCommas},${lastThree}`;
  }

  const sign = isNegative ? '-' : '';
  const symbol = showSymbol ? '₹ ' : '';
  return `${sign}${symbol}${formatted}`;
}

export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthName(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return '';
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const date = new Date(year, monthIndex, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Dynamic Due Date calculation helper
 * Returns days difference and exact human label:
 * - "Due today"
 * - "Due tomorrow"
 * - "Due in 5 days"
 * - "2 days overdue"
 */
export function calculateDueDateStatus(dueDateStr: string, referenceDate: Date = new Date()): {
  diffDays: number;
  label: string;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
  isDueSoon: boolean; // within 7 days
  statusBadge: 'Overdue' | 'Due today' | 'Due soon' | 'Upcoming';
} {
  if (!dueDateStr) {
    return {
      diffDays: 999,
      label: 'No due date',
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      isDueSoon: false,
      statusBadge: 'Upcoming',
    };
  }

  const [y, m, d] = dueDateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isOverdue = diffDays < 0;
  const isDueToday = diffDays === 0;
  const isDueTomorrow = diffDays === 1;
  const isDueSoon = diffDays > 1 && diffDays <= 7;

  let label = '';
  let statusBadge: 'Overdue' | 'Due today' | 'Due soon' | 'Upcoming' = 'Upcoming';

  if (isOverdue) {
    const absDays = Math.abs(diffDays);
    label = `${absDays} day${absDays === 1 ? '' : 's'} overdue`;
    statusBadge = 'Overdue';
  } else if (isDueToday) {
    label = 'Due today';
    statusBadge = 'Due today';
  } else if (isDueTomorrow) {
    label = 'Due tomorrow';
    statusBadge = 'Due soon';
  } else {
    label = `Due in ${diffDays} days`;
    statusBadge = isDueSoon ? 'Due soon' : 'Upcoming';
  }

  return {
    diffDays,
    label,
    isOverdue,
    isDueToday,
    isDueTomorrow,
    isDueSoon,
    statusBadge,
  };
}

export function getItemsForMonth<T extends { date: string }>(items: T[], monthKey: string): T[] {
  return items.filter((item) => item.date.startsWith(monthKey));
}

// ==================== INCOME & CLASSIFICATION ====================

export function calculateTotalIncome(incomes: Income[], monthKey?: string): number {
  const list = monthKey ? getItemsForMonth(incomes, monthKey) : incomes;
  return list.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
}

export function calculateTotalAllowances(allowances: Allowance[], monthKey?: string): number {
  const list = monthKey ? getItemsForMonth(allowances, monthKey) : allowances;
  return list.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
}

export function calculateTotalBonuses(bonuses: Bonus[], monthKey?: string): number {
  const list = monthKey ? getItemsForMonth(bonuses, monthKey) : bonuses;
  return list.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
}

export function calculateIncomeBreakdown(
  incomes: Income[],
  allowances: Allowance[],
  bonuses: Bonus[],
  monthKey: string
): {
  baseIncome: number;
  allowancesTotal: number;
  bonusesTotal: number;
  otherIncomeTotal: number;
  regularIncome: number;
  variableIncome: number;
  totalInflow: number;
} {
  const monthIncs = getItemsForMonth(incomes, monthKey);
  const monthAllows = getItemsForMonth(allowances, monthKey);
  const monthBons = getItemsForMonth(bonuses, monthKey);

  const baseIncome = monthIncs
    .filter((i) => i.type === 'Salary')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const otherIncomeTotal = monthIncs
    .filter((i) => i.type !== 'Salary')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const allowancesTotal = monthAllows.reduce((sum, a) => sum + (a.amount || 0), 0);
  const bonusesTotal = monthBons.reduce((sum, b) => sum + (b.amount || 0), 0);

  const regularIncome = baseIncome + monthAllows.filter((a) => a.recurring).reduce((s, a) => s + a.amount, 0);
  const variableIncome = bonusesTotal + otherIncomeTotal + monthAllows.filter((a) => !a.recurring).reduce((s, a) => s + a.amount, 0);
  const totalInflow = baseIncome + otherIncomeTotal + allowancesTotal + bonusesTotal;

  return {
    baseIncome,
    allowancesTotal,
    bonusesTotal,
    otherIncomeTotal,
    regularIncome,
    variableIncome,
    totalInflow,
  };
}

// ==================== EXPENSES & BUDGET ====================

export function calculateTotalExpenses(expenses: Expense[], monthKey?: string): number {
  const list = monthKey ? getItemsForMonth(expenses, monthKey) : expenses;
  return list.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
}

export function calculateCategorySpent(
  expenses: Expense[],
  category: CategoryType,
  monthKey?: string
): number {
  const list = monthKey ? getItemsForMonth(expenses, monthKey) : expenses;
  return list
    .filter((e) => e.category === category)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

export function calculateSubcategorySpent(
  expenses: Expense[],
  subcategoryName: string,
  category?: CategoryType,
  monthKey?: string
): number {
  const list = monthKey ? getItemsForMonth(expenses, monthKey) : expenses;
  return list
    .filter(
      (e) =>
        e.subcategory.toLowerCase() === subcategoryName.toLowerCase() &&
        (!category || e.category === category)
    )
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

export function calculateSalarySplit(
  income: number,
  needsPct: number,
  wantsPct: number,
  savingsPct: number
): SalarySplit {
  const safeIncome = Math.max(0, income);
  return {
    needsAmount: Math.round((safeIncome * needsPct) / 100),
    wantsAmount: Math.round((safeIncome * wantsPct) / 100),
    savingsAmount: Math.round((safeIncome * savingsPct) / 100),
  };
}

export function validateBudgetPercentages(needs: number, wants: number, savings: number): {
  isValid: boolean;
  total: number;
  message?: string;
} {
  const total = Math.round(needs + wants + savings);
  if (total === 100) {
    return { isValid: true, total };
  }
  return {
    isValid: false,
    total,
    message: `Total is ${total}%. Percentages must equal 100%.`,
  };
}

export function calculateRemainingBudget(budget: number, spent: number): number {
  return budget - spent;
}

export function calculateBudgetStatus(budget: number, spent: number): BudgetStatus {
  const remaining = budget - spent;
  const isOverBudget = remaining < 0;
  const percentageUsed = budget > 0 ? Math.round((spent / budget) * 100) : spent > 0 ? 100 : 0;
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (isOverBudget) {
    status = 'danger';
  } else if (percentageUsed >= 85) {
    status = 'warning';
  }
  return {
    budget,
    spent,
    remaining,
    percentageUsed,
    isOverBudget,
    overAmount: isOverBudget ? Math.abs(remaining) : 0,
    status,
  };
}

export interface RingModel {
  categoryName: string;
  capType?: 'own' | 'guideline';
  capTypeLabel?: 'Your limits' | 'Guideline';
  spent: number;
  cap: number;
  remaining: number;
  isOverBudget: boolean;
  overAmount: number;
  percentageUsed: number;
  clampedPercent: number;
  hasRing: boolean;
  circumference: number;
  strokeDashoffset: number;
  status: 'safe' | 'warning' | 'danger';
  statusColor: string;
  remainingText: string;
  spentOfCapText: string;
  ariaLabel: string;
}

/**
 * Pure calculation helper for circular progress rings.
 * Uses integer-paise arithmetic to eliminate floating-point precision artefacts.
 * Ensures clamped stroke offset for SVG rendering while preserving the exact unclamped
 * percentage for display (e.g. 130% over budget displays "130%").
 * When spent < cap and not over, never shows a label of 100%: shows min(99, rounded).
 * All colours use existing --mv-* tokens.
 */
export function getRingModel(
  spent: number | null | undefined,
  cap: number | null | undefined,
  categoryName: string,
  radius: number = 38,
  customColor?: string,
  capType?: 'own' | 'guideline'
): RingModel {
  const safeSpent = spent === null || spent === undefined || isNaN(spent) ? 0 : spent;
  const safeCap = cap === null || cap === undefined || isNaN(cap) ? 0 : cap;

  // Integer paise math
  const spentPaise = Math.round(safeSpent * 100);
  const capPaise = Math.round(safeCap * 100);
  const circumference = 2 * Math.PI * radius;

  const capTypeLabel =
    capType === 'own' ? 'Your limits' : capType === 'guideline' ? 'Guideline' : undefined;

  if (capPaise <= 0) {
    const displaySpent = spentPaise / 100;
    const isOver = displaySpent > 0;
    return {
      categoryName,
      capType,
      capTypeLabel,
      spent: displaySpent,
      cap: 0,
      remaining: -displaySpent,
      isOverBudget: isOver,
      overAmount: isOver ? displaySpent : 0,
      percentageUsed: isOver ? 100 : 0,
      clampedPercent: isOver ? 100 : 0,
      hasRing: false,
      circumference,
      strokeDashoffset: circumference,
      status: isOver ? 'danger' : 'safe',
      statusColor: isOver ? 'var(--mv-danger)' : (customColor || 'var(--mv-cyan)'),
      remainingText: 'No cap set',
      spentOfCapText: `${formatINR(displaySpent)} spent`,
      ariaLabel: `${categoryName}${capTypeLabel ? ` (${capTypeLabel})` : ''}: ${formatINR(displaySpent)} spent, no cap set`,
    };
  }

  const remainingPaise = capPaise - spentPaise;
  const isOverBudget = remainingPaise < 0;
  const overAmountPaise = isOverBudget ? Math.abs(remainingPaise) : 0;

  // Raw rounded percentage
  const rawPercentage = Math.round((spentPaise / capPaise) * 100);

  // Status thresholds identical to calculateBudgetStatus:
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (isOverBudget) {
    status = 'danger';
  } else if (rawPercentage >= 85) {
    status = 'warning';
  }

  // When spent < cap and not over, never show a label of 100%: show min(99, rounded).
  let percentageUsed = rawPercentage;
  if (!isOverBudget && spentPaise < capPaise && rawPercentage >= 100) {
    percentageUsed = Math.min(99, rawPercentage);
  }

  // Clamped percentage for SVG arc: 0 to 100
  const clampedPercent = Math.min(Math.max(percentageUsed, 0), 100);
  const strokeDashoffset = circumference * (1 - clampedPercent / 100);

  // Tokens: replace hard-coded hexes with existing --mv-* tokens
  let statusColor: string;
  if (status === 'danger') {
    statusColor = 'var(--mv-danger)';
  } else if (status === 'warning') {
    statusColor = 'var(--mv-warning)';
  } else {
    statusColor =
      customColor ||
      (categoryName === 'Needs'
        ? 'var(--mv-cyan)'
        : categoryName === 'Wants'
        ? 'var(--mv-amber)'
        : categoryName === 'Savings'
        ? 'var(--mv-green)'
        : 'var(--mv-primary)');
  }

  const displaySpent = spentPaise / 100;
  const displayCap = capPaise / 100;
  const displayRemaining = remainingPaise / 100;
  const displayOverAmount = overAmountPaise / 100;

  const remainingText = isOverBudget
    ? `${formatINR(displayOverAmount)} over`
    : `${formatINR(displayRemaining)} left`;

  const spentOfCapText = `${formatINR(displaySpent)} of ${formatINR(displayCap)}`;
  const ariaLabel = `${categoryName}${capTypeLabel ? ` (${capTypeLabel})` : ''}: ${formatINR(displaySpent)} of ${formatINR(displayCap)} spent, ${percentageUsed} percent`;

  return {
    categoryName,
    capType,
    capTypeLabel,
    spent: displaySpent,
    cap: displayCap,
    remaining: displayRemaining,
    isOverBudget,
    overAmount: displayOverAmount,
    percentageUsed,
    clampedPercent,
    hasRing: true,
    circumference,
    strokeDashoffset,
    status,
    statusColor,
    remainingText,
    spentOfCapText,
    ariaLabel,
  };
}

export interface CategoryRingItem {
  category: CategoryType;
  model: RingModel;
  capType: 'own' | 'guideline';
  capTypeLabel: 'Your limits' | 'Guideline';
}

export interface BudgetOverviewResult {
  rings: CategoryRingItem[];
  noCapCategories: { category: CategoryType; spent: number }[];
  totalModel: RingModel;
  hasAnyCap: boolean;
  totalCap: number;
  totalSpent: number;
}

/**
 * Computes the complete Budget Overview model:
 * - Priority: For any category that has subcategory limits set for selectedMonth (budgets with amount > 0),
 *   uses the SUM of those limits as the cap and matching subcategory spend as spent (labeled "Your limits").
 * - Guideline fallback: Keeps the 50/30/20 guideline ring for categories with no own limits (labeled "Guideline").
 * - Empty state condition: hasAnyCap is true if either own limits or guideline caps exist.
 */
export function calculateBudgetOverviewModel(
  categorySummaries: CategorySummary[],
  budgets: SubcategoryBudget[],
  expenses: Expense[],
  selectedMonth: string
): BudgetOverviewResult {
  const categories: CategoryType[] = ['Needs', 'Wants', 'Savings'];
  const rings: CategoryRingItem[] = [];
  const noCapCategories: { category: CategoryType; spent: number }[] = [];
  let totalCap = 0;
  let totalSpent = 0;

  for (const cat of categories) {
    const ownBudgets = budgets.filter(
      (b) => b.category === cat && b.month === selectedMonth && Number(b.amount) > 0
    );

    if (ownBudgets.length > 0) {
      // 1. Owner's own limits win: sum of those subcategory limits as cap
      const ownCap = ownBudgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
      // Matching subcategory spend as spent via calculateSubcategorySpent
      const ownSpent = ownBudgets.reduce(
        (sum, b) => sum + calculateSubcategorySpent(expenses, b.subcategory, cat, selectedMonth),
        0
      );
      const model = getRingModel(ownSpent, ownCap, cat, 36, undefined, 'own');
      rings.push({
        category: cat,
        model,
        capType: 'own',
        capTypeLabel: 'Your limits',
      });
      totalCap += ownCap;
      totalSpent += ownSpent;
    } else {
      // 2. Fall back to 50/30/20 guideline
      const summary = categorySummaries.find((c) => c.category === cat);
      const guidelineCap = summary?.budget || 0;
      const guidelineSpent =
        summary?.spent !== undefined
          ? summary.spent
          : calculateCategorySpent(expenses, cat, selectedMonth);

      if (guidelineCap > 0) {
        const model = getRingModel(guidelineSpent, guidelineCap, cat, 36, undefined, 'guideline');
        rings.push({
          category: cat,
          model,
          capType: 'guideline',
          capTypeLabel: 'Guideline',
        });
        totalCap += guidelineCap;
        totalSpent += guidelineSpent;
      } else if (guidelineSpent > 0) {
        noCapCategories.push({
          category: cat,
          spent: guidelineSpent,
        });
      }
    }
  }

  const hasAnyCap = rings.length > 0;
  const totalModel = getRingModel(
    totalSpent,
    totalCap,
    'Total Budget',
    24,
    'var(--mv-primary)'
  );

  return {
    rings,
    noCapCategories,
    totalModel,
    hasAnyCap,
    totalCap,
    totalSpent,
  };
}


export function calculateCategorySummaries(
  expenses: Expense[],
  settings: AppSettings,
  monthIncome: number,
  monthKey: string
): CategorySummary[] {
  const split = calculateSalarySplit(
    monthIncome,
    settings.needsPercentage,
    settings.wantsPercentage,
    settings.savingsPercentage
  );

  const categories: {
    category: CategoryType;
    budget: number;
    percentage: number;
    color: string;
    accentBg: string;
    borderColor: string;
  }[] = [
    {
      category: 'Needs',
      budget: split.needsAmount,
      percentage: settings.needsPercentage,
      color: '#F45B16',
      accentBg: '#FFF4ED',
      borderColor: '#FDBA74',
    },
    {
      category: 'Wants',
      budget: split.wantsAmount,
      percentage: settings.wantsPercentage,
      color: '#EBAA00',
      accentBg: '#FFFBEB',
      borderColor: '#FCD34D',
    },
    {
      category: 'Savings',
      budget: split.savingsAmount,
      percentage: settings.savingsPercentage,
      color: '#12B879',
      accentBg: '#ECFDF5',
      borderColor: '#6EE7B7',
    },
  ];

  return categories.map((cat) => {
    const spent = calculateCategorySpent(expenses, cat.category, monthKey);
    const remaining = cat.budget - spent;
    const percentageUsed = cat.budget > 0 ? Math.round((spent / cat.budget) * 100) : 0;
    const isOverBudget = remaining < 0;
    return {
      category: cat.category,
      budget: cat.budget,
      spent,
      remaining,
      percentage: cat.percentage,
      percentageUsed,
      isOverBudget,
      color: cat.color,
      accentBg: cat.accentBg,
      borderColor: cat.borderColor,
    };
  });
}

export function calculateCategoryDistribution(
  expenses: Expense[],
  monthKey: string
): { category: CategoryType; spent: number; percentOfTotal: number; color: string }[] {
  const monthExpenses = getItemsForMonth(expenses, monthKey);
  const totalSpent = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const colors: Record<CategoryType, string> = {
    Needs: '#F45B16',
    Wants: '#EBAA00',
    Savings: '#12B879',
  };
  const cats: CategoryType[] = ['Needs', 'Wants', 'Savings'];
  return cats.map((cat) => {
    const spent = calculateCategorySpent(expenses, cat, monthKey);
    const percentOfTotal = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;
    return {
      category: cat,
      spent,
      percentOfTotal,
      color: colors[cat],
    };
  });
}

export function calculateDailySpent(expenses: Expense[], dateStr: string): number {
  return expenses
    .filter((e) => e.date === dateStr)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

export function calculateWeeklyDailySpending(
  expenses: Expense[],
  referenceDate: Date = new Date(),
  firstDayOfWeek: 'Monday' | 'Sunday' = 'Monday'
): DaySpending[] {
  const curr = new Date(referenceDate);
  const currentDay = curr.getDay();
  let diff = 0;
  if (firstDayOfWeek === 'Monday') {
    diff = currentDay === 0 ? -6 : 1 - currentDay;
  } else {
    diff = -currentDay;
  }
  const startOfWeek = new Date(curr);
  startOfWeek.setDate(curr.getDate() + diff);

  const dayNames =
    firstDayOfWeek === 'Monday'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const todayStr = toDateString(new Date());
  const days: DaySpending[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dStr = toDateString(d);
    const amount = calculateDailySpent(expenses, dStr);
    days.push({
      dayName: dayNames[i],
      shortDate: `${d.getDate()}`,
      fullDate: dStr,
      amount,
      isToday: dStr === todayStr,
    });
  }
  return days;
}

export function calculateTopSubcategories(
  expenses: Expense[],
  monthKey: string,
  limit: number = 6
): { name: string; category: CategoryType; amount: number; percentage: number }[] {
  const monthExpenses = getItemsForMonth(expenses, monthKey);
  const total = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const subMap: Record<string, { category: CategoryType; amount: number }> = {};
  for (const exp of monthExpenses) {
    const key = exp.subcategory;
    if (!subMap[key]) {
      subMap[key] = { category: exp.category, amount: 0 };
    }
    subMap[key].amount += Number(exp.amount) || 0;
  }
  return Object.entries(subMap)
    .map(([name, data]) => ({
      name,
      category: data.category,
      amount: data.amount,
      percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

// ==================== 1. MONEY OWED CALCULATIONS ====================

export function calculateMoneyOwedSummary(moneyOwedList: MoneyOwed[]): MoneyOwedSummary {
  const activeRecords = moneyOwedList.filter((m) => m.status !== 'Settled');
  const lentRecords = moneyOwedList.filter((m) => m.type === 'lent');
  const borrowedRecords = moneyOwedList.filter((m) => m.type === 'borrowed');

  const toReceiveTotal = lentRecords
    .filter((m) => m.status !== 'Settled')
    .reduce((sum, m) => sum + (Number(m.remainingAmount) || 0), 0);

  const toRepayTotal = borrowedRecords
    .filter((m) => m.status !== 'Settled')
    .reduce((sum, m) => sum + (Number(m.remainingAmount) || 0), 0);

  const netOutstanding = toReceiveTotal - toRepayTotal;

  let overdueCount = 0;
  let dueSoonCount = 0;

  activeRecords.forEach((m) => {
    const { isOverdue, isDueSoon, isDueToday, isDueTomorrow } = calculateDueDateStatus(m.dueDate);
    if (isOverdue) overdueCount++;
    if (isDueSoon || isDueToday || isDueTomorrow) dueSoonCount++;
  });

  return {
    toReceiveTotal,
    toRepayTotal,
    netOutstanding,
    lentRecords,
    borrowedRecords,
    overdueCount,
    dueSoonCount,
  };
}

// ==================== 2. EMERGENCY FUND SYSTEM ====================

export function calculateEmergencyFundDetails(
  fund: EmergencyFund | null | undefined,
  needsMonthlyExpenseOverride?: number
): EmergencyFundCalculation {
  const essentialMonthlyExpenses =
    fund?.essentialMonthlyExpenses !== undefined && fund.essentialMonthlyExpenses > 0
      ? fund.essentialMonthlyExpenses
      : needsMonthlyExpenseOverride || 25000;

  const targetMonths = fund?.targetMonths && fund.targetMonths > 0 ? fund.targetMonths : 6;
  const targetAmount = Math.round(essentialMonthlyExpenses * targetMonths);
  const currentAmount = fund?.currentAmount || 0;
  const remainingAmount = Math.max(0, targetAmount - currentAmount);

  const progressPercentage =
    targetAmount > 0
      ? Math.min(Math.round(((currentAmount / targetAmount) * 100) * 100) / 100, 100)
      : 0;

  const monthsCovered =
    essentialMonthlyExpenses > 0
      ? Math.round((currentAmount / essentialMonthlyExpenses) * 10) / 10
      : 0;

  const monthlyContributionPlan = fund?.monthlyContributionPlan || 0;
  const estimatedMonthsToComplete =
    monthlyContributionPlan > 0 ? Math.ceil(remainingAmount / monthlyContributionPlan) : 0;

  let estimatedCompletionDate = 'Not scheduled';
  if (estimatedMonthsToComplete > 0) {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + estimatedMonthsToComplete);
    estimatedCompletionDate = targetDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  return {
    essentialMonthlyExpenses,
    targetMonths,
    targetAmount,
    currentAmount,
    remainingAmount,
    progressPercentage,
    monthsCovered,
    monthlyContributionPlan,
    estimatedMonthsToComplete,
    estimatedCompletionDate,
  };
}

// ==================== 3. CASH FLOW CALCULATION ====================

export function calculateCashFlow(
  incomes: Income[],
  allowances: Allowance[],
  bonuses: Bonus[],
  expenses: Expense[],
  savings: SavingsRecord[],
  investments: Investment[],
  loans: Loan[],
  monthKey: string
): CashFlowSummary {
  const breakdown = calculateIncomeBreakdown(incomes, allowances, bonuses, monthKey);
  const monthExpTotal = calculateTotalExpenses(expenses, monthKey);
  const monthSavTotal = calculateTotalSavings(savings, monthKey);

  const monthInvTotal = getItemsForMonth(investments, monthKey).reduce(
    (sum, inv) => sum + (inv.amountInvested || 0),
    0
  );

  // Active loan payments / EMI for the month
  const activeLoans = loans.filter((l) => l.status === 'Active');
  const debtEmi = activeLoans.reduce((sum, l) => sum + (l.emiAmount || 0), 0);

  const remainingCashFlow =
    breakdown.totalInflow - monthExpTotal - monthSavTotal - monthInvTotal - debtEmi;

  return {
    regularIncome: breakdown.regularIncome,
    allowances: breakdown.allowancesTotal,
    bonus: breakdown.bonusesTotal,
    otherIncome: breakdown.otherIncomeTotal,
    totalInflow: breakdown.totalInflow,
    expenses: monthExpTotal,
    savings: monthSavTotal,
    investment: monthInvTotal,
    debtEmi,
    remainingCashFlow,
  };
}

// ==================== 4. NET WORTH CALCULATION ====================

export function calculateNetWorth(
  accounts: FinancialAccount[],
  savings: SavingsRecord[],
  emergencyFund: EmergencyFund | null,
  investments: Investment[],
  moneyOwed: MoneyOwed[],
  loans: Loan[]
): NetWorthSummary {
  const cashAndBank = accounts
    .filter((a) => a.type === 'Cash' || a.type === 'Bank account')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const totalSavings = savings.reduce((sum, s) => sum + (s.amount || 0), 0);
  const emergencyFundAmount = emergencyFund?.currentAmount || 0;
  const investmentsTotal = investments.reduce((sum, i) => sum + (i.currentValue || 0), 0);

  // Money owed to user (lent and pending) is an asset
  const moneyToReceive = moneyOwed
    .filter((m) => m.type === 'lent' && m.status !== 'Settled')
    .reduce((sum, m) => sum + (m.remainingAmount || 0), 0);

  const otherAssets = accounts
    .filter((a) => a.type === 'Other')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const totalAssets =
    cashAndBank + totalSavings + emergencyFundAmount + investmentsTotal + moneyToReceive + otherAssets;

  // Liabilities
  const moneyToRepay = moneyOwed
    .filter((m) => m.type === 'borrowed' && m.status !== 'Settled')
    .reduce((sum, m) => sum + (m.remainingAmount || 0), 0);

  const loansOutstanding = loans
    .filter((l) => l.status === 'Active')
    .reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);

  const creditCardOutstanding = accounts
    .filter((a) => a.type === 'Credit card')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  const totalLiabilities = moneyToRepay + loansOutstanding + creditCardOutstanding;
  const netWorth = totalAssets - totalLiabilities;

  return {
    assets: {
      cashAndBank,
      savings: totalSavings,
      emergencyFund: emergencyFundAmount,
      investments: investmentsTotal,
      moneyToReceive,
      otherAssets,
      total: totalAssets,
    },
    liabilities: {
      moneyToRepay,
      loansOutstanding,
      creditCardOutstanding,
      otherDebts: 0,
      total: totalLiabilities,
    },
    netWorth,
  };
}

// ==================== 5. UPCOMING & OVERDUE OBLIGATIONS ====================

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

export function getAllObligations(
  loans: Loan[],
  reminders: FinancialReminder[],
  bills: Bill[],
  subscriptions: Subscription[],
  moneyOwed: MoneyOwed[]
): ObligationItem[] {
  const items: ObligationItem[] = [];

  // Loans (EMIs)
  loans
    .filter((l) => l.status === 'Active' && l.emiAmount > 0)
    .forEach((l) => {
      const status = calculateDueDateStatus(l.nextPaymentDate || l.dueDate);
      items.push({
        id: `loan-emi-${l.id}`,
        sourceType: 'loan',
        title: `${l.name} EMI`,
        amount: l.emiAmount,
        dueDate: l.nextPaymentDate || l.dueDate,
        categoryOrType: l.type,
        diffDays: status.diffDays,
        dueLabel: status.label,
        statusBadge: status.statusBadge,
        isOverdue: status.isOverdue,
        relatedRecord: l,
      });
    });

  // Reminders
  reminders
    .filter((r) => r.status !== 'Paid' && r.status !== 'Cancelled')
    .forEach((r) => {
      const status = calculateDueDateStatus(r.dueDate);
      items.push({
        id: `rem-${r.id}`,
        sourceType: 'reminder',
        title: r.title,
        amount: r.amount,
        dueDate: r.dueDate,
        categoryOrType: r.type,
        diffDays: status.diffDays,
        dueLabel: status.label,
        statusBadge: status.statusBadge,
        isOverdue: status.isOverdue,
        relatedRecord: r,
      });
    });

  // Bills
  bills
    .filter((b) => !b.paid)
    .forEach((b) => {
      const status = calculateDueDateStatus(b.dueDate);
      items.push({
        id: `bill-${b.id}`,
        sourceType: 'bill',
        title: b.name,
        amount: b.amount,
        dueDate: b.dueDate,
        categoryOrType: b.category,
        diffDays: status.diffDays,
        dueLabel: status.label,
        statusBadge: status.statusBadge,
        isOverdue: status.isOverdue,
        relatedRecord: b,
      });
    });

  // Subscriptions
  subscriptions
    .filter((s) => s.isActive)
    .forEach((s) => {
      const status = calculateDueDateStatus(s.nextBillingDate);
      items.push({
        id: `sub-${s.id}`,
        sourceType: 'subscription',
        title: `${s.name} renewal`,
        amount: s.amount,
        dueDate: s.nextBillingDate,
        categoryOrType: 'Subscription',
        diffDays: status.diffDays,
        dueLabel: status.label,
        statusBadge: status.statusBadge,
        isOverdue: status.isOverdue,
        relatedRecord: s,
      });
    });

  // Money user owes to repay
  moneyOwed
    .filter((m) => m.type === 'borrowed' && m.status !== 'Settled')
    .forEach((m) => {
      const status = calculateDueDateStatus(m.dueDate);
      items.push({
        id: `owed-borrowed-${m.id}`,
        sourceType: 'moneyOwed',
        title: `Repay ${m.personName}`,
        amount: m.remainingAmount,
        dueDate: m.dueDate,
        categoryOrType: 'Money to repay',
        diffDays: status.diffDays,
        dueLabel: status.label,
        statusBadge: status.statusBadge,
        isOverdue: status.isOverdue,
        relatedRecord: m,
      });
    });

  // Sort ascending by dueDate
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function getUpcomingObligations(
  loans: Loan[],
  reminders: FinancialReminder[],
  bills: Bill[],
  subscriptions: Subscription[],
  moneyOwed: MoneyOwed[],
  daysAhead: number = 30
): ObligationItem[] {
  const all = getAllObligations(loans, reminders, bills, subscriptions, moneyOwed);
  return all.filter((item) => item.diffDays >= 0 && item.diffDays <= daysAhead);
}

export function getOverdueObligations(
  loans: Loan[],
  reminders: FinancialReminder[],
  bills: Bill[],
  subscriptions: Subscription[],
  moneyOwed: MoneyOwed[]
): ObligationItem[] {
  const all = getAllObligations(loans, reminders, bills, subscriptions, moneyOwed);
  return all.filter((item) => item.isOverdue);
}

// ==================== SAVINGS & INVESTMENTS SUMMARY ====================

export function calculateTotalSavings(savings: SavingsRecord[], monthKey?: string): number {
  const list = monthKey ? getItemsForMonth(savings, monthKey) : savings;
  return list.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
}

export function calculateInvestmentsSummary(investments: Investment[], monthKey?: string): {
  totalInvested: number;
  totalCurrentValue: number;
  totalGainLoss: number;
  returnPercentage: number;
} {
  const list = monthKey ? getItemsForMonth(investments, monthKey) : investments;
  const totalInvested = list.reduce((sum, inv) => sum + (Number(inv.amountInvested) || 0), 0);
  const totalCurrentValue = list.reduce((sum, inv) => sum + (Number(inv.currentValue) || 0), 0);
  const totalGainLoss = totalCurrentValue - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  return {
    totalInvested,
    totalCurrentValue,
    totalGainLoss,
    returnPercentage: Math.round(returnPercentage * 10) / 10,
  };
}

export function calculateGoalProgress(goal: FinancialGoal): {
  percentage: number;
  remainingAmount: number;
  isCompleted: boolean;
} {
  const target = Math.max(0, goal.targetAmount);
  const current = Math.max(0, goal.currentAmount);
  const remaining = Math.max(0, target - current);
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  return {
    percentage,
    remainingAmount: remaining,
    isCompleted: current >= target && target > 0,
  };
}

export function calculateMonthlySummary(
  incomes: Income[],
  expenses: Expense[],
  savings: SavingsRecord[],
  investments: Investment[],
  allowances: Allowance[] = [],
  bonuses: Bonus[] = [],
  monthKey: string
): MonthlyFinancialSummary {
  const breakdown = calculateIncomeBreakdown(incomes, allowances, bonuses, monthKey);
  const totalExpenses = calculateTotalExpenses(expenses, monthKey);
  const totalSavings = calculateTotalSavings(savings, monthKey);
  const monthInvestments = getItemsForMonth(investments, monthKey);
  const totalInvestments = monthInvestments.reduce((sum, inv) => sum + (Number(inv.amountInvested) || 0), 0);
  const netRemaining = breakdown.totalInflow - totalExpenses;
  const totalSavedAndInvested = totalSavings + totalInvestments + calculateCategorySpent(expenses, 'Savings', monthKey);
  const savingsRate = breakdown.totalInflow > 0 ? Math.round((totalSavedAndInvested / breakdown.totalInflow) * 100) : 0;

  const needsSpent = calculateCategorySpent(expenses, 'Needs', monthKey);
  const wantsSpent = calculateCategorySpent(expenses, 'Wants', monthKey);
  const savingsSpent = calculateCategorySpent(expenses, 'Savings', monthKey);

  return {
    totalIncome: breakdown.totalInflow,
    regularIncome: breakdown.regularIncome,
    allowancesTotal: breakdown.allowancesTotal,
    bonusesTotal: breakdown.bonusesTotal,
    otherIncomeTotal: breakdown.otherIncomeTotal,
    totalExpenses,
    totalSavings,
    totalInvestments,
    netRemaining,
    savingsRate,
    needsSpent,
    wantsSpent,
    savingsSpent,
  };
}

export function generateSmartInsights(
  incomes: Income[],
  expenses: Expense[],
  settings: AppSettings,
  budgets: SubcategoryBudget[],
  moneyOwed: MoneyOwed[] = [],
  emergencyFund: EmergencyFund | null = null,
  monthKey: string
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const monthExpenses = getItemsForMonth(expenses, monthKey);
  const totalIncome = calculateTotalIncome(incomes, monthKey);

  if (monthExpenses.length === 0 && totalIncome === 0) {
    return [
      {
        id: 'ins-empty',
        title: 'Not enough data yet',
        description: 'Start by adding your income and logging expenses to unlock useful insights.',
        type: 'neutral',
        icon: 'Sparkles',
      },
    ];
  }

  const summaries = calculateCategorySummaries(expenses, settings, totalIncome, monthKey);
  const totalSpent = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remainingBudget = totalIncome - totalSpent;

  // 1. Overall monthly budget remaining / over status
  if (totalIncome > 0) {
    if (remainingBudget > 0) {
      insights.push({
        id: 'ins-remaining',
        title: 'Monthly budget remaining',
        description: `${formatINR(remainingBudget)} left of your monthly income of ${formatINR(totalIncome)}.`,
        type: 'success',
        icon: 'CheckCircle2',
      });
    } else if (remainingBudget < 0) {
      insights.push({
        id: 'ins-over-monthly',
        title: 'Monthly budget exceeded',
        description: `You have spent ${formatINR(Math.abs(remainingBudget))} above your total monthly income.`,
        type: 'alert',
        icon: 'AlertCircle',
      });
    }
  }

  // 2. Money Owed to receive
  const moneySummary = calculateMoneyOwedSummary(moneyOwed);
  if (moneySummary.toReceiveTotal > 0) {
    insights.push({
      id: 'ins-owed-receive',
      title: `${formatINR(moneySummary.toReceiveTotal)} pending to receive`,
      description: `You have ${moneySummary.lentRecords.filter((m) => m.status !== 'Settled').length} personal loan(s) pending return.`,
      type: 'info',
      icon: 'ArrowDownLeft',
    });
  }

  // 3. Emergency fund progress
  if (emergencyFund) {
    const efCalc = calculateEmergencyFundDetails(emergencyFund);
    insights.push({
      id: 'ins-ef-status',
      title: `Emergency fund covers ${efCalc.monthsCovered} months`,
      description: `${formatINR(efCalc.currentAmount)} saved towards ${efCalc.targetMonths}-month target (${efCalc.progressPercentage}%).`,
      type: efCalc.progressPercentage >= 100 ? 'success' : 'neutral',
      icon: 'ShieldCheck',
    });
  }

  // 4. Largest spending category this month
  const sortedSummaries = [...summaries].sort((a, b) => b.spent - a.spent);
  if (sortedSummaries[0] && sortedSummaries[0].spent > 0) {
    const top = sortedSummaries[0];
    const pct = totalSpent > 0 ? Math.round((top.spent / totalSpent) * 100) : 0;
    insights.push({
      id: 'ins-top-cat',
      title: `${top.category} is your highest category`,
      description: `${top.category} represents ${pct}% (${formatINR(top.spent)}) of your total spending this month.`,
      type: 'info',
      category: top.category,
      icon: 'PieChart',
    });
  }

  // 5. Subcategory budget alerts
  const monthBudgets = budgets.filter((b) => b.month === monthKey);
  for (const b of monthBudgets) {
    const spent = calculateSubcategorySpent(expenses, b.subcategory, b.category, monthKey);
    const status = calculateBudgetStatus(b.amount, spent);
    if (status.isOverBudget) {
      insights.push({
        id: `ins-sub-over-${b.subcategory}`,
        title: `${b.subcategory} limit exceeded`,
        description: `You have exceeded your ${b.subcategory} budget by ${formatINR(status.overAmount)} (Spent ${formatINR(spent)} of ${formatINR(b.amount)}).`,
        type: 'alert',
        category: b.category,
        icon: 'AlertTriangle',
      });
      break;
    }
  }

  return insights;
}
