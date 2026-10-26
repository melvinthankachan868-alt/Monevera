import React, { useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { Alert, AlertMetric, AlertCondition } from '../types';
import { formatINR } from '../utils/calculations';
import {
  Bell,
  Plus,
  Trash2,
  X,
  Mail,
  ShieldCheck,
  History,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
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

export const AlertsManagerModal: React.FC = () => {
  const {
    user,
    alerts,
    alertHistory,
    addAlert,
    updateAlert,
    deleteAlert,
    alertsModalOpen,
    setAlertsModalOpen,
  } = useFinTraQ();

  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [metric, setMetric] = useState<AlertMetric>('total_monthly_spending');
  const [condition, setCondition] = useState<AlertCondition>('gte');
  const [threshold, setThreshold] = useState<string>('25000');
  const [alertType, setAlertType] = useState<'in_app' | 'email' | 'both'>('in_app');
  const [emailAddress, setEmailAddress] = useState<string>(user?.email || '');
  const [name, setName] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!alertsModalOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const num = parseFloat(threshold);
    if (isNaN(num) || num <= 0) {
      setFormError('Please enter a valid positive threshold number.');
      return;
    }

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
      setIsCreating(false);
      setName('');
      setThreshold('25000');
    } catch (err: any) {
      setFormError(err?.message || 'Error creating alert. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="vault-panel rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[var(--mv-border)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C1A14] border border-[#F4D35E]/30 text-[#F4D35E] flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--mv-text-primary)]">Financial Alerts & Guardrails</h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">Configure spend thresholds and monitor audit history</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAlertsModalOpen(false)}
            className="w-8 h-8 rounded-full bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] hover:bg-[#252B27] flex items-center justify-center text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[var(--mv-border)] px-5 pt-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'rules'
                ? 'border-[var(--mv-primary)] text-[var(--mv-primary)]'
                : 'border-transparent text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
            }`}
          >
            <Bell size={14} />
            <span>Active Alerts ({alerts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-[var(--mv-primary)] text-[var(--mv-primary)]'
                : 'border-transparent text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
            }`}
          >
            <History size={14} />
            <span>Alert History ({alertHistory.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'rules' ? (
            <>
              {!isCreating && (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="btn-primary w-full py-3 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Create New Financial Alert</span>
                </button>
              )}

              {isCreating && (
                <form
                  onSubmit={handleCreate}
                  className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--mv-border)]">
                    <span className="text-xs font-extrabold text-[var(--mv-text-primary)]">New Alert Guardrail</span>
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="text-xs text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                      Alert Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Food budget limit, Low remaining cash"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] placeholder-[#69716B] focus:outline-none focus:border-[var(--mv-primary)]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                        Metric to Monitor
                      </label>
                      <select
                        value={metric}
                        onChange={(e) => setMetric(e.target.value as AlertMetric)}
                        className="w-full px-3 py-2 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)] font-semibold"
                      >
                        {Object.entries(METRIC_LABELS).map(([k, v]) => (
                          <option key={k} value={k} className="bg-[var(--mv-surface)]">
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                        Condition
                      </label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as AlertCondition)}
                        className="w-full px-3 py-2 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)] font-semibold"
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
                      <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                        Threshold {metric === 'goal_progress' ? '(%)' : '(₹)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)] font-bold tabular-nums"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                        Notification Channel
                      </label>
                      <select
                        value={alertType}
                        onChange={(e) => setAlertType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)] font-semibold"
                      >
                        <option value="in_app" className="bg-[var(--mv-surface)]">In-App Notification</option>
                        <option value="email" className="bg-[var(--mv-surface)]">Email Notification</option>
                        <option value="both" className="bg-[var(--mv-surface)]">Both (In-App + Email)</option>
                      </select>
                    </div>
                  </div>

                  {(alertType === 'email' || alertType === 'both') && (
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                        Recipient Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="yourname@gmail.com"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] placeholder-[#69716B] focus:outline-none focus:border-[var(--mv-primary)]"
                        required
                      />
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[11px] text-[var(--mv-text-secondary)] flex items-start gap-2">
                    <ShieldCheck size={16} className="text-[var(--mv-primary)] shrink-0 mt-0.5" />
                    <span>
                      <b className="text-[var(--mv-text-primary)]">Anti-Spam State:</b> This alert will fire once upon threshold crossing. It stays in triggered state until spending falls back into safe bounds, preventing duplicate emails.
                    </span>
                  </div>

                  {formError && (
                    <div className="p-2.5 rounded-xl bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373] text-xs font-semibold">
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-primary w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                  >
                    Save & Arm Alert
                  </button>
                </form>
              )}

              {/* List of Alerts */}
              {alerts.length === 0 && !isCreating ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] mx-auto flex items-center justify-center">
                    <Bell size={24} />
                  </div>
                  <p className="text-xs font-bold text-[var(--mv-text-primary)]">No active alerts configured</p>
                  <p className="text-[11px] text-[var(--mv-text-secondary)] max-w-sm mx-auto">
                    Set up alerts to notify you when spending reaches a specific amount or when emergency funds dip.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.map((al) => {
                    const isTriggered = al.status === 'triggered';
                    return (
                      <div
                        key={al.id}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isTriggered
                            ? 'bg-[#2D1616] border-[#FF7373]/40'
                            : al.enabled
                            ? 'bg-[var(--mv-surface)] border-[var(--mv-border)]'
                            : 'bg-[var(--mv-bg-secondary)] border-[var(--mv-border)] opacity-60'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-[var(--mv-text-primary)]">
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
                          <p className="text-[11px] text-[var(--mv-text-secondary)]">
                            Condition: {METRIC_LABELS[al.metric]} {CONDITION_LABELS[al.condition]}{' '}
                            <b className="text-[var(--mv-text-primary)] tabular-nums">
                              {al.metric === 'goal_progress' ? `${al.threshold}%` : formatINR(al.threshold)}
                            </b>
                          </p>
                          {al.emailAddress && (
                            <span className="text-[10px] text-[var(--mv-text-muted)] flex items-center gap-1">
                              <Mail size={11} /> {al.emailAddress}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateAlert({ ...al, enabled: !al.enabled })}
                            className="p-1.5 text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
                            title={al.enabled ? 'Pause Alert' : 'Enable Alert'}
                          >
                            {al.enabled ? (
                              <ToggleRight size={26} className="text-[var(--mv-primary)]" />
                            ) : (
                              <ToggleLeft size={26} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAlert(al.id)}
                            className="p-1.5 text-[var(--mv-text-muted)] hover:text-[#FF7373] cursor-pointer"
                            title="Delete Alert"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div>
              {alertHistory.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] mx-auto flex items-center justify-center">
                    <History size={24} />
                  </div>
                  <p className="text-xs font-bold text-[var(--mv-text-primary)]">No triggered alert history yet</p>
                  <p className="text-[11px] text-[var(--mv-text-secondary)]">
                    Whenever an active threshold is breached, a verified audit entry is recorded here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#252B27] border border-[var(--mv-border)] rounded-2xl overflow-hidden">
                  {alertHistory.map((hist) => (
                    <div key={hist.id} className="p-3.5 bg-[var(--mv-surface)] flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-[#F4D35E] shrink-0" />
                          <span className="font-extrabold text-[var(--mv-text-primary)]">{hist.alertName}</span>
                        </div>
                        <p className="text-[11px] text-[var(--mv-text-secondary)]">
                          Actual: <b className="text-[var(--mv-text-primary)] tabular-nums">{formatINR(hist.metricValue)}</b> (Threshold: {formatINR(hist.threshold)})
                        </p>
                        <span className="text-[10px] text-[var(--mv-text-muted)] block">
                          Triggered on: {new Date(hist.triggeredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1C1A14] text-[#F4D35E] border border-[#F4D35E]/30">
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

        {/* Footer */}
        <div className="p-4 bg-[var(--mv-bg-secondary)] border-t border-[var(--mv-border)] flex items-center justify-between text-[11px] text-[var(--mv-text-secondary)]">
          <span>State machine: Armed → Triggered → Resolved</span>
          <button
            type="button"
            onClick={() => setAlertsModalOpen(false)}
            className="btn-secondary px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
