import React,{ useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { DashboardHeader } from './DashboardHeader';
import { AppNavigation } from './AppNavigation';
import { LogExpenseModal } from './LogExpenseModal';
import { InvestmentAssetModal } from './InvestmentAssetModal';
import { FinancialGoalModal } from './FinancialGoalModal';
import { SavingsDepositModal } from './SavingsDepositModal';
import { BillModal } from './BillModal';
import { SubscriptionModal } from './SubscriptionModal';
import { ReceiptScanModal } from './ReceiptScanModal';
import { OnboardingFlow } from './OnboardingFlow';
import { AlertsManagerModal } from './AlertsManagerModal';
import { MigrationModal } from './MigrationModal';
import { NotificationCenterModal } from './NotificationCenterModal';
import { MoneyVaultLogo } from './MoneyVaultLogo';

// Screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { MoneyOwedScreen } from '../screens/MoneyOwedScreen';
import { LoansDebtScreen } from '../screens/LoansDebtScreen';
import { EmergencyFundScreen } from '../screens/EmergencyFundScreen';
import { BillsRemindersScreen } from '../screens/BillsRemindersScreen';
import { FinancialCalendarScreen } from '../screens/FinancialCalendarScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { BudgetsScreen } from '../screens/BudgetsScreen';
import { SavingsScreen } from '../screens/SavingsScreen';
import { InvestmentsScreen } from '../screens/InvestmentsScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TourScreen } from '../screens/TourScreen';
import { AIScreen } from '../screens/AIScreen';
import { ResearchScreen } from '../screens/ResearchScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { SplitExpensesScreen } from '../screens/SplitExpensesScreen';
import { GroupInviteView } from './splitExpenses/GroupInviteView';

export const AppShell: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setActiveSplitGroupId,
    quickAddOpen,
    quickAddType,
    setQuickAddOpen,
    editingExpense,
    setEditingExpense,
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
    receiptScanModalOpen,
    setReceiptScanModalOpen,
    onboardingOpen,
    setOnboardingOpen,
    isLoading,
    theme,
  } = useFinTraQ();

  const [notifCenterOpen, setNotifCenterOpen] = useState(false);

  // Check for group invite URL /group-invite/:token or ?invite=token or #invite-token
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const match = path.match(/\/group-invite\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('invite')) return searchParams.get('invite');
    if (window.location.hash.startsWith('#invite-')) {
      return window.location.hash.replace('#invite-', '');
    }
    return null;
  });

  if (inviteToken) {
    return (
      <GroupInviteView
        token={inviteToken}
        onJoined={(joinedGroup) => {
          setInviteToken(null);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
          setActiveTab('split_expenses');
          setActiveSplitGroupId(joinedGroup.id);
        }}
        onCancel={() => {
          setInviteToken(null);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
          setActiveTab('home');
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--mv-bg-primary)] flex flex-col items-center justify-center space-y-4">
        <div className="relative animate-pulse">
          <MoneyVaultLogo variant="mark" theme={theme} size="lg" />
        </div>
        <div className="flex flex-col items-center space-y-1">
          <p className="text-sm font-extrabold text-[var(--mv-text-primary)] tracking-wider">MONEY VAULT</p>
          <p className="text-[11px] font-semibold text-[var(--mv-text-muted)] tracking-wide uppercase">
            Secure Your Money. Master Your Future.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--mv-bg-primary)] text-[var(--mv-text-primary)] flex transition-colors duration-200">
      {/* Desktop Sidebar Navigation & Mobile Tab Bar */}
      <AppNavigation />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* App Header (Shows unless on tour/landing or onboarding) */}
        {activeTab !== 'landing' && activeTab !== 'tour' && (
          <DashboardHeader onOpenNotifications={() => setNotifCenterOpen(true)} />
        )}

        {/* Content Viewport Container */}
        <main
          className={`flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 ${
            activeTab === 'ai' || activeTab === 'calendar' || activeTab === 'reports'
              ? 'max-w-5xl'
              : 'max-w-6xl'
          }`}
        >
          {activeTab === 'home' && <DashboardScreen />}
          {activeTab === 'expenses' && <ExpensesScreen />}
          {activeTab === 'split_expenses' && <SplitExpensesScreen />}
          {activeTab === 'budgets' && <BudgetsScreen />}
          {activeTab === 'savings' && <SavingsScreen />}
          {activeTab === 'emergency_fund' && <EmergencyFundScreen />}
          {activeTab === 'goals' && <GoalsScreen />}
          {activeTab === 'investments' && <InvestmentsScreen />}
          {activeTab === 'research' && <ResearchScreen />}
          {activeTab === 'loans' && <LoansDebtScreen />}
          {activeTab === 'money_owed' && <MoneyOwedScreen />}
          {activeTab === 'reminders' && <BillsRemindersScreen />}
          {activeTab === 'calendar' && <FinancialCalendarScreen />}
          {activeTab === 'insights' && <InsightsScreen />}
          {activeTab === 'reports' && <ReportsScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
          {activeTab === 'landing' && <TourScreen />}
          {activeTab === 'tour' && <TourScreen />}
          {activeTab === 'ai' && <AIScreen />}
          {activeTab === 'alerts' && <AlertsScreen />}
        </main>
      </div>

      {/* 1. Universal Transaction Modal (Expense, Income, Allowance, Bonus, Money Lent/Borrowed) */}
      <LogExpenseModal
        isOpen={quickAddOpen || !!editingExpense}
        onClose={() => {
          setQuickAddOpen(false);
          setEditingExpense(null);
        }}
        editingExpense={editingExpense}
        initialType={quickAddType}
      />

      {/* 2. Dedicated Investment Asset Form Modal */}
      <InvestmentAssetModal
        isOpen={investmentModalOpen || !!editingInvestment}
        onClose={() => {
          setInvestmentModalOpen(false);
          setEditingInvestment(null);
        }}
        editingInvestment={editingInvestment}
      />

      {/* 3. Dedicated Financial Goal Modal */}
      <FinancialGoalModal
        isOpen={goalModalOpen || !!editingGoal || !!contributingGoal}
        onClose={() => {
          setGoalModalOpen(false);
          setEditingGoal(null);
          setContributingGoal(null);
        }}
        editingGoal={editingGoal}
        contributingGoal={contributingGoal}
      />

      {/* 4. Dedicated Savings Deposit Modal */}
      <SavingsDepositModal
        isOpen={savingsModalOpen || !!editingSaving}
        onClose={() => {
          setSavingsModalOpen(false);
          setEditingSaving(null);
        }}
        editingSaving={editingSaving}
      />

      {/* 5. Dedicated Bill Form Modal */}
      <BillModal
        isOpen={billModalOpen || !!editingBill}
        onClose={() => {
          setBillModalOpen(false);
          setEditingBill(null);
        }}
        editingBill={editingBill}
      />

      {/* 6. Dedicated Subscription Form Modal */}
      <SubscriptionModal
        isOpen={subscriptionModalOpen || !!editingSubscription}
        onClose={() => {
          setSubscriptionModalOpen(false);
          setEditingSubscription(null);
        }}
        editingSubscription={editingSubscription}
      />

      {/* 7. Dedicated Receipt OCR Scan Modal */}
      <ReceiptScanModal
        isOpen={receiptScanModalOpen}
        onClose={() => setReceiptScanModalOpen(false)}
      />

      {/* Notifications & Activity Center Modal */}
      <NotificationCenterModal isOpen={notifCenterOpen} onClose={() => setNotifCenterOpen(false)} />

      {/* Financial Thresholds & Guardrails Modal */}
      <AlertsManagerModal />

      {/* Cloud Migration Prompt Modal */}
      <MigrationModal />

      {/* First-time Onboarding Flow Modal */}
      {onboardingOpen && <OnboardingFlow onComplete={() => setOnboardingOpen(false)} />}
    </div>
  );
};
