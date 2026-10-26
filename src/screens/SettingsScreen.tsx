import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { MoneyVaultLogo } from '../components/MoneyVaultLogo';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Cloud,
  Download,
  Upload,
  Trash2,
  Bell,
  FileText,
  Lock,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  Compass,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { exportFinancialStatementPDF } from '../utils/pdfExport';
import { DiagnosticDashboard } from '../components/DiagnosticDashboard';

export const SettingsScreen: React.FC = () => {
  const {
    user,
    userProfile,
    signInWithGoogle,
    signOut,
    cloudSyncStatus,
    setAlertsModalOpen,
    exportData,
    importData,
    clearAllData,
    selectedMonth,
    isAuthLoading,
    authError,
    setAuthError,
    incomes,
    allowances,
    bonuses,
    expenses,
    savings,
    investments,
    goals,
    budgets,
    subcategories,
    moneyOwed,
    loans,
    bills,
    subscriptions,
    emergencyFund,
    cashFlowSummary,
    netWorthSummary,
    insights,
    theme,
    setTheme,
    setActiveTab,
  } = useFinTraQ();

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportJSON = async () => {
    const jsonStr = await exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money_vault_financial_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        await importData(text);
        setImportStatus('Data successfully imported and synchronized into Money Vault!');
        setTimeout(() => setImportStatus(null), 4000);
      } catch (err: any) {
        setImportStatus(`Import failed: ${err.message || 'Invalid format'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      await exportFinancialStatementPDF({
        user,
        selectedMonth,
        incomes,
        allowances,
        bonuses,
        expenses,
        savings,
        investments,
        goals,
        budgets,
        subcategories,
        moneyOwed,
        loans,
        bills,
        subscriptions,
        emergencyFund,
        cashFlow: cashFlowSummary,
        netWorth: netWorthSummary,
        insights,
      });
    } catch (e) {
      console.error('PDF error:', e);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2">
          <SettingsIcon className="text-[var(--mv-primary)]" size={26} />
          <span>System & Preferences</span>
        </h1>
        <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
          Account sync, visual theme, notification guardrails, data portability, and local backups.
        </p>
      </div>

      {importStatus && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold animate-in fade-in">
          {importStatus}
        </div>
      )}

      {/* Visual Theme Settings */}
      <div className="bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)] shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--mv-text-primary)] flex items-center gap-2">
              {theme === 'dark' ? <Moon size={18} className="text-[var(--mv-primary)]" /> : <Sun size={18} className="text-amber-500" />}
              <span>Appearance & Theme</span>
            </h2>
            <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
              Choose your interface color scheme. Money Vault supports high-contrast dark charcoal and clean daylight themes.
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--mv-surface-hover)] text-[var(--mv-text-muted)] border border-[var(--mv-border)]">
            {theme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              theme === 'dark'
                ? 'bg-[var(--mv-surface-hover)] border-[var(--mv-primary)] shadow-sm'
                : 'bg-[var(--mv-bg-secondary)] border-[var(--mv-border)] hover:border-[var(--mv-border-strong)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--mv-bg-primary)] border border-[var(--mv-border)] text-[#A8F34A] flex items-center justify-center font-bold">
                <Moon size={18} />
              </div>
              <div>
                <div className="font-bold text-xs text-[var(--mv-text-primary)]">Dark Charcoal</div>
                <div className="text-[10px] text-[var(--mv-text-muted)]">OLED-ready black slate</div>
              </div>
            </div>
            {theme === 'dark' && <CheckCircle2 size={16} className="text-[var(--mv-primary)]" />}
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              theme === 'light'
                ? 'bg-amber-50/50 border-amber-500 text-slate-900 shadow-sm'
                : 'bg-[var(--mv-bg-secondary)] border-[var(--mv-border)] hover:border-[var(--mv-border-strong)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-amber-600 flex items-center justify-center font-bold shadow-xs">
                <Sun size={18} />
              </div>
              <div>
                <div className="font-bold text-xs text-[var(--mv-text-primary)]">Daylight</div>
                <div className="text-[10px] text-[var(--mv-text-muted)]">Clean bright surfaces</div>
              </div>
            </div>
            {theme === 'light' && <CheckCircle2 size={16} className="text-amber-600" />}
          </button>
        </div>
      </div>

      {/* Account & Cloud Sync */}
      <div className="bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)] shadow-xs p-5 space-y-4">
        <h2 className="text-sm font-bold text-[var(--mv-text-primary)] flex items-center gap-2">
          <Cloud size={18} className="text-[var(--mv-primary)]" />
          <span>Account & Cloud Synchronization</span>
        </h2>

        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--mv-bg-secondary)] rounded-xl border border-[var(--mv-border)]">
            <div className="flex items-center space-x-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-[var(--mv-primary)]/30" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center font-bold">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <div className="font-bold text-sm text-[var(--mv-text-primary)]">{user.displayName || 'Google Account'}</div>
                <div className="text-xs text-[var(--mv-text-muted)]">{user.email}</div>
                <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Cloud Synced to Firestore ({cloudSyncStatus})</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="px-4 py-2 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] text-[var(--mv-text-primary)] rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {authError && (
              <div className="p-3 bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373] text-xs font-semibold rounded-xl flex items-center justify-between">
                <span>{authError}</span>
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  className="underline text-[11px] font-bold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--mv-bg-secondary)] rounded-xl border border-[var(--mv-border)]">
              <div>
                <div className="font-bold text-sm text-[var(--mv-text-primary)]">Sign in with Google</div>
                <div className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
                  Enable multi-device synchronization and automatic Firestore cloud backups.
                </div>
                <div className="text-[10px] font-bold text-[var(--mv-text-muted)] mt-1">
                  Currently running in offline-first IndexedDB mode.
                </div>
              </div>

              <button
                type="button"
                disabled={isAuthLoading}
                onClick={signInWithGoogle}
                className="px-4 py-2.5 bg-[var(--mv-primary)] hover:brightness-110 disabled:opacity-50 text-white dark:text-[#0B0D0C] rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer self-start sm:self-auto"
              >
                <User size={15} />
                <span>{isAuthLoading ? 'Connecting...' : 'Connect Google Account'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications & Guardrails Trigger */}
      <div className="bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)] shadow-xs p-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--mv-text-primary)] flex items-center gap-2">
            <Bell size={18} className="text-[var(--mv-primary)]" />
            <span>Alerts & Guardrails Manager</span>
          </h2>
          <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
            Configure threshold triggers, low balance limits, and notification preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAlertsModalOpen(true)}
          className="px-4 py-2 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] text-[var(--mv-text-primary)] rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Configure
        </button>
      </div>

      {/* Export & Reports */}
      <div className="bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)] shadow-xs p-5 space-y-4">
        <h2 className="text-sm font-bold text-[var(--mv-text-primary)] flex items-center gap-2">
          <FileText size={18} className="text-[var(--mv-primary)]" />
          <span>Reports & Data Export</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="p-4 rounded-xl border border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] hover:bg-[var(--mv-surface-hover)] hover:border-[var(--mv-primary)] transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--mv-text-primary)] group-hover:text-[var(--mv-primary)]">
                PDF Financial Statement
              </span>
              <Download size={16} className="text-[var(--mv-text-muted)] group-hover:text-[var(--mv-primary)]" />
            </div>
            <p className="text-[11px] text-[var(--mv-text-secondary)] mt-1">
              Multi-page audit-ready PDF including income breakdown, debts, EMIs, and balance sheet.
            </p>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="p-4 rounded-xl border border-[var(--mv-border)] bg-[var(--mv-bg-secondary)] hover:bg-[var(--mv-surface-hover)] hover:border-[var(--mv-primary)] transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--mv-text-primary)] group-hover:text-[var(--mv-primary)]">
                JSON Backup File
              </span>
              <Download size={16} className="text-[var(--mv-text-muted)] group-hover:text-[var(--mv-primary)]" />
            </div>
            <p className="text-[11px] text-[var(--mv-text-secondary)] mt-1">
              Complete raw schema snapshot for offline preservation or migrating devices.
            </p>
          </button>
        </div>
      </div>

      {/* Import & Disaster Recovery */}
      <div className="bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)] shadow-xs p-5 space-y-4">
        <h2 className="text-sm font-bold text-[var(--mv-text-primary)] flex items-center gap-2">
          <Upload size={18} className="text-[var(--mv-text-secondary)]" />
          <span>Restore Backup</span>
        </h2>
        <p className="text-xs text-[var(--mv-text-secondary)]">
          Restore an existing Money Vault backup JSON file into your local environment.
        </p>

        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--mv-surface-hover)] hover:bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] rounded-xl text-xs font-bold cursor-pointer transition-colors">
          <Upload size={15} />
          <span>Upload Backup File</span>
          <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
        </label>
      </div>

      {/* About Money Vault Section */}
      <div className="bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)] shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <MoneyVaultLogo variant="mark" size="md" />
            <div>
              <div className="text-base font-black tracking-tight text-[var(--mv-text-primary)]">
                Money Vault
              </div>
              <div className="text-xs font-bold text-[var(--mv-primary)]">
                Secure Your Money. Master Your Future.
              </div>
              <div className="text-[11px] text-[var(--mv-text-muted)] mt-0.5">
                Version 2.5.0 • Personal Financial Organization & Intelligence System
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('tour')}
              className="px-4 py-2 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-primary)] text-[var(--mv-text-primary)] rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Compass size={15} className="text-[var(--mv-primary)]" />
              <span>Take Product Tour</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className="px-4 py-2 bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] hover:bg-[var(--mv-primary)]/25 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles size={15} />
              <span>Money Vault AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time System Diagnostics & Health */}
      <div className="bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)] shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--mv-text-primary)] flex items-center gap-2">
              <Activity size={18} className="text-emerald-400" />
              <span>System Diagnostics & Health Monitor</span>
            </h2>
            <p className="text-xs text-[var(--mv-text-secondary)] mt-0.5">
              Live inspection of Firebase connection, authentication session tokens, and local storage integrity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Activity size={14} />
            <span>{showDiagnostics ? 'Hide Monitor' : 'View Diagnostics'}</span>
          </button>
        </div>

        {showDiagnostics && (
          <div className="pt-2 animate-in fade-in duration-200">
            <DiagnosticDashboard onClose={() => setShowDiagnostics(false)} />
          </div>
        )}
      </div>

      {/* Danger Zone: Clear Data */}
      <div className="bg-rose-500/10 rounded-2xl border border-rose-500/20 p-5 space-y-3">
        <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2">
          <Trash2 size={18} className="text-rose-500" />
          <span>Danger Zone</span>
        </h2>
        <p className="text-xs text-rose-300/80">
          Permanently delete all stored financial records, budgets, loans, and categories from local storage.
        </p>

        {confirmClearOpen ? (
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={async () => {
                await clearAllData();
                setConfirmClearOpen(false);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Yes, Delete Everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmClearOpen(false)}
              className="px-3 py-2 bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] rounded-xl text-xs font-bold hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Reset All Financial Data
          </button>
        )}
      </div>

      {/* Security & Privacy Invariants */}
      <div className="p-4 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] rounded-2xl text-[11px] text-[var(--mv-text-secondary)] space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-[var(--mv-text-primary)]">
          <Lock size={13} className="text-[var(--mv-primary)]" />
          <span>Privacy & Security Invariant</span>
        </div>
        <p>
          Money Vault stores all personal financial information strictly inside your private Firestore partition or
          IndexedDB. No financial records are shared with third parties or advertisers.
        </p>
      </div>
    </div>
  );
};
