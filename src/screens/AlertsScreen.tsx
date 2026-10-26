import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { Alert, AlertMetric, AlertCondition, CategoryType } from '../types';
import { formatINR, formatDisplayDate } from '../utils/calculations';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  ExternalLink,
  Check,
  SlidersHorizontal,
  Plus,
  ShieldCheck,
  History,
  ToggleLeft,
  ToggleRight,
  Mail,
  AlertCircle,
  Calendar,
  DollarSign,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

const METRIC_LABELS: Record<AlertMetric, string> = {
  total_monthly_spending: 'Total Monthly Spending',
  needs_spending: 'Needs Spending',
  wants_spending: 'Wants Spending',
  food_spending: 'Food & Dining Spending',
  travel_spending: 'Travel & Fuel Spending',
  subscription_spending: 'Subscriptions Spending',
  savings_balance: 'Savings Balance',
  investment_value: 'Investment Portfolio Value',
  remaining_budget: 'Remaining Monthly Budget',
  goal_progress: 'Financial Goal Progress %',
  large_expense: 'Large Single Expense',
  unusual_spending: 'Unusual Spending Spike',
  low_balance: 'Low Cash Balance',
};

const CONDITION_LABELS: Record<AlertCondition, string> = {
  gte: 'is greater than or equal to (≥)',
  gt: 'is greater than (>)',
  lte: 'is less than or equal to (≤)',
  lt: 'is less than (<)',
  eq: 'is equal to (=)',
  pct_exceeds: 'percentage exceeds (≥ %)',
};

export const AlertsScreen: React.FC = () => {
  const {
    user,
    notifications,
    markNotificationRead,
    resolveNotification,
    clearAllNotifications,
    alerts,
    alertHistory,
    addAlert,
    updateAlert,
    deleteAlert,
    setActiveTab,
    selectedMonth,
  } = useFinTraQ();

  const [activeMainTab, setActiveMainTab] = useState<'notifications' | 'rules' | 'history'>('notifications');
  const [notifFilter, setNotifFilter] = useState<'all' | 'today' | 'overdue' | 'resolved'>('all');
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [metric, setMetric] = useState<AlertMetric>('total_monthly_spending');
  const [condition, setCondition] = useState<AlertCondition>('gte');
  const [threshold, setThreshold] = useState('25000');
  const [alertType, setAlertType] = useState<'in_app' | 'email' | 'both'>('in_app');
  const [emailAddress, setEmailAddress] = useState(user?.email || '');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'resolved') return n.resolved;
    if (notifFilter === 'overdue') return n.title.toLowerCase().includes('overdue');
    if (notifFilter === 'today') return n.dueDate === todayStr;
    return !n.resolved;
  });

  const handleOpenRelated = (item: any) => {
    if (item.relatedRecordType === 'moneyOwed') {
      setActiveTab('money_owed');
    } else if (item.relatedRecordType === 'loan') {
      setActiveTab('loans');
    } else if (item.relatedRecordType === 'bill' || item.relatedRecordType === 'subscription') {
      setActiveTab('reminders');
    } else if (item.relatedRecordType === 'emergencyFund') {
      setActiveTab('emergency_fund');
    } else {
      setActiveTab('expenses');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      await markNotificationRead(n.id);
    }
    showFeedback('All notifications marked as read.');
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    const num = parseFloat(threshold);
    if (isNaN(num) || num <= 0) {
      setFormError('Please enter a valid positive threshold number.');
      return;
    }

    if ((alertType === 'email' || alertType === 'both') && !emailAddress.trim()) {
      setFormError('Please provide a valid recipient email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAlert({
        name: name.trim() || `${METRIC_LABELS[metric]} Threshold`,
        metric,
        condition,
        threshold: num,
        alertType,
        emailAddress: emailAddress.trim() || undefined,
        enabled: true,
        cooldownHours: 24,
        status: 'armed',
        updatedAt: Date.now(),
      });
      setIsCreatingAlert(false);
      setName('');
      setThreshold('25000');
      showFeedback('New financial alert created and armed.');
    } catch (err: any) {
      setFormError(err?.message || 'Error creating alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAlert = async (al: Alert) => {
    await updateAlert({ ...al, enabled: !al.enabled });
    showFeedback(`Alert "${al.name}" ${al.enabled ? 'paused' : 'armed'}.`);
  };

  const handleDeleteAlert = async (id: string, alertName: string) => {
    await deleteAlert(id);
    showFeedback(`Alert "${alertName}" removed.`);
  };

  const activeUnresolvedCount = notifications.filter((n) => !n.resolved).length;
  const activeAlertRulesCount = alerts.filter((a) => a.enabled).length;

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Toast Feedback */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--mv-text-primary)] tracking-tight flex items-center gap-2">
              <Bell className="text-[var(--mv-primary)]" size={28} />
              <span>Alert Center &amp; Guardrails</span>
            </h1>
            <span className="text-[10px] font-bold text-[var(--mv-primary)] bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 px-2.5 py-0.5 rounded-full">
              Automated Guardrails
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] mt-1">
            Real-time notifications, payment due reminders, overdue escalations, and automated spend thresholds.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center p-1 bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-2xl self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMainTab('notifications')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === 'notifications'
                ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-sm font-black'
                : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
            }`}
          >
            <Bell size={14} />
            <span>Notifications ({activeUnresolvedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('rules')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === 'rules'
                ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-sm font-black'
                : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Alert Rules ({alerts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === 'history'
                ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-sm font-black'
                : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
            }`}
          >
            <History size={14} />
            <span>Trigger Audit ({alertHistory.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          1. NOTIFICATIONS TAB
      ======================================================== */}
      {activeMainTab === 'notifications' && (
        <div className="vault-panel rounded-3xl border border-[var(--mv-border)] p-5 sm:p-6 space-y-4">
          {/* Subfilters bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--mv-border)]">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'all', label: `Active (${activeUnresolvedCount})` },
                { id: 'today', label: 'Due Today' },
                { id: 'overdue', label: 'Overdue' },
                { id: 'resolved', label: `Resolved (${notifications.filter((n) => n.resolved).length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setNotifFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    notifFilter === tab.id
                      ? 'bg-[var(--mv-surface-elevated)] border border-[var(--mv-primary)] text-[var(--mv-primary)] font-black'
                      : 'bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {notifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] hover:border-[var(--mv-primary)] text-[var(--mv-primary)] transition-colors cursor-pointer"
                >
                  Mark All Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Clear all notification history"
                >
                  <Trash2 size={13} />
                  <span>Clear History</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">All clear!</h3>
                <p className="text-xs text-[var(--mv-text-secondary)]">No active notifications matching this view.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isOverdue = item.title.toLowerCase().includes('overdue');
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      item.resolved
                        ? 'bg-[var(--mv-bg-secondary)] border-[var(--mv-border)] opacity-60'
                        : isOverdue
                        ? 'bg-[#2D1616] border-[#FF7373]/30'
                        : 'vault-card border-[var(--mv-border)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[var(--mv-text-primary)] text-sm">{item.title}</span>
                          {!item.read && !item.resolved && (
                            <span className="w-2 h-2 rounded-full bg-[var(--mv-primary)] animate-pulse" />
                          )}
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isOverdue
                                ? 'bg-[#2D1616] text-[#FF7373] border border-[#FF7373]/30'
                                : 'bg-[var(--mv-surface-elevated)] text-[var(--mv-text-secondary)] border border-[var(--mv-border)]'
                            }`}
                          >
                            {item.channel === 'both' ? 'In-App + Email' : 'In-App'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--mv-text-secondary)]">{item.reason}</p>
                      </div>

                      {item.amount !== undefined && (
                        <span className="font-extrabold text-[var(--mv-text-primary)] text-sm tabular-nums shrink-0">
                          {formatINR(item.amount)}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--mv-border)] text-xs">
                      <span className="text-[11px] text-[var(--mv-text-muted)]">
                        {new Date(item.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">
                        {item.relatedRecordType && (
                          <button
                            type="button"
                            onClick={() => handleOpenRelated(item)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--mv-primary)]/10 hover:bg-[var(--mv-primary)]/20 text-[var(--mv-primary)] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Open Record</span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--mv-bg-secondary)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] font-bold cursor-pointer transition-colors"
                          >
                            Mark as Read
                          </button>
                        )}
                        {!item.resolved && (
                          <button
                            type="button"
                            onClick={() => resolveNotification(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 font-bold cursor-pointer transition-colors"
                          >
                            Mark as Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          2. ALERT RULES & GUARDRAILS TAB
      ======================================================== */}
      {activeMainTab === 'rules' && (
        <div className="vault-panel rounded-3xl border border-[var(--mv-border)] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--mv-border)]">
            <div>
              <h2 className="text-base font-extrabold text-[var(--mv-text-primary)]">Custom Threshold Guardrails</h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">Automated boundary monitors that track spending spikes and low balances</p>
            </div>

            {!isCreatingAlert && (
              <button
                type="button"
                onClick={() => setIsCreatingAlert(true)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-md hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus size={15} />
                <span>Create New Alert</span>
              </button>
            )}
          </div>

          {/* Form */}
          {isCreatingAlert && (
            <form
              onSubmit={handleCreateAlert}
              className="p-5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--mv-border)]">
                <span className="text-xs font-extrabold text-[var(--mv-text-primary)]">New Guardrail Configuration</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingAlert(false)}
                  className="text-xs text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--mv-text-secondary)] block mb-1">
                  Alert Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Food Limit, Low Cash Reserve"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] placeholder-[var(--mv-text-muted)] focus:outline-none focus:border-[var(--mv-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] block mb-1">
                    Metric to Monitor
                  </label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as AlertMetric)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)] font-semibold"
                  >
                    {Object.entries(METRIC_LABELS).map(([k, v]) => (
                      <option key={k} value={k} className="bg-[var(--mv-surface)]">
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] block mb-1">
                    Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as AlertCondition)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)] font-semibold"
                  >
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                      <option key={k} value={k} className="bg-[var(--mv-surface)]">
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] block mb-1">
                    Threshold {metric === 'goal_progress' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)] font-bold tabular-nums"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] block mb-1">
                    Notification Channel
                  </label>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)] font-semibold"
                  >
                    <option value="in_app" className="bg-[var(--mv-surface)]">In-App Notification</option>
                    <option value="email" className="bg-[var(--mv-surface)]">Email Notification</option>
                    <option value="both" className="bg-[var(--mv-surface)]">Both (In-App + Email)</option>
                  </select>
                </div>
              </div>

              {(alertType === 'email' || alertType === 'both') && (
                <div>
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] block mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] placeholder-[var(--mv-text-muted)] focus:outline-none focus:border-[var(--mv-primary)]"
                    required
                  />
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-xs text-[var(--mv-text-secondary)] flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-[var(--mv-primary)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--mv-text-primary)]">Anti-Spam Safeguard:</strong> This alert fires once upon threshold breach. It remains in triggered status until spending re-stabilizes, preventing email inundation.
                </span>
              </div>

              {formError && (
                <div className="p-3 bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373] text-xs font-semibold rounded-xl">
                  {formError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingAlert(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[var(--mv-primary)] hover:brightness-110 disabled:opacity-50 text-white dark:text-[#0B0D0C] rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Arm Alert'}
                </button>
              </div>
            </form>
          )}

          {/* Alert Cards */}
          <div className="space-y-3">
            {alerts.length === 0 && !isCreatingAlert ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] mx-auto flex items-center justify-center">
                  <Bell size={24} />
                </div>
                <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">No custom alerts configured</h3>
                <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
                  Add guardrails to receive warnings when your monthly spending crosses limits.
                </p>
              </div>
            ) : (
              alerts.map((al) => {
                const isTriggered = al.status === 'triggered';
                return (
                  <div
                    key={al.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isTriggered
                        ? 'bg-[#2D1616] border-[#FF7373]/40'
                        : al.enabled
                        ? 'bg-[var(--mv-surface)] border-[var(--mv-border)]'
                        : 'bg-[var(--mv-bg-secondary)] border-[var(--mv-border)] opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-[var(--mv-text-primary)]">
                          {al.name || METRIC_LABELS[al.metric]}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isTriggered
                              ? 'bg-[var(--mv-danger)]/15 text-[var(--mv-danger)] border border-[var(--mv-danger)]/30'
                              : al.enabled
                              ? 'bg-[var(--mv-income)]/15 text-[var(--mv-income)] border border-[var(--mv-income)]/30'
                              : 'bg-[var(--mv-surface-elevated)] text-[var(--mv-text-secondary)] border border-[var(--mv-border)]'
                          }`}
                        >
                          {isTriggered ? 'Triggered' : al.enabled ? 'Armed' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--mv-text-secondary)]">
                        Condition: {METRIC_LABELS[al.metric]} {CONDITION_LABELS[al.condition]}{' '}
                        <b className="text-[var(--mv-text-primary)] tabular-nums">
                          {al.metric === 'goal_progress' ? `${al.threshold}%` : formatINR(al.threshold)}
                        </b>
                      </p>
                      {al.emailAddress && (
                        <span className="text-[11px] text-[var(--mv-text-muted)] flex items-center gap-1">
                          <Mail size={12} /> {al.emailAddress}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleAlert(al)}
                        className="p-1.5 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
                        title={al.enabled ? 'Pause Alert' : 'Enable Alert'}
                      >
                        {al.enabled ? (
                          <ToggleRight size={28} className="text-[var(--mv-primary)]" />
                        ) : (
                          <ToggleLeft size={28} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAlert(al.id, al.name || METRIC_LABELS[al.metric])}
                        className="p-2 text-[var(--mv-text-muted)] hover:text-[#FF7373] hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Delete Alert"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          3. AUDIT HISTORY TAB
      ======================================================== */}
      {activeMainTab === 'history' && (
        <div className="vault-panel rounded-3xl border border-[var(--mv-border)] p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-[var(--mv-border)]">
            <h2 className="text-base font-extrabold text-[var(--mv-text-primary)]">Trigger Audit Trail</h2>
            <p className="text-xs text-[var(--mv-text-secondary)]">Every breach event is logged immutably with full trigger metrics</p>
          </div>

          {alertHistory.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <History size={36} className="text-[var(--mv-text-muted)] mx-auto" />
              <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">No alert trigger history yet</h3>
              <p className="text-xs text-[var(--mv-text-secondary)]">When an active threshold is exceeded, a permanent audit record is created.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--mv-border)] border border-[var(--mv-border)] rounded-2xl overflow-hidden">
              {alertHistory.map((hist) => (
                <div key={hist.id} className="p-4 bg-[var(--mv-surface)] flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="text-[#F4D35E] shrink-0" />
                      <span className="font-extrabold text-[var(--mv-text-primary)] text-sm">{hist.alertName}</span>
                    </div>
                    <p className="text-xs text-[var(--mv-text-secondary)]">
                      Actual Metric: <b className="text-[var(--mv-text-primary)] tabular-nums">{formatINR(hist.metricValue)}</b> (Threshold: {formatINR(hist.threshold)})
                    </p>
                    <span className="text-[11px] text-[var(--mv-text-muted)] block">
                      Triggered: {new Date(hist.triggeredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1C1A14] text-[#F4D35E] border border-[#F4D35E]/30">
                      {hist.notificationStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
