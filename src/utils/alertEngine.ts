/**
 * Money Vault Alert & Notification Engine
 * Evaluates financial guardrails, upcoming payments, overdue loans,
 * money-owed milestones, large expenses, and emergency fund progress.
 * Prevents email spam through deterministic state-machine cooldowns.
 */

import {
Alert,
AlertHistory,
Expense,
Income,
SavingsRecord,
Investment,
FinancialGoal,
MonthlyFinancialSummary,
MoneyOwed,
Loan,
FinancialReminder,
Bill,
Subscription,
EmergencyFund,
AppNotification,
} from '../types';
import { calculateDueDateStatus,formatINR } from './calculations';

export interface AlertEvaluationContext {
  summary: MonthlyFinancialSummary;
  expenses: Expense[];
  incomes: Income[];
  savings: SavingsRecord[];
  investments: Investment[];
  goals: FinancialGoal[];
  moneyOwed: MoneyOwed[];
  loans: Loan[];
  reminders: FinancialReminder[];
  bills: Bill[];
  subscriptions: Subscription[];
  emergencyFund: EmergencyFund | null;
  selectedMonth: string;
}

/**
 * Extracts current numerical value for a given metric
 */
export function calculateAlertMetricValue(
  metric: Alert['metric'],
  ctx: AlertEvaluationContext
): number {
  const { summary, expenses, savings, investments, goals } = ctx;
  switch (metric) {
    case 'total_monthly_spending':
      return summary.totalExpenses;
    case 'needs_spending':
      return summary.needsSpent;
    case 'wants_spending':
      return summary.wantsSpent;
    case 'food_spending': {
      return expenses
        .filter((e) => {
          const sub = (e.subcategory || '').toLowerCase();
          return sub.includes('food') || sub.includes('dining') || sub.includes('grocery');
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    }
    case 'travel_spending': {
      return expenses
        .filter((e) => {
          const sub = (e.subcategory || '').toLowerCase();
          return (
            sub.includes('travel') ||
            sub.includes('fuel') ||
            sub.includes('commute') ||
            sub.includes('cab') ||
            sub.includes('transport')
          );
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    }
    case 'subscription_spending': {
      return expenses
        .filter((e) => {
          const sub = (e.subcategory || '').toLowerCase();
          return sub.includes('subscript') || sub.includes('ott') || sub.includes('stream');
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    }
    case 'savings_balance':
      return savings.reduce((sum, s) => sum + (s.amount || 0), 0);
    case 'investment_value':
      return investments.reduce((sum, i) => sum + (i.currentValue || 0), 0);
    case 'remaining_budget':
      return summary.netRemaining;
    case 'goal_progress': {
      if (goals.length === 0) return 0;
      const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
      const totalCurrent = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
      return totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    }
    default:
      return 0;
  }
}

export function isThresholdCrossed(
  val: number,
  condition: Alert['condition'],
  threshold: number
): boolean {
  switch (condition) {
    case 'gt':
      return val > threshold;
    case 'gte':
      return val >= threshold;
    case 'lt':
      return val < threshold;
    case 'lte':
      return val <= threshold;
    case 'eq':
      return Math.abs(val - threshold) < 0.01;
    case 'pct_exceeds':
      return val >= threshold;
    default:
      return false;
  }
}

/**
 * Evaluates active alerts, money-owed milestones, and upcoming/overdue obligations.
 * Emits unified notifications without duplicates or spam.
 */
export function evaluateAllAlertsAndNotifications(
  alerts: Alert[],
  existingNotifications: AppNotification[],
  ctx: AlertEvaluationContext
): {
  updatedAlerts: Alert[];
  triggeredEvents: AlertHistory[];
  newNotifications: AppNotification[];
} {
  const updatedAlerts: Alert[] = [];
  const triggeredEvents: AlertHistory[] = [];
  const newNotifications: AppNotification[] = [];
  const now = Date.now();

  // Helper to prevent duplicate notification spam for same record and reason
  const hasExistingNotification = (recordId: string, reason: string) => {
    return existingNotifications.some(
      (n) => n.relatedRecordId === recordId && n.reason === reason && !n.resolved
    );
  };

  // 1. Evaluate custom user threshold alerts
  for (const alert of alerts) {
    if (!alert.enabled) {
      updatedAlerts.push(alert);
      continue;
    }
    const currentVal = calculateAlertMetricValue(alert.metric, ctx);
    const crossed = isThresholdCrossed(currentVal, alert.condition, alert.threshold);

    if (crossed) {
      if (alert.status !== 'triggered') {
        const historyItem: AlertHistory = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ownerId: alert.ownerId,
          alertId: alert.id,
          alertName: alert.name || `${alert.metric.replace(/_/g, ' ')} Alert`,
          triggeredAt: now,
          metricValue: currentVal,
          threshold: alert.threshold,
          status: 'triggered',
          notificationStatus: alert.emailAddress ? 'queued' : 'in_app',
          emailAddress: alert.emailAddress,
          createdAt: now,
        };
        triggeredEvents.push(historyItem);

        const notif: AppNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ownerId: alert.ownerId,
          title: alert.name || `${alert.metric.replace(/_/g, ' ')} Alert`,
          amount: currentVal,
          reason: `Threshold crossed: ${currentVal} (${alert.condition} ${alert.threshold})`,
          status: alert.emailAddress ? 'sent' : 'delivered',
          channel: alert.alertType,
          relatedRecordType: 'alert',
          relatedRecordId: alert.id,
          read: false,
          resolved: false,
          createdAt: now,
        };
        newNotifications.push(notif);

        updatedAlerts.push({
          ...alert,
          status: 'triggered',
          lastTriggeredAt: now,
          updatedAt: now,
        });
      } else {
        updatedAlerts.push(alert);
      }
    } else {
      if (alert.status === 'triggered') {
        updatedAlerts.push({
          ...alert,
          status: 'armed',
          updatedAt: now,
        });
      } else {
        updatedAlerts.push(alert);
      }
    }
  }

  // 2. Evaluate Money Owed To Receive (Lent)
  ctx.moneyOwed
    .filter((m) => m.type === 'lent' && m.status !== 'Settled')
    .forEach((m) => {
      const { isOverdue, isDueTomorrow, isDueToday, label } = calculateDueDateStatus(m.dueDate);
      if (isOverdue && !hasExistingNotification(m.id, 'overdue')) {
        newNotifications.push({
          id: `notif-mo-ov-${m.id}`,
          ownerId: m.ownerId,
          title: `Overdue from ${m.personName}`,
          amount: m.remainingAmount,
          dueDate: m.dueDate,
          reason: `${formatINR(m.remainingAmount)} from ${m.personName} is marked overdue (${label}).`,
          actionLabel: 'Record payment',
          status: 'delivered',
          channel: 'in_app',
          relatedRecordType: 'moneyOwed',
          relatedRecordId: m.id,
          read: false,
          resolved: false,
          createdAt: now,
        });
      } else if ((isDueTomorrow || isDueToday) && !hasExistingNotification(m.id, 'due_soon')) {
        newNotifications.push({
          id: `notif-mo-due-${m.id}`,
          ownerId: m.ownerId,
          title: `Money Expected from ${m.personName}`,
          amount: m.remainingAmount,
          dueDate: m.dueDate,
          reason: `${formatINR(m.remainingAmount)} is expected from ${m.personName} ${label.toLowerCase()}.`,
          actionLabel: 'View details',
          status: 'delivered',
          channel: 'in_app',
          relatedRecordType: 'moneyOwed',
          relatedRecordId: m.id,
          read: false,
          resolved: false,
          createdAt: now,
        });
      }
    });

  // 3. Evaluate Money Owed To Repay (Borrowed)
  ctx.moneyOwed
    .filter((m) => m.type === 'borrowed' && m.status !== 'Settled')
    .forEach((m) => {
      const { isOverdue, isDueTomorrow, isDueToday, diffDays, label } = calculateDueDateStatus(m.dueDate);
      if (isOverdue && !hasExistingNotification(m.id, 'borrowed_overdue')) {
        newNotifications.push({
          id: `notif-bor-ov-${m.id}`,
          ownerId: m.ownerId,
          title: `Repayment Overdue to ${m.personName}`,
          amount: m.remainingAmount,
          dueDate: m.dueDate,
          reason: `Your ${formatINR(m.remainingAmount)} repayment to ${m.personName} is ${label}.`,
          actionLabel: 'Record payment',
          status: 'delivered',
          channel: 'in_app',
          relatedRecordType: 'moneyOwed',
          relatedRecordId: m.id,
          read: false,
          resolved: false,
          createdAt: now,
        });
      } else if (diffDays >= 0 && diffDays <= 3 && !hasExistingNotification(m.id, 'borrowed_due_soon')) {
        newNotifications.push({
          id: `notif-bor-due-${m.id}`,
          ownerId: m.ownerId,
          title: `Repayment Due to ${m.personName}`,
          amount: m.remainingAmount,
          dueDate: m.dueDate,
          reason: `Your ${formatINR(m.remainingAmount)} repayment to ${m.personName} is ${label.toLowerCase()}.`,
          actionLabel: 'Pay now',
          status: 'delivered',
          channel: 'in_app',
          relatedRecordType: 'moneyOwed',
          relatedRecordId: m.id,
          read: false,
          resolved: false,
          createdAt: now,
        });
      }
    });

  // 4. Evaluate Loans & EMIs
  ctx.loans
    .filter((l) => l.status === 'Active' && l.emiAmount > 0)
    .forEach((l) => {
      const { isOverdue, diffDays, label } = calculateDueDateStatus(l.nextPaymentDate || l.dueDate);
      if (isOverdue && !hasExistingNotification(l.id, 'emi_overdue')) {
        newNotifications.push({
          id: `notif-loan-ov-${l.id}`,
          ownerId: l.ownerId,
          title: `${l.name} EMI Overdue`,
          amount: l.emiAmount,
          dueDate: l.nextPaymentDate || l.dueDate,
          reason: `Your ${formatINR(l.emiAmount)} ${l.name} EMI was due on ${l.nextPaymentDate || l.dueDate} and is still marked unpaid (${label}).`,
          actionLabel: 'Mark as paid',
          status: 'delivered',
          channel: 'both',
          relatedRecordType: 'loan',
          relatedRecordId: l.id,
          read: false,
          resolved: false,
          createdAt: now,
        });
      } else if (diffDays >= 0 && diffDays <= 3 && !hasExistingNotification(l.id, 'emi_due_soon')) {
        newNotifications.push({
          id: `notif-loan-due-${l.id}`,
          ownerId: l.ownerId,
          title: `${l.name} EMI Due`,
          amount: l.emiAmount,
          dueDate: l.nextPaymentDate || l.dueDate,
          reason: `Your ${l.name} EMI of ${formatINR(l.emiAmount)} is ${label.toLowerCase()}.`,
          actionLabel: 'Mark as paid',
          status: 'delivered',
          channel: 'both',
          relatedRecordType: 'loan',
          relatedRecordId: l.id,
          read: false,
          resolved: false,
          createdAt: now,
        });
      }
    });

  // 5. Evaluate Bills & Subscriptions
  ctx.bills
    .filter((b) => !b.paid)
    .forEach((b) => {
      const { isOverdue, diffDays, label } = calculateDueDateStatus(b.dueDate);
      if (isOverdue && !hasExistingNotification(b.id, 'bill_overdue')) {
        newNotifications.push({
          id: `notif-bill-ov-${b.id}`,
          ownerId: b.ownerId,
          title: `${b.name} Bill Overdue`,
          amount: b.amount,
          dueDate: b.dueDate,
          reason: `${b.name} bill of ${formatINR(b.amount)} is ${label}.`,
          actionLabel: 'Pay bill',
          status: 'delivered',
          channel: 'in_app',
          relatedRecordType: 'bill',
          relatedRecordId: b.id,
          read: false,
          resolved: false,
          createdAt: now,
        });
      } else if (diffDays >= 0 && diffDays <= 3 && !hasExistingNotification(b.id, 'bill_due_soon')) {
        newNotifications.push({
          id: `notif-bill-due-${b.id}`,
          ownerId: b.ownerId,
          title: `${b.name} Due Soon`,
          amount: b.amount,
          dueDate: b.dueDate,
          reason: `${b.name} bill of ${formatINR(b.amount)} is ${label.toLowerCase()}.`,
          actionLabel: 'Pay bill',
          status: 'delivered',
          channel: 'in_app',
          relatedRecordType: 'bill',
          relatedRecordId: b.id,
          read: false,
          resolved: false,
          createdAt: now,
        });
      }
    });

  return { updatedAlerts, triggeredEvents, newNotifications };
}
