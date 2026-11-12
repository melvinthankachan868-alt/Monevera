import { Subcategory,AppSettings } from '../types';

export const DEFAULT_SUBCATEGORIES: Subcategory[] = [
  // Needs
  { id: 'sub-rent', name: 'Rent', category: 'Needs', iconName: 'Home', isDefault: true },
  { id: 'sub-food', name: 'Food', category: 'Needs', iconName: 'Utensils', isDefault: true },
  { id: 'sub-utilities', name: 'Utilities', category: 'Needs', iconName: 'Zap', isDefault: true },
  { id: 'sub-home', name: 'Home', category: 'Needs', iconName: 'Armchair', isDefault: true },
  { id: 'sub-healthcare', name: 'Healthcare', category: 'Needs', iconName: 'HeartPulse', isDefault: true },
  { id: 'sub-education', name: 'Education', category: 'Needs', iconName: 'GraduationCap', isDefault: true },
  { id: 'sub-transport', name: 'Transport', category: 'Needs', iconName: 'Car', isDefault: true },
  { id: 'sub-insurance', name: 'Insurance', category: 'Needs', iconName: 'ShieldCheck', isDefault: true },

  // Wants
  { id: 'sub-shopping', name: 'Shopping', category: 'Wants', iconName: 'ShoppingBag', isDefault: true },
  { id: 'sub-entertainment', name: 'Entertainment', category: 'Wants', iconName: 'Film', isDefault: true },
  { id: 'sub-dining', name: 'Dining Out', category: 'Wants', iconName: 'Coffee', isDefault: true },
  { id: 'sub-travel', name: 'Travel', category: 'Wants', iconName: 'Plane', isDefault: true },
  { id: 'sub-subscriptions', name: 'Subscriptions', category: 'Wants', iconName: 'CalendarCheck', isDefault: true },
  { id: 'sub-hobbies', name: 'Hobbies', category: 'Wants', iconName: 'Sparkles', isDefault: true },
  { id: 'sub-electronics', name: 'Electronics', category: 'Wants', iconName: 'Smartphone', isDefault: true },

  // Savings
  { id: 'sub-emergency', name: 'Emergency Fund', category: 'Savings', iconName: 'PiggyBank', isDefault: true },
  { id: 'sub-investments', name: 'Investments', category: 'Savings', iconName: 'TrendingUp', isDefault: true },
  { id: 'sub-fd', name: 'Fixed Deposit', category: 'Savings', iconName: 'Landmark', isDefault: true },
  { id: 'sub-mf', name: 'Mutual Funds', category: 'Savings', iconName: 'LineChart', isDefault: true },
  { id: 'sub-other-savings', name: 'Other Savings', category: 'Savings', iconName: 'Coins', isDefault: true },
];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'INR',
  secondaryCurrencies: [],
  needsPercentage: 50,
  wantsPercentage: 30,
  savingsPercentage: 20,
  onboardingCompleted: false,
  firstDayOfWeek: 'Monday',
  defaultCategory: 'Needs',
  defaultPaymentMethod: 'UPI',
  largeExpenseThreshold: 10000,
  unusualSpendingEnabled: true,
  theme: 'dark',
};

export const BUDGET_RATIO_PRESETS = [
  { label: '50 / 30 / 20', needs: 50, wants: 30, savings: 20 },
  { label: '60 / 20 / 20', needs: 60, wants: 20, savings: 20 },
  { label: '70 / 20 / 10', needs: 70, wants: 20, savings: 10 },
  { label: '40 / 30 / 30', needs: 40, wants: 30, savings: 30 },
];
