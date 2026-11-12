import React,{ useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { MoneyVaultLogo } from '../components/MoneyVaultLogo';
import {
ShieldCheck,
ArrowRight,
ArrowLeft,
CheckCircle2,
TrendingUp,
Receipt,
PiggyBank,
Wallet,
Sparkles,
CreditCard,
CalendarCheck
} from 'lucide-react';

interface TourStep {
  id: number;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  keyMetric: {
    label: string;
    value: string;
    sublabel: string;
  };
  icon: React.ElementType;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    badge: 'FOUNDATION',
    badgeColor: 'text-[#A8F34A] bg-[#A8F34A]/10 border-[#A8F34A]/30',
    title: 'Secure Your Money. Master Your Future.',
    subtitle: 'A private, uncompromising financial organization system designed for real life.',
    description:
      'Money Vault operates with mathematical precision. Every rupee is categorized, accounted for, and protected. We use local-first IndexedDB storage coupled with Google Cloud Firestore synchronization — meaning your records are private, reliable, and completely under your control.',
    highlights: [
      'Zero demo or mock clutter — only your authentic financial data',
      'Dual-layer persistence: Private local storage + Cloud Firestore sync',
      'Zero third-party tracking, ad scraping, or data sales',
    ],
    keyMetric: {
      label: 'Security & Integrity',
      value: '100% Private',
      sublabel: 'Grounded exclusively in your real records',
    },
    icon: ShieldCheck,
  },
  {
    id: 2,
    badge: 'INFLOW MASTERY',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    title: 'Dissect Inflow: Salary, Allowances & Bonuses',
    subtitle: 'Never confuse one-off windfalls with your core predictable baseline.',
    description:
      'Many budgeting tools lump all incoming money into one pile. Money Vault strictly separates regular base monthly salary, recurring reimbursements (travel, food, medical), and periodic performance bonuses so your financial baseline is always crystal clear.',
    highlights: [
      'Base monthly salary establishing steady disposable income',
      'Recurring allowances tagged with reimbursement schedules',
      'Festival, performance, and referral bonuses tracked separately',
    ],
    keyMetric: {
      label: 'Cash Flow Purity',
      value: 'Granular Inflow',
      sublabel: 'Salary vs Allowances vs Bonuses',
    },
    icon: Receipt,
  },
  {
    id: 3,
    badge: 'BUDGET CONTROL',
    badgeColor: 'text-lime-400 bg-lime-500/10 border-lime-500/30',
    title: 'Automated 50 / 30 / 20 Budget Guidelines',
    subtitle: 'Dynamic allocation rules that flex as your real life demands.',
    description:
      'Money Vault groups your daily spending into Needs (50%), Wants (30%), and Savings (20%). If you prefer a custom split like 60/20/20 or 70/20/10, adjust the sliders anytime. Live visual health meters notify you before you breach a threshold.',
    highlights: [
      'Needs (Rent, Groceries, Utilities, Healthcare, EMIs)',
      'Wants (Dining out, Shopping, Entertainment, Travel, Hobbies)',
      'Savings & Investments (20% minimum target automatically enforced)',
    ],
    keyMetric: {
      label: 'Recommended Guideline',
      value: '50 / 30 / 20',
      sublabel: 'Needs • Wants • Savings',
    },
    icon: PiggyBank,
  },
  {
    id: 4,
    badge: 'SAFETY NET',
    badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    title: 'Savings Vault & Dedicated Emergency Net',
    subtitle: 'Liquid capital runway calculated from real essential expenditures.',
    description:
      'Your Emergency Safety Net is deliberately separate from ordinary savings and investment accounts. Money Vault calculates your dynamic target by multiplying your actual recorded essential monthly expenses by your desired target months (typically 3 to 12 months).',
    highlights: [
      'Automated runway calculation: Months covered with current liquid reserves',
      'Itemized contribution logs & withdrawal audit trail',
      'Savings Vault for fixed deposits, recurring deposits, and cash reserves',
    ],
    keyMetric: {
      label: 'Target Runway',
      value: '3 – 12 Months',
      sublabel: 'Essential monthly expenses covered',
    },
    icon: Wallet,
  },
  {
    id: 5,
    badge: 'CAPITAL GROWTH',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    title: 'Investment Portfolio & Asset Tracking',
    subtitle: 'Track cost basis vs current valuation with zero expense inflation.',
    description:
      'When you invest in Mutual Funds, Equities, Gold, Fixed Deposits, or Real Estate, your money is not an expense — it is an asset acquisition. Money Vault maintains a dedicated portfolio with real-time gain/loss tracking, allocation percentages, and units held.',
    highlights: [
      'Supported asset classes: Mutual Funds, Stocks, ETFs, Gold, FDs, Crypto, Bonds',
      'Tracks Invested Cost Basis vs Current Marked Value',
      'Net unrealized gain/loss calculation across your whole portfolio',
    ],
    keyMetric: {
      label: 'Portfolio Delta',
      value: 'Gain / Loss %',
      sublabel: 'Marked to value with full historical cost basis',
    },
    icon: TrendingUp,
  },
  {
    id: 6,
    badge: 'OBLIGATIONS',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    title: 'Money Lent, Borrowed & Loan EMIs',
    subtitle: 'Transparent informal lending and structured bank liabilities.',
    description:
      'Keep your relationships clean and your credit score spotless. Track money lent to friends ("Money to Receive") and informal borrowings ("Money to Repay") with itemized partial repayment histories, alongside bank loans, vehicle installments, and cards.',
    highlights: [
      'Money lent to others is recorded as a receivable, never an expense',
      'Bank EMIs and amortization schedules with due date reminders',
      'Partial settlement tracking with full ledger audit trails',
    ],
    keyMetric: {
      label: 'Liability Balance',
      value: 'Zero Confusion',
      sublabel: 'Money to Receive vs Money to Repay',
    },
    icon: CreditCard,
  },
  {
    id: 7,
    badge: 'DUE CALENDAR',
    badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    title: 'Scheduled Bills & Subscription Tracking',
    subtitle: 'Chronological timeline ensuring zero late payment penalties.',
    description:
      'Keep track of utility bills (electricity, water, broadband, rent) and recurring digital subscriptions (Netflix, Spotify, cloud storage, memberships). Money Vault displays an interactive Due Calendar and chronological upcoming queues for the next 30 days.',
    highlights: [
      'Proactive reminders 3, 2, or 1 day before due dates',
      'Recurring service cost projections: Monthly and Annual commitment totals',
      'One-click mark-as-paid with automatic recurrence rolling to next month',
    ],
    keyMetric: {
      label: 'Next 30 Days',
      value: 'Chronological',
      sublabel: 'Upcoming, Due Today, and Overdue statuses',
    },
    icon: CalendarCheck,
  },
  {
    id: 8,
    badge: 'INTELLIGENCE',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    title: 'Money Vault AI & Audit-Ready Reports',
    subtitle: 'Grounded financial reasoning and multi-page printable statements.',
    description:
      'Money Vault AI is powered by Google Gemini and answers your questions based EXCLUSIVELY on your real financial records — never hallucinating or giving generic fluff. Plus, generate formal, audit-ready PDF Financial Statements anytime for visa applications, loans, or personal reviews.',
    highlights: [
      'Money Vault AI analyzes budgets, loans, and cash flow directly from your data',
      'Complete multi-page audit-ready PDF Financial Statement generator',
      'JSON Backup export & restore for total device portability',
    ],
    keyMetric: {
      label: 'Intelligence Engine',
      value: 'Money Vault AI',
      sublabel: 'Audit-ready PDF statements + Private AI guide',
    },
    icon: Sparkles,
  },
];

export const TourScreen: React.FC = () => {
  const { setActiveTab, setOnboardingOpen, settings, updateSettings } = useFinTraQ();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = TOUR_STEPS[currentStepIndex];
  const totalSteps = TOUR_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    try {
      await updateSettings({ onboardingCompleted: true });
    } catch (e) {
      console.warn('Could not persist onboarding flag:', e);
    }
    setActiveTab('home');
  };

  const StepIcon = step.icon;

  return (
    <div className="min-h-full py-4 sm:py-8 space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Top Brand Bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <MoneyVaultLogo variant="mark" size="sm" />
          <div>
            <div className="text-sm font-black tracking-tight text-[var(--mv-text-primary)]">
              MONEY VAULT
            </div>
            <div className="text-[10px] font-semibold text-[var(--mv-text-muted)] tracking-wider uppercase">
              Secure Your Money. Master Your Future.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFinish}
          className="text-xs font-bold text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] transition-colors px-3 py-1.5 rounded-xl hover:bg-[var(--mv-surface-hover)] cursor-pointer"
        >
          Skip Tour
        </button>
      </div>

      {/* Progress & Step Navigation Pills */}
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-[var(--mv-text-secondary)]">
            Step {step.id} of {totalSteps} • <span className="text-[var(--mv-text-primary)]">{step.title}</span>
          </span>
          <span className="text-[var(--mv-primary)] tabular-nums">{progressPercent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[var(--mv-bg-secondary)] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[var(--mv-primary)] h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Clickable Step Pills */}
        <div className="grid grid-cols-8 gap-1.5 pt-1">
          {TOUR_STEPS.map((s, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer text-center truncate ${
                  isCurrent
                    ? 'bg-[var(--mv-primary)] text-[#0B0D0C] shadow-xs'
                    : isCompleted
                    ? 'bg-[var(--mv-surface-hover)] text-[var(--mv-text-primary)] border border-[var(--mv-border)]'
                    : 'bg-[var(--mv-bg-secondary)] text-[var(--mv-text-muted)] hover:text-[var(--mv-text-secondary)]'
                }`}
                title={`Step ${s.id}: ${s.title}`}
              >
                {s.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tour Card */}
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Step Badge & Icon Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] text-[var(--mv-primary)] flex items-center justify-center shrink-0 shadow-sm">
              <StepIcon size={24} />
            </div>
            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border mb-1 ${step.badgeColor}`}
              >
                {step.badge}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--mv-text-primary)] tracking-tight">
                {step.title}
              </h1>
            </div>
          </div>

          {/* Quick Stat Pill */}
          <div className="p-3 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border-subtle)] rounded-2xl text-right sm:min-w-[180px]">
            <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider block">
              {step.keyMetric.label}
            </span>
            <span className="text-base font-black text-[var(--mv-primary)] block tabular-nums">
              {step.keyMetric.value}
            </span>
            <span className="text-[10px] text-[var(--mv-text-secondary)] block mt-0.5">
              {step.keyMetric.sublabel}
            </span>
          </div>
        </div>

        {/* Subtitle & Body */}
        <div className="space-y-3 border-t border-[var(--mv-border-subtle)] pt-5">
          <h2 className="text-sm font-bold text-[var(--mv-text-primary)]">
            {step.subtitle}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--mv-text-secondary)] leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Highlights Checklist */}
        <div className="space-y-2.5 bg-[var(--mv-bg-secondary)] p-4 sm:p-5 rounded-2xl border border-[var(--mv-border-subtle)]">
          <span className="text-[11px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider block">
            Money Vault Architecture Invariants:
          </span>
          {step.highlights.map((highlight, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--mv-text-primary)]">
              <CheckCircle2 size={16} className="text-[var(--mv-primary)] shrink-0 mt-0.5" />
              <span>{highlight}</span>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--mv-border-subtle)]">
          <button
            type="button"
            disabled={isFirstStep}
            onClick={handlePrevious}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              isFirstStep
                ? 'opacity-30 cursor-not-allowed bg-[var(--mv-bg-secondary)] text-[var(--mv-text-muted)]'
                : 'bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-primary)] hover:border-[var(--mv-border-strong)]'
            }`}
          >
            <ArrowLeft size={15} />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {!isLastStep ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-[var(--mv-primary)] hover:brightness-110 text-[#0B0D0C] rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>Next Step</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 bg-[var(--mv-primary)] hover:brightness-110 text-[#0B0D0C] rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>Enter Money Vault</span>
                <CheckCircle2 size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security Invariant Footer */}
      <div className="text-center space-y-1 text-[11px] text-[var(--mv-text-muted)]">
        <p className="font-semibold">
          Money Vault • Secure Your Money. Master Your Future.
        </p>
        <p>Private IndexedDB storage + Firebase Cloud Firestore sync.</p>
      </div>
    </div>
  );
};
