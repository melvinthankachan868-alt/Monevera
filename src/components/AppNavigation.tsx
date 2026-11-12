import React,{ useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { MoneyVaultLogo } from './MoneyVaultLogo';
import {
LayoutDashboard,
Receipt,
PiggyBank,
PieChart,
Settings,
Sparkles,
Plus,
Bell,
CreditCard,
ArrowDownLeft,
ShieldCheck,
Calendar,
CalendarCheck,
Target,
TrendingUp,
FileText,
ChevronLeft,
ChevronRight,
Menu,
X,
Wallet,
User as UserIcon,
Compass,
Users,
} from 'lucide-react';
import { AccountModal } from './AccountModal';
import { NotificationCenterModal } from './NotificationCenterModal';

interface NavGroup {
  label: string;
  items: {
    id: any;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
  }[];
}

export const AppNavigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setQuickAddOpen,
    user,
    activeTriggeredAlertsCount,
  } = useFinTraQ();

  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Grouped Navigation per Requirement 13
  const navGroups: NavGroup[] = [
    {
      label: 'MONEY',
      items: [
        { id: 'home', label: 'Overview', icon: LayoutDashboard },
        { id: 'expenses', label: 'Transactions', icon: Receipt },
        { id: 'split_expenses', label: 'Split Expenses', icon: Users },
        { id: 'budgets', label: 'Budget Control', icon: PiggyBank },
      ],
    },
    {
      label: 'PLAN',
      items: [
        { id: 'savings', label: 'Savings Vault', icon: Wallet },
        { id: 'emergency_fund', label: 'Emergency Safety Net', icon: ShieldCheck },
        { id: 'goals', label: 'Financial Goals', icon: Target },
      ],
    },
    {
      label: 'GROW',
      items: [
        { id: 'investments', label: 'Investments', icon: TrendingUp },
        { id: 'research', label: 'Money Research', icon: Compass },
      ],
    },
    {
      label: 'OBLIGATIONS',
      items: [
        { id: 'loans', label: 'Loans & Debt', icon: CreditCard },
        { id: 'money_owed', label: 'Money Owed', icon: ArrowDownLeft },
        { id: 'reminders', label: 'Bills & Subscriptions', icon: CalendarCheck },
        { id: 'calendar', label: 'Due Calendar', icon: Calendar },
      ],
    },
    {
      label: 'INTELLIGENCE',
      items: [
        { id: 'insights', label: 'Money Intelligence', icon: PieChart },
        { id: 'ai', label: 'Money Vault AI', icon: Sparkles },
      ],
    },
    {
      label: 'SYSTEM',
      items: [
        {
          id: 'alerts',
          label: 'Alert Center',
          icon: Bell,
          badge: activeTriggeredAlertsCount > 0 ? activeTriggeredAlertsCount : undefined,
          badgeColor: 'bg-[#FFB84D] text-[#0B0D0C]',
        },
        { id: 'reports', label: 'Financial Reports', icon: FileText },
        { id: 'tour', label: 'Product Tour', icon: Compass },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  // Mobile Bottom Navigation Tabs (Requirement 14)
  const mobileTabs = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'expenses', label: 'Transactions', icon: Receipt },
    { id: 'budgets', label: 'Budget', icon: PiggyBank },
    { id: 'ai', label: 'AI Vault', icon: Sparkles },
    { id: 'more', label: 'More', icon: Menu },
  ] as const;

  const handleNavClick = (id: any) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ========================================================
          DESKTOP SIDEBAR NAVIGATION (Requirement 13)
      ======================================================== */}
      <aside
        className={`hidden md:flex flex-col h-screen sticky top-0 bg-[var(--mv-bg-primary)] border-r border-[var(--mv-border)] transition-all duration-300 z-30 select-none ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--mv-border)] flex-shrink-0">
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-90 overflow-hidden"
          >
            <MoneyVaultLogo variant={collapsed ? 'mark' : 'full'} theme="dark" size="sm" />
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-lg bg-[var(--mv-surface)] border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Quick Transaction Action Trigger */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setQuickAddOpen(true, 'expense')}
            className={`w-full py-2.5 bg-[#A8F34A] hover:bg-[#B8FF62] text-[#0B0D0C] font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,243,74,0.18)] transition-all cursor-pointer active:scale-95 ${
              collapsed ? 'px-0' : 'px-3'
            }`}
            title="Log Financial Transaction"
          >
            <Plus size={16} strokeWidth={3} />
            {!collapsed && <span>Quick Entry</span>}
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-extrabold text-[var(--mv-text-muted)] uppercase tracking-widest mb-1.5">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer ${
                      collapsed ? 'justify-center p-2.5' : 'px-3 py-2 gap-3'
                    } ${
                      isActive
                        ? 'bg-[#A8F34A]/10 text-[#A8F34A] font-bold border border-[#A8F34A]/25 shadow-sm'
                        : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)]'
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={isActive ? 'text-[#A8F34A]' : 'text-[var(--mv-text-muted)] group-hover:text-[var(--mv-text-secondary)]'}
                    />

                    {!collapsed && (
                      <span className="text-xs truncate flex-1 text-left">{item.label}</span>
                    )}

                    {!collapsed && item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                          item.badgeColor || 'bg-[#A8F34A] text-[#0B0D0C]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {collapsed && item.badge !== undefined && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FFB84D] animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Desktop Footer Profile & Sync Status */}
        <div className="p-3 border-t border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] flex-shrink-0">
          <div
            onClick={() => setAccountOpen(true)}
            className={`flex items-center rounded-xl p-2 cursor-pointer hover:bg-[var(--mv-surface-hover)] transition-colors ${
              collapsed ? 'justify-center' : 'gap-2.5'
            }`}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-8 h-8 rounded-full border border-[#A8F34A]/30 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[#A8F34A] flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'V'}
              </div>
            )}

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[var(--mv-text-primary)] truncate">
                  {user?.displayName || (user ? 'Authenticated User' : 'Local Vault Mode')}
                </div>
                <div className="text-[10px] text-[var(--mv-text-secondary)] truncate">
                  {user ? user.email : 'Click to connect Google'}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================
          MOBILE BOTTOM NAVIGATION (Requirement 14)
      ======================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--mv-bg-secondary)]/95 backdrop-blur-xl border-t border-[var(--mv-border)] pb-safe shadow-2xl"
      >
        <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-2">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const isMore = item.id === 'more';
            const isActive = activeTab === item.id || (isMore && mobileMenuOpen);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isMore) {
                    setMobileMenuOpen(!mobileMenuOpen);
                  } else {
                    setActiveTab(item.id as any);
                    setMobileMenuOpen(false);
                  }
                }}
                className={`min-h-[44px] flex flex-col items-center justify-center transition-colors relative cursor-pointer ${
                  isActive ? 'text-[#A8F34A]' : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-secondary)]'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="transition-transform duration-200"
                />
                <span
                  className={`text-[10px] tracking-tight mt-1 ${
                    isActive ? 'font-bold text-[#A8F34A]' : 'text-[var(--mv-text-muted)]'
                  }`}
                >
                  {item.label}
                </span>

                {isMore && activeTriggeredAlertsCount > 0 && (
                  <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-[#FFB84D] animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ========================================================
          MOBILE "MORE" DRAWER MODAL (Requirement 14)
      ======================================================== */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-[var(--mv-surface)] border-t border-[var(--mv-border)] rounded-t-3xl max-h-[82vh] overflow-y-auto p-5 pb-safe space-y-5 animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[var(--mv-border)] pb-3">
              <MoneyVaultLogo variant="full" theme="dark" size="sm" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Groups inside Drawer */}
            <div className="space-y-4">
              {navGroups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="text-[10px] font-extrabold text-[var(--mv-text-muted)] uppercase tracking-widest px-2 mb-1">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavClick(item.id)}
                          className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[var(--mv-primary)]/15 border-[var(--mv-primary)]/30 text-[var(--mv-primary)]'
                              : 'bg-[var(--mv-surface-hover)] border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:bg-[var(--mv-surface-elevated)]'
                          }`}
                        >
                          <Icon size={16} className={isActive ? 'text-[var(--mv-primary)]' : 'text-[var(--mv-text-muted)]'} />
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--mv-warning)] text-[#0B0D0C]">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Profile Action in Drawer */}
            <div className="pt-3 border-t border-[var(--mv-border)]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAccountOpen(true);
                }}
                className="w-full p-3 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] flex items-center justify-between text-xs font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <UserIcon size={16} className="text-[var(--mv-primary)]" />
                  <span>{user ? user.displayName || user.email : 'Google Account Sync'}</span>
                </div>
                <span className="text-[10px] text-[var(--mv-primary)] font-bold">Settings →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {accountOpen && <AccountModal isOpen={accountOpen} onClose={() => setAccountOpen(false)} />}

      {/* Notifications Modal */}
      {notifCenterOpen && (
        <NotificationCenterModal isOpen={notifCenterOpen} onClose={() => setNotifCenterOpen(false)} />
      )}
    </>
  );
};
