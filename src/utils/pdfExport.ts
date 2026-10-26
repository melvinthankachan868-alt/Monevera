/**
 * Money Vault Client-Side Professional Financial PDF Statement Generator
 * Generates an executive-level multi-page personal financial statement
 * utilizing jsPDF and jspdf-autotable. 100% Client-side and strictly private.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Income,
  Allowance,
  Bonus,
  Expense,
  SavingsRecord,
  Investment,
  FinancialGoal,
  CategorySummary,
  SubcategoryBudget,
  SmartInsight,
  MoneyOwed,
  Loan,
  Bill,
  Subscription,
  EmergencyFund,
  FinancialAccount,
} from '../types';
import {
  formatINR,
  formatMonthName,
  calculateSubcategorySpent,
  calculateBudgetStatus,
  calculateEmergencyFundDetails,
  calculateMoneyOwedSummary,
  calculateIncomeBreakdown,
  calculateNetWorth,
  calculateDueDateStatus,
} from '../utils/calculations';

interface GeneratePdfReportParams {
  monthKey: string;
  periodTitle?: string;
  dateRangeText?: string;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  totalInvestments: number;
  netRemaining: number;
  incomes: Income[];
  allowances?: Allowance[];
  bonuses?: Bonus[];
  expenses: Expense[];
  savings: SavingsRecord[];
  investments: Investment[];
  goals: FinancialGoal[];
  categorySummaries: CategorySummary[];
  budgets: SubcategoryBudget[];
  insights: SmartInsight[];
  moneyOwed?: MoneyOwed[];
  loans?: Loan[];
  bills?: Bill[];
  subscriptions?: Subscription[];
  emergencyFund?: EmergencyFund | null;
  accounts?: FinancialAccount[];
}

export function generateFinancialPdfReport({
  monthKey,
  periodTitle,
  dateRangeText,
  totalIncome,
  totalExpenses,
  totalSavings,
  totalInvestments,
  netRemaining,
  incomes,
  allowances = [],
  bonuses = [],
  expenses,
  savings,
  investments,
  goals,
  categorySummaries,
  budgets,
  insights,
  moneyOwed = [],
  loans = [],
  bills = [],
  subscriptions = [],
  emergencyFund = null,
  accounts = [],
}: GeneratePdfReportParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const monthLabel = periodTitle || formatMonthName(monthKey) || monthKey;
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Colors: Money Vault Navy & Electric Blue Palette
  const primaryNavy = [11, 19, 43] as const;
  const secondaryBlue = [37, 99, 235] as const;
  const darkSlate = [15, 23, 42] as const;
  const lightBg = [248, 250, 252] as const;

  // Header Banner
  doc.setFillColor(...primaryNavy);
  doc.rect(0, 0, 595.28, 70, 'F');

  // Accent Line
  doc.setFillColor(...secondaryBlue);
  doc.rect(0, 68, 595.28, 2.5, 'F');

  // Brand Name & Motto
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Money Vault', 40, 38);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Secure Your Money. Master Your Future.', 40, 52);
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Period: ${monthLabel}`, 555, 38, { align: 'right' });
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${todayFormatted}`, 555, 52, { align: 'right' });

  let cursorY = 95;

  // Executive Summary Card
  doc.setFillColor(...lightBg);
  doc.roundedRect(40, cursorY, 515, 60, 8, 8, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, cursorY, 515, 60, 8, 8, 'D');

  const colWidth = 515 / 5;
  const metrics = [
    { label: 'TOTAL INFLOW', value: formatINR(totalIncome) },
    { label: 'TOTAL EXPENSES', value: formatINR(totalExpenses) },
    { label: 'SAVINGS DEPOSITS', value: formatINR(totalSavings) },
    { label: 'INVESTMENTS', value: formatINR(totalInvestments) },
    { label: 'NET CASH FLOW', value: formatINR(netRemaining) },
  ];

  metrics.forEach((m, idx) => {
    const x = 40 + idx * colWidth + colWidth / 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);
    doc.text(m.label, x, cursorY + 22, { align: 'center' });
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(m.value, x, cursorY + 42, { align: 'center' });
  });

  cursorY += 80;

  // SECTION 1: INCOME SUMMARY (Regular, Allowances, Bonuses, Other)
  const incBreakdown = calculateIncomeBreakdown(incomes, allowances, bonuses, monthKey);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text('1. Income Summary & Classification', 40, cursorY);
  cursorY += 10;

  const incomeClassificationRows = [
    ['Regular Salary', formatINR(incBreakdown.baseIncome), 'Base compensation'],
    ['Allowances (Travel, Food, Housing, etc.)', formatINR(incBreakdown.allowancesTotal), 'Separate benefit allocations'],
    ['Bonuses & Extra Inflow', formatINR(incBreakdown.bonusesTotal), 'Performance, festival & variable bonus'],
    ['Other Income / Freelance', formatINR(incBreakdown.otherIncomeTotal), 'Side income & investments'],
  ];

  autoTable(doc, {
    startY: cursorY,
    head: [['Income Category', 'Total Amount', 'Classification Note']],
    body: incomeClassificationRows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 4.5 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    foot: [['Total Cash Inflow', formatINR(incBreakdown.totalInflow), 'Combined total for period']],
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
    margin: { left: 40, right: 40 },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 20;

  // SECTION 2: 50/30/20 BUDGET PERFORMANCE
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text('2. 50/30/20 Budget Performance', 40, cursorY);
  cursorY += 10;

  const catRows = categorySummaries.map((cat) => [
    cat.category,
    `${cat.percentage}%`,
    formatINR(cat.budget),
    formatINR(cat.spent),
    cat.isOverBudget ? `${formatINR(Math.abs(cat.remaining))} over` : formatINR(cat.remaining),
    `${cat.percentageUsed}%`,
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [['Category', 'Target %', 'Allocated Budget', 'Total Spent', 'Remaining', 'Usage %']],
    body: catRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 4.5 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'center' },
    },
    margin: { left: 40, right: 40 },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 20;

  // SECTION 3: EMERGENCY FUND SYSTEM (If configured)
  if (emergencyFund) {
    if (cursorY > 680) {
      doc.addPage();
      cursorY = 50;
    }
    const ef = calculateEmergencyFundDetails(emergencyFund);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text('3. Emergency Fund System', 40, cursorY);
    cursorY += 10;

    const efRows = [
      ['Essential Monthly Expenses', formatINR(ef.essentialMonthlyExpenses)],
      ['Target Duration', `${ef.targetMonths} months`],
      ['Emergency Fund Target', formatINR(ef.targetAmount)],
      ['Current Emergency Fund Balance', formatINR(ef.currentAmount)],
      ['Target Progress', `${ef.progressPercentage}%`],
      ['Remaining Amount Needed', formatINR(ef.remainingAmount)],
      ['Months Currently Covered', `${ef.monthsCovered} months`],
      ['Planned Monthly Contribution', ef.monthlyContributionPlan > 0 ? formatINR(ef.monthlyContributionPlan) : 'Not specified'],
      ['Estimated Completion Date', ef.estimatedCompletionDate],
    ];

    autoTable(doc, {
      startY: cursorY,
      head: [['Metric', 'Value']],
      body: efRows,
      theme: 'striped',
      headStyles: { fillColor: [18, 184, 121], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 4.5 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }

  // SECTION 4: MONEY TO RECEIVE & MONEY TO REPAY (If any exist)
  if (moneyOwed.length > 0) {
    if (cursorY > 680) {
      doc.addPage();
      cursorY = 50;
    }
    const owedSumm = calculateMoneyOwedSummary(moneyOwed);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text('4. Money Owed (Personal Loans & Transfers)', 40, cursorY);
    cursorY += 10;

    const owedRows = moneyOwed.map((m) => {
      const dueStatus = calculateDueDateStatus(m.dueDate);
      const isLent = m.type === 'lent';
      return [
        isLent ? 'Money to receive' : 'Money to repay',
        m.personName,
        formatINR(m.originalAmount),
        formatINR(m.amountSettled || 0),
        formatINR(m.remainingAmount),
        m.dueDate,
        `${m.status} (${dueStatus.label})`,
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      head: [['Type', 'Person', 'Original', 'Settled', 'Remaining', 'Due Date', 'Status']],
      body: owedRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 4.5 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
      foot: [
        ['Net Outstanding', '', `To Receive: ${formatINR(owedSumm.toReceiveTotal)}`, `To Repay: ${formatINR(owedSumm.toRepayTotal)}`, `Net: ${formatINR(owedSumm.netOutstanding)}`, '', ''],
      ],
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 7.5 },
      margin: { left: 40, right: 40 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }

  // SECTION 5: LOANS & DEBT (EMIs)
  if (loans.length > 0) {
    if (cursorY > 680) {
      doc.addPage();
      cursorY = 50;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text('5. Loans, EMIs & Debt Liabilities', 40, cursorY);
    cursorY += 10;

    const loanRows = loans.map((l) => [
      l.name,
      l.type,
      formatINR(l.originalAmount),
      formatINR(l.outstandingAmount),
      formatINR(l.emiAmount),
      l.interestRate !== undefined ? `${l.interestRate}%` : '0%',
      l.nextPaymentDate || l.dueDate,
      l.status,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [['Loan Name', 'Type', 'Original', 'Outstanding', 'EMI Amount', 'Interest', 'Next Due', 'Status']],
      body: loanRows,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 4.5 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right' },
        5: { halign: 'center' },
      },
      margin: { left: 40, right: 40 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }

  // SECTION 6: BILLS & SUBSCRIPTIONS
  if (bills.length > 0 || subscriptions.length > 0) {
    if (cursorY > 680) {
      doc.addPage();
      cursorY = 50;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text('6. Recurring Bills & Subscriptions', 40, cursorY);
    cursorY += 10;

    const recurRows: any[] = [];
    bills.forEach((b) => {
      recurRows.push([
        'Bill',
        b.name,
        b.category,
        formatINR(b.amount),
        b.dueDate,
        b.paid ? 'Paid' : 'Unpaid',
      ]);
    });
    subscriptions.forEach((s) => {
      recurRows.push([
        'Subscription',
        s.name,
        s.category,
        formatINR(s.amount),
        s.nextBillingDate,
        s.isActive ? 'Active' : 'Inactive',
      ]);
    });

    autoTable(doc, {
      startY: cursorY,
      head: [['Type', 'Item Name', 'Category', 'Amount', 'Due / Renewal Date', 'Status']],
      body: recurRows,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 4.5 },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }

  // SECTION 7: NET WORTH
  const netWorthCalc = calculateNetWorth(accounts, savings, emergencyFund, investments, moneyOwed, loans);
  if (netWorthCalc.assets.total > 0 || netWorthCalc.liabilities.total > 0) {
    if (cursorY > 680) {
      doc.addPage();
      cursorY = 50;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text('7. Net Worth (Assets vs. Liabilities)', 40, cursorY);
    cursorY += 10;

    const nwRows = [
      ['Liquid Cash & Bank Accounts', formatINR(netWorthCalc.assets.cashAndBank), 'Asset'],
      ['Savings Reserves', formatINR(netWorthCalc.assets.savings), 'Asset'],
      ['Emergency Fund', formatINR(netWorthCalc.assets.emergencyFund), 'Asset'],
      ['Investment Holdings', formatINR(netWorthCalc.assets.investments), 'Asset'],
      ['Money to Receive (Lent)', formatINR(netWorthCalc.assets.moneyToReceive), 'Asset'],
      ['Total Tracked Assets', formatINR(netWorthCalc.assets.total), 'Asset Total'],
      ['Money to Repay (Borrowed)', formatINR(netWorthCalc.liabilities.moneyToRepay), 'Liability'],
      ['Loans & Debt Outstanding', formatINR(netWorthCalc.liabilities.loansOutstanding), 'Liability'],
      ['Total Tracked Liabilities', formatINR(netWorthCalc.liabilities.total), 'Liability Total'],
    ];

    autoTable(doc, {
      startY: cursorY,
      head: [['Component', 'Amount', 'Type']],
      body: nwRows,
      theme: 'striped',
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 4.5 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      foot: [['Net Worth (Assets - Liabilities)', formatINR(netWorthCalc.netWorth), 'Not spendable cash']],
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
      margin: { left: 40, right: 40 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }

  // SECTION 8: ITEMISED EXPENSES
  if (expenses.length > 0) {
    if (cursorY > 680) {
      doc.addPage();
      cursorY = 50;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text('8. Itemized Expenses', 40, cursorY);
    cursorY += 10;

    const expenseRows = expenses.map((exp) => [
      exp.date,
      exp.category,
      exp.subcategory,
      exp.paymentMethod || 'UPI',
      exp.note || '',
      formatINR(exp.amount),
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [['Date', 'Category', 'Subcategory', 'Payment Method', 'Description / Note', 'Amount']],
      body: expenseRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 4.5 },
      columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } },
      foot: [['', '', '', '', 'Total Expenses', formatINR(totalExpenses)]],
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
      margin: { left: 40, right: 40 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }

  // Page numbering and footer on every page
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(226, 232, 240);
    doc.line(40, 800, 555, 800);
    doc.text('Money Vault — Secure Your Money. Master Your Future. — Confidential Financial Statement', 40, 815);
    doc.text(`Page ${i} of ${totalPages}`, 555, 815, { align: 'right' });
  }

  // Save the PDF
  doc.save(`Money-Vault-Financial-Report-${monthKey}.pdf`);
}

export function exportFinancialStatementPDF(params: any): Promise<void> {
  const monthKey = params.selectedMonth || new Date().toISOString().slice(0, 7);
  const totalIncome = (params.incomes || []).reduce((acc: number, i: any) => acc + (i.amount || 0), 0) +
    (params.allowances || []).reduce((acc: number, a: any) => acc + (a.amount || 0), 0) +
    (params.bonuses || []).reduce((acc: number, b: any) => acc + (b.amount || 0), 0);
  const totalExpenses = (params.expenses || []).reduce((acc: number, e: any) => acc + (e.amount || 0), 0);
  const totalSavings = (params.savings || []).reduce((acc: number, s: any) => acc + (s.amount || 0), 0);
  const totalInvestments = (params.investments || []).reduce((acc: number, inv: any) => acc + (inv.amount || inv.currentValue || 0), 0);
  const netRemaining = totalIncome - totalExpenses - totalSavings;

  const categorySummaries: CategorySummary[] = [
    {
      category: 'Needs',
      spent: (params.expenses || []).filter((e: any) => e.category === 'Needs').reduce((s: number, e: any) => s + e.amount, 0),
      budget: Math.round(totalIncome * 0.5),
      remaining: Math.round(totalIncome * 0.5) - (params.expenses || []).filter((e: any) => e.category === 'Needs').reduce((s: number, e: any) => s + e.amount, 0),
      percentage: 50,
      percentageUsed: totalIncome > 0 ? Math.round(((params.expenses || []).filter((e: any) => e.category === 'Needs').reduce((s: number, e: any) => s + e.amount, 0) / (totalIncome * 0.5)) * 100) : 0,
      isOverBudget: (params.expenses || []).filter((e: any) => e.category === 'Needs').reduce((s: number, e: any) => s + e.amount, 0) > totalIncome * 0.5,
      color: '#64D8FF',
      accentBg: '#142028',
      borderColor: '#64D8FF',
    },
    {
      category: 'Wants',
      spent: (params.expenses || []).filter((e: any) => e.category === 'Wants').reduce((s: number, e: any) => s + e.amount, 0),
      budget: Math.round(totalIncome * 0.3),
      remaining: Math.round(totalIncome * 0.3) - (params.expenses || []).filter((e: any) => e.category === 'Wants').reduce((s: number, e: any) => s + e.amount, 0),
      percentage: 30,
      percentageUsed: totalIncome > 0 ? Math.round(((params.expenses || []).filter((e: any) => e.category === 'Wants').reduce((s: number, e: any) => s + e.amount, 0) / (totalIncome * 0.3)) * 100) : 0,
      isOverBudget: (params.expenses || []).filter((e: any) => e.category === 'Wants').reduce((s: number, e: any) => s + e.amount, 0) > totalIncome * 0.3,
      color: '#FFB84D',
      accentBg: '#292212',
      borderColor: '#FFB84D',
    },
    {
      category: 'Savings',
      spent: (params.expenses || []).filter((e: any) => e.category === 'Savings').reduce((s: number, e: any) => s + e.amount, 0),
      budget: Math.round(totalIncome * 0.2),
      remaining: Math.round(totalIncome * 0.2) - (params.expenses || []).filter((e: any) => e.category === 'Savings').reduce((s: number, e: any) => s + e.amount, 0),
      percentage: 20,
      percentageUsed: totalIncome > 0 ? Math.round(((params.expenses || []).filter((e: any) => e.category === 'Savings').reduce((s: number, e: any) => s + e.amount, 0) / (totalIncome * 0.2)) * 100) : 0,
      isOverBudget: false,
      color: '#78D64B',
      accentBg: '#142018',
      borderColor: '#78D64B',
    },
  ];

  generateFinancialPdfReport({
    monthKey,
    periodTitle: `Monthly Statement - ${monthKey}`,
    totalIncome,
    totalExpenses,
    totalSavings,
    totalInvestments,
    netRemaining,
    incomes: params.incomes || [],
    allowances: params.allowances || [],
    bonuses: params.bonuses || [],
    expenses: params.expenses || [],
    savings: params.savings || [],
    investments: params.investments || [],
    goals: params.goals || [],
    categorySummaries,
    budgets: params.budgets || [],
    insights: params.insights || [],
    moneyOwed: params.moneyOwed || [],
    loans: params.loans || [],
    bills: params.bills || [],
    subscriptions: params.subscriptions || [],
    emergencyFund: params.emergencyFund || null,
    accounts: params.accounts || [],
  });

  return Promise.resolve();
}
