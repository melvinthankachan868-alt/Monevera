import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatMonthName } from '../utils/calculations';
import { MoneyVaultLogo } from './MoneyVaultLogo';
import {
  ChevronLeft,
  ChevronRight,
  WifiOff,
  Sparkles,
  Bell,
  Sun,
  Moon,
} from 'lucide-react';
import { AccountModal } from './AccountModal';

interface DashboardHeaderProps {
  onOpenSplitEditor?: () => void;
  onOpenNotifications?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onOpenNotifications }) => {
  const {
    selectedMonth,
    prevMonth,
    nextMonth,
    isOffline,
    setActiveTab,
    activeTab,
    user,
    activeTriggeredAlertsCount,
    theme,
    setTheme,
  } = useFinTraQ();

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const formattedMonth = formatMonthName(selectedMonth);

  // Derive section breadcrumb title
  const sectionTitles: Record<string, string> = {
    home: 'Command Dashboard',
    expenses: 'Transaction Ledger',
    budgets: '50/30/20 Budgeting',
    savings: 'Savings Vault',
    emergency_fund: 'Emergency Safety Net',
    goals: 'Financial Goals',
    investments: 'Investment Portfolio',
    research: 'Money Research & Discovery',
    loans: 'Loans & EMI Tracking',
    money_owed: 'Loans & Money Owed',
    reminders: 'Bills & Subscriptions',
    calendar: 'Financial Event Calendar',
    insights: 'Money Intelligence',
    ai: 'Mike Assistant',
    alerts: 'Alert Center',
    reports: 'Financial Reports',
    settings: 'System & Preferences',
    tour: 'Product Tour',
  };

  const currentTitle = sectionTitles[activeTab] || 'Command Center';

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <>
      <header className="w-full bg-[var(--mv-surface)]/95 backdrop-blur-xl border-b border-[var(--mv-border)] sticky top-0 z-20 transition-colors duration-200">
        {/* Offline Alert Strip */}
        {isOffline && (
          <div className="bg-amber-500/15 text-amber-500 border-b border-amber-500/30 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2">
            <WifiOff size={13} className="shrink-0" />
            <span>Offline mode active — all records are encrypted and preserved in local storage.</span>
          </div>
        )}

        {/* Main Header Bar */}
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Mobile Brand & Desktop Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Brand Logo */}
            <div
              className="md:hidden flex items-center gap-2 cursor-pointer shrink-0"
              onClick={() => setActiveTab('home')}
            >
              <MoneyVaultLogo variant="mark" size="sm" />
              <span className="font-extrabold text-sm text-[var(--mv-text-primary)] tracking-tight">
                Money<span className="text-[var(--mv-primary)]">Vault</span>
              </span>
            </div>

            {/* Desktop Breadcrumb Navigation */}
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-[var(--mv-text-secondary)]">
              <span
                onClick={() => setActiveTab('home')}
                className="hover:text-[var(--mv-text-primary)] cursor-pointer transition-colors"
              >
                Money Vault
              </span>
              <span className="text-[var(--mv-text-muted)]">/</span>
              <span className="text-[var(--mv-text-primary)] font-bold">{currentTitle}</span>
            </div>

            {/* Storage Mode Badge */}
            <div className="hidden sm:flex items-center ml-2">
              {!user ? (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold select-none cursor-pointer hover:bg-emerald-500/20 transition-colors"
                  onClick={() => setAccountModalOpen(true)}
                  title="Local-only mode: all records are stored securely in this browser's private IndexedDB vault and do not sync to other devices. Click to view account options."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Stored on this device</span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold select-none cursor-pointer hover:bg-blue-500/20 transition-colors"
                  onClick={() => setAccountModalOpen(true)}
                  title="Authenticated Cloud Mode: connected to Cloud Firestore. Click to manage."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Cloud Synced</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Controls: [Date] [Mike] [Theme Toggle] [Notifications] [Profile] */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* 1. Month Stepper Widget [Date] */}
            <div className="flex items-center gap-1 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface)] transition-colors cursor-pointer"
                title="Previous month"
                aria-label="Previous month"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-bold text-[var(--mv-text-primary)] px-2 select-none tabular-nums whitespace-nowrap">
                {formattedMonth}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface)] transition-colors cursor-pointer"
                title="Next month"
                aria-label="Next month"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {/* 2. Mike Assistant Trigger [Mike] */}
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`py-1.5 px-3 rounded-xl border transition-all cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-bold ${
                activeTab === 'ai'
                  ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] border-[var(--mv-primary)] shadow-sm'
                  : 'bg-[var(--mv-surface-hover)] text-[var(--mv-text-secondary)] border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] hover:text-[var(--mv-text-primary)]'
              }`}
              title="Open Mike — Money Vault Assistant"
            >
              <Sparkles size={14} className={activeTab === 'ai' ? 'text-white dark:text-[#0B0D0C]' : 'text-[var(--mv-primary)]'} />
              <span>Mike</span>
            </button>

            {/* 3. Global Dark / Light Theme Toggle [Theme Toggle] */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)] transition-all cursor-pointer shadow-xs"
              title={theme === 'dark' ? 'Dark Mode active (Click to switch to Light Mode)' : 'Light Mode active (Click to switch to Dark Mode)'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Moon size={16} className="text-[var(--mv-primary)]" />
              ) : (
                <Sun size={16} className="text-amber-600" />
              )}
            </button>

            {/* 4. Notification Center Trigger [Notifications] */}
            <button
              type="button"
              onClick={onOpenNotifications || (() => setActiveTab('alerts'))}
              className="relative p-2 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)] transition-colors cursor-pointer shadow-xs"
              title="Notifications & Activity"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {activeTriggeredAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[var(--mv-warning)] text-[#0B0D0C] font-black text-[10px] rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {activeTriggeredAlertsCount}
                </span>
              )}
            </button>

            {/* 5. User Profile Avatar [Profile] */}
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="flex items-center gap-2 p-1 bg-[var(--mv-surface-hover)] hover:bg-[var(--mv-surface)] border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] rounded-xl transition-all cursor-pointer shadow-xs"
              title="Account & Cloud Sync"
              aria-label="Account Settings"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-lg object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center font-bold text-xs">
                  {user?.email?.charAt(0).toUpperCase() || 'V'}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Account Settings Modal */}
      {accountModalOpen && (
        <AccountModal isOpen={accountModalOpen} onClose={() => setAccountModalOpen(false)} />
      )}
    </>
  );
};
