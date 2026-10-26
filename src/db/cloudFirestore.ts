import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import {
  Income,
  Allowance,
  Bonus,
  Expense,
  SavingsRecord,
  Investment,
  FinancialGoal,
  RecurringTransaction,
  SubcategoryBudget,
  Subcategory,
  AppSettings,
  Alert,
  AlertHistory,
  UserProfile,
  MoneyOwed,
  MoneyOwedPayment,
  Loan,
  LoanPayment,
  Bill,
  Subscription,
  EmergencyFund,
  EmergencyFundContribution,
  FinancialReminder,
  AppNotification,
  Transfer,
  FinancialAccount,
  SplitGroup,
  GroupExpense,
  GroupSettlement,
  GroupMember,
  GroupInvitation,
  GroupActivity,
} from '../types';

/**
 * Cloud Firestore Data Layer for Money Vault
 * Enforces ownership-based security and standard error reporting.
 */

/**
 * Strips all undefined fields from an object hierarchy before submitting to Firestore,
 * preventing 'Unsupported field value: undefined' runtime errors.
 */
export function removeUndefinedFields<T extends Record<string, any>>(obj: T): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) =>
        item !== null && typeof item === 'object' && !(item instanceof Date)
          ? removeUndefinedFields(item)
          : item
      );
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        result[key] = removeUndefinedFields(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

/**
 * Universal safe setDoc that guarantees no undefined field ever reaches Firestore SDK.
 */
export async function safeSetDoc(docRef: any, data: any, options?: any): Promise<void> {
  const sanitized = removeUndefinedFields(data);
  if (options) {
    await setDoc(docRef, sanitized, options);
  } else {
    await setDoc(docRef, sanitized);
  }
}

// --- USER PROFILE ---
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const p = `users/${profile.uid}`;
  try {
    await safeSetDoc(
      doc(db, 'users', profile.uid),
      {
        ...profile,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const p = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, p);
  }
}

// --- INCOME ---
export async function fetchCloudIncomes(uid: string): Promise<Income[]> {
  const p = `users/${uid}/income`;
  try {
    const q = query(collection(db, 'users', uid, 'income'), orderBy('date', 'desc'), limit(500));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Income);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudIncome(uid: string, item: Income): Promise<void> {
  const p = `users/${uid}/income/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'income', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudIncome(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/income/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'income', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- ALLOWANCES ---
export async function fetchCloudAllowances(uid: string): Promise<Allowance[]> {
  const p = `users/${uid}/allowances`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'allowances'));
    return snap.docs.map((d) => d.data() as Allowance);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudAllowance(uid: string, item: Allowance): Promise<void> {
  const p = `users/${uid}/allowances/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'allowances', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudAllowance(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/allowances/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'allowances', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- BONUSES ---
export async function fetchCloudBonuses(uid: string): Promise<Bonus[]> {
  const p = `users/${uid}/bonuses`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'bonuses'));
    return snap.docs.map((d) => d.data() as Bonus);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudBonus(uid: string, item: Bonus): Promise<void> {
  const p = `users/${uid}/bonuses/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'bonuses', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudBonus(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/bonuses/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'bonuses', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- EXPENSES ---
export async function fetchCloudExpenses(uid: string): Promise<Expense[]> {
  const p = `users/${uid}/expenses`;
  try {
    const q = query(collection(db, 'users', uid, 'expenses'), orderBy('date', 'desc'), limit(1000));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Expense);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudExpense(uid: string, item: Expense): Promise<void> {
  const p = `users/${uid}/expenses/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'expenses', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudExpense(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/expenses/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'expenses', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- MONEY OWED (LENT & BORROWED) ---
export async function fetchCloudMoneyOwed(uid: string): Promise<MoneyOwed[]> {
  const p = `users/${uid}/moneyOwed`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'moneyOwed'));
    const list: MoneyOwed[] = [];
    for (const d of snap.docs) {
      const data = d.data() as MoneyOwed;
      // Fetch subcollection payments
      const paySnap = await getDocs(collection(db, 'users', uid, 'moneyOwed', d.id, 'payments'));
      data.payments = paySnap.docs.map((pd) => pd.data() as MoneyOwedPayment);
      list.push(data);
    }
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudMoneyOwed(uid: string, item: MoneyOwed): Promise<void> {
  const p = `users/${uid}/moneyOwed/${item.id}`;
  try {
    const { payments, ...rootData } = item;
    await safeSetDoc(doc(db, 'users', uid, 'moneyOwed', item.id), {
      ...rootData,
      ownerId: uid,
      updatedAt: Date.now(),
    });
    if (payments && payments.length > 0) {
      const batch = writeBatch(db);
      for (const pay of payments) {
        batch.set(doc(db, 'users', uid, 'moneyOwed', item.id, 'payments', pay.id), removeUndefinedFields(pay));
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function saveCloudMoneyOwedPayment(
  uid: string,
  moneyOwedId: string,
  payment: MoneyOwedPayment
): Promise<void> {
  const p = `users/${uid}/moneyOwed/${moneyOwedId}/payments/${payment.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'moneyOwed', moneyOwedId, 'payments', payment.id), payment);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudMoneyOwed(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/moneyOwed/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'moneyOwed', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- LOANS & DEBT ---
export async function fetchCloudLoans(uid: string): Promise<Loan[]> {
  const p = `users/${uid}/loans`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'loans'));
    return snap.docs.map((d) => d.data() as Loan);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudLoan(uid: string, item: Loan): Promise<void> {
  const p = `users/${uid}/loans/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'loans', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudLoan(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/loans/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'loans', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- FINANCIAL REMINDERS ---
export async function fetchCloudReminders(uid: string): Promise<FinancialReminder[]> {
  const p = `users/${uid}/financialReminders`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'financialReminders'));
    return snap.docs.map((d) => d.data() as FinancialReminder);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudReminder(uid: string, item: FinancialReminder): Promise<void> {
  const p = `users/${uid}/financialReminders/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'financialReminders', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudReminder(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/financialReminders/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'financialReminders', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- BILLS ---
export async function fetchCloudBills(uid: string): Promise<Bill[]> {
  const p = `users/${uid}/bills`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'bills'));
    return snap.docs.map((d) => d.data() as Bill);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudBill(uid: string, item: Bill): Promise<void> {
  const p = `users/${uid}/bills/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'bills', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudBill(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/bills/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'bills', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- SUBSCRIPTIONS ---
export async function fetchCloudSubscriptions(uid: string): Promise<Subscription[]> {
  const p = `users/${uid}/subscriptions`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'subscriptions'));
    return snap.docs.map((d) => d.data() as Subscription);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudSubscription(uid: string, item: Subscription): Promise<void> {
  const p = `users/${uid}/subscriptions/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'subscriptions', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudSubscription(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/subscriptions/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'subscriptions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- EMERGENCY FUND ---
export async function fetchCloudEmergencyFund(uid: string): Promise<EmergencyFund | null> {
  const p = `users/${uid}/emergencyFund/main`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'emergencyFund', 'main'));
    if (!snap.exists()) return null;
    const data = snap.data() as EmergencyFund;
    const contribSnap = await getDocs(collection(db, 'users', uid, 'emergencyFund', 'main', 'contributions'));
    data.contributions = contribSnap.docs.map((cd) => cd.data() as EmergencyFundContribution);
    return data;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, p);
  }
}

export async function saveCloudEmergencyFund(uid: string, item: EmergencyFund): Promise<void> {
  const p = `users/${uid}/emergencyFund/main`;
  try {
    const { contributions, ...rootData } = item;
    await safeSetDoc(doc(db, 'users', uid, 'emergencyFund', 'main'), {
      ...rootData,
      id: 'main',
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function saveCloudEmergencyContribution(
  uid: string,
  contribution: EmergencyFundContribution
): Promise<void> {
  const p = `users/${uid}/emergencyFund/main/contributions/${contribution.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'emergencyFund', 'main', 'contributions', contribution.id), contribution);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

// --- TRANSFERS ---
export async function fetchCloudTransfers(uid: string): Promise<Transfer[]> {
  const p = `users/${uid}/transfers`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'transfers'));
    return snap.docs.map((d) => d.data() as Transfer);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudTransfer(uid: string, item: Transfer): Promise<void> {
  const p = `users/${uid}/transfers/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'transfers', item.id), {
      ...item,
      ownerId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

// --- ACCOUNTS ---
export async function fetchCloudAccounts(uid: string): Promise<FinancialAccount[]> {
  const p = `users/${uid}/accounts`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'accounts'));
    return snap.docs.map((d) => d.data() as FinancialAccount);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudAccount(uid: string, item: FinancialAccount): Promise<void> {
  const p = `users/${uid}/accounts/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'accounts', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudAccount(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/accounts/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'accounts', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- NOTIFICATIONS ---
export async function fetchCloudNotifications(uid: string): Promise<AppNotification[]> {
  const p = `users/${uid}/notifications`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'notifications'));
    return snap.docs.map((d) => d.data() as AppNotification);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudNotification(uid: string, item: AppNotification): Promise<void> {
  const p = `users/${uid}/notifications/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'notifications', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

// --- BUDGETS ---
export async function fetchCloudBudgets(uid: string): Promise<SubcategoryBudget[]> {
  const p = `users/${uid}/budgets`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'budgets'));
    return snap.docs.map((d) => d.data() as SubcategoryBudget);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudBudget(uid: string, item: SubcategoryBudget): Promise<void> {
  const p = `users/${uid}/budgets/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'budgets', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

// --- SAVINGS ---
export async function fetchCloudSavings(uid: string): Promise<SavingsRecord[]> {
  const p = `users/${uid}/savings`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'savings'));
    return snap.docs.map((d) => d.data() as SavingsRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudSavings(uid: string, item: SavingsRecord): Promise<void> {
  const p = `users/${uid}/savings/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'savings', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudSavings(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/savings/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'savings', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- INVESTMENTS ---
export async function fetchCloudInvestments(uid: string): Promise<Investment[]> {
  const p = `users/${uid}/investments`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'investments'));
    return snap.docs.map((d) => d.data() as Investment);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudInvestment(uid: string, item: Investment): Promise<void> {
  const p = `users/${uid}/investments/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'investments', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudInvestment(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/investments/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'investments', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- GOALS ---
export async function fetchCloudGoals(uid: string): Promise<FinancialGoal[]> {
  const p = `users/${uid}/goals`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'goals'));
    return snap.docs.map((d) => d.data() as FinancialGoal);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudGoal(uid: string, item: FinancialGoal): Promise<void> {
  const p = `users/${uid}/goals/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'goals', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudGoal(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/goals/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'goals', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- SUBCATEGORIES ---
export async function fetchCloudSubcategories(uid: string): Promise<Subcategory[]> {
  const p = `users/${uid}/subcategories`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'subcategories'));
    return snap.docs.map((d) => d.data() as Subcategory);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudSubcategory(uid: string, item: Subcategory): Promise<void> {
  const p = `users/${uid}/subcategories/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'subcategories', item.id), {
      ...item,
      ownerId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudSubcategory(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/subcategories/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'subcategories', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- RECURRING ---
export async function fetchCloudRecurring(uid: string): Promise<RecurringTransaction[]> {
  const p = `users/${uid}/recurringTransactions`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'recurringTransactions'));
    return snap.docs.map((d) => d.data() as RecurringTransaction);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudRecurring(uid: string, item: RecurringTransaction): Promise<void> {
  const p = `users/${uid}/recurringTransactions/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'recurringTransactions', item.id), {
      ...item,
      ownerId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudRecurring(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/recurringTransactions/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'recurringTransactions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- ALERTS ---
export async function fetchCloudAlerts(uid: string): Promise<Alert[]> {
  const p = `users/${uid}/alerts`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'alerts'));
    return snap.docs.map((d) => d.data() as Alert);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudAlert(uid: string, item: Alert): Promise<void> {
  const p = `users/${uid}/alerts/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'alerts', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudAlert(uid: string, id: string): Promise<void> {
  const p = `users/${uid}/alerts/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'alerts', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// --- ALERT HISTORY ---
export async function fetchCloudAlertHistory(uid: string): Promise<AlertHistory[]> {
  const p = `users/${uid}/alertHistory`;
  try {
    const q = query(collection(db, 'users', uid, 'alertHistory'), orderBy('triggeredAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AlertHistory);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudAlertHistory(uid: string, item: AlertHistory): Promise<void> {
  const p = `users/${uid}/alertHistory/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'alertHistory', item.id), {
      ...item,
      ownerId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

// --- SETTINGS ---
export async function fetchCloudSettings(uid: string): Promise<AppSettings | null> {
  const p = `users/${uid}/settings/preferences`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'settings', 'preferences'));
    if (snap.exists()) {
      return snap.data() as AppSettings;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, p);
  }
}

export async function saveCloudSettings(uid: string, item: AppSettings): Promise<void> {
  const p = `users/${uid}/settings/preferences`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'settings', 'preferences'), {
      ...item,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

// --- BATCH MIGRATION ---
export async function batchUploadLocalDataToCloud(
  uid: string,
  localData: {
    settings?: AppSettings;
    income: Income[];
    allowances?: Allowance[];
    bonuses?: Bonus[];
    expenses: Expense[];
    budgets: SubcategoryBudget[];
    subcategories: Subcategory[];
    savings: SavingsRecord[];
    investments: Investment[];
    goals: FinancialGoal[];
    moneyOwed?: MoneyOwed[];
    loans?: Loan[];
    bills?: Bill[];
    subscriptions?: Subscription[];
    emergencyFund?: EmergencyFund | null;
    reminders?: FinancialReminder[];
    transfers?: Transfer[];
    accounts?: FinancialAccount[];
  }
): Promise<void> {
  const batch = writeBatch(db);
  if (localData.settings) {
    batch.set(
      doc(db, 'users', uid, 'settings', 'preferences'),
      removeUndefinedFields({
        ...localData.settings,
        updatedAt: Date.now(),
      })
    );
  }
  for (const inc of localData.income) {
    batch.set(
      doc(db, 'users', uid, 'income', inc.id),
      removeUndefinedFields({
        ...inc,
        ownerId: uid,
        updatedAt: Date.now(),
      })
    );
  }
  if (localData.allowances) {
    for (const a of localData.allowances) {
      batch.set(
        doc(db, 'users', uid, 'allowances', a.id),
        removeUndefinedFields({ ...a, ownerId: uid })
      );
    }
  }
  if (localData.bonuses) {
    for (const b of localData.bonuses) {
      batch.set(
        doc(db, 'users', uid, 'bonuses', b.id),
        removeUndefinedFields({ ...b, ownerId: uid })
      );
    }
  }
  for (const exp of localData.expenses) {
    batch.set(
      doc(db, 'users', uid, 'expenses', exp.id),
      removeUndefinedFields({
        ...exp,
        ownerId: uid,
        updatedAt: Date.now(),
      })
    );
  }
  for (const bud of localData.budgets) {
    batch.set(
      doc(db, 'users', uid, 'budgets', bud.id),
      removeUndefinedFields({
        ...bud,
        ownerId: uid,
        updatedAt: Date.now(),
      })
    );
  }
  if (localData.moneyOwed) {
    for (const mo of localData.moneyOwed) {
      batch.set(
        doc(db, 'users', uid, 'moneyOwed', mo.id),
        removeUndefinedFields({ ...mo, ownerId: uid })
      );
    }
  }
  if (localData.loans) {
    for (const l of localData.loans) {
      batch.set(
        doc(db, 'users', uid, 'loans', l.id),
        removeUndefinedFields({ ...l, ownerId: uid })
      );
    }
  }
  if (localData.bills) {
    for (const bl of localData.bills) {
      batch.set(
        doc(db, 'users', uid, 'bills', bl.id),
        removeUndefinedFields({ ...bl, ownerId: uid })
      );
    }
  }
  if (localData.subscriptions) {
    for (const s of localData.subscriptions) {
      batch.set(
        doc(db, 'users', uid, 'subscriptions', s.id),
        removeUndefinedFields({ ...s, ownerId: uid })
      );
    }
  }
  if (localData.emergencyFund) {
    batch.set(
      doc(db, 'users', uid, 'emergencyFund', 'main'),
      removeUndefinedFields({
        ...localData.emergencyFund,
        ownerId: uid,
      })
    );
  }
  await batch.commit();
}

// --- DESTRUCTIVE ACCOUNT CLEANUP ---
export async function deleteUserAccountAndData(uid: string): Promise<void> {
  const collections = [
    'income',
    'allowances',
    'bonuses',
    'expenses',
    'budgets',
    'moneyOwed',
    'loans',
    'bills',
    'subscriptions',
    'emergencyFund',
    'financialReminders',
    'notifications',
    'transfers',
    'accounts',
    'savings',
    'investments',
    'goals',
    'subcategories',
    'recurringTransactions',
    'alerts',
    'alertHistory',
    'settings',
    'researchWatchlist',
    'researchAlerts',
  ];
  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, 'users', uid, colName));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.warn(`Error deleting ${colName}:`, e);
    }
  }
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (e) {
    console.warn('Error deleting user root document:', e);
  }
}

// --- RESEARCH WATCHLIST & ALERTS ---
export async function saveResearchWatchlistItemToCloud(uid: string, item: any): Promise<void> {
  try {
    await safeSetDoc(doc(db, 'users', uid, 'researchWatchlist', item.ticker), {
      ...item,
      ownerId: uid,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/researchWatchlist/${item.ticker}`);
  }
}

export async function deleteResearchWatchlistItemFromCloud(uid: string, ticker: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', uid, 'researchWatchlist', ticker));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}/researchWatchlist/${ticker}`);
  }
}

export async function getResearchWatchlistFromCloud(uid: string): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'researchWatchlist'));
    return snap.docs.map((d) => d.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${uid}/researchWatchlist`);
    return [];
  }
}

export async function saveResearchAlertToCloud(uid: string, alert: any): Promise<void> {
  try {
    await safeSetDoc(doc(db, 'users', uid, 'researchAlerts', alert.id), {
      ...alert,
      ownerId: uid,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/researchAlerts/${alert.id}`);
  }
}

export async function deleteResearchAlertFromCloud(uid: string, alertId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', uid, 'researchAlerts', alertId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}/researchAlerts/${alertId}`);
  }
}

export async function getResearchAlertsFromCloud(uid: string): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'researchAlerts'));
    return snap.docs.map((d) => d.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${uid}/researchAlerts`);
    return [];
  }
}

// ==================== SPLIT / GROUP EXPENSES ====================

export async function fetchCloudSplitGroups(uid: string): Promise<SplitGroup[]> {
  const p = `users/${uid}/splitGroups`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'splitGroups'));
    return snap.docs.map((d) => d.data() as SplitGroup);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
    return [];
  }
}

export async function saveCloudSplitGroup(uid: string, item: SplitGroup): Promise<void> {
  const p = `users/${uid}/splitGroups/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'splitGroups', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudSplitGroup(uid: string, groupId: string): Promise<void> {
  const p = `users/${uid}/splitGroups/${groupId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'splitGroups', groupId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

export async function fetchCloudGroupExpenses(uid: string, groupId: string): Promise<GroupExpense[]> {
  const p = `users/${uid}/splitGroups/${groupId}/expenses`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'splitGroups', groupId, 'expenses'));
    return snap.docs.map((d) => d.data() as GroupExpense);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
    return [];
  }
}

export async function saveCloudGroupExpense(uid: string, groupId: string, item: GroupExpense): Promise<void> {
  const p = `users/${uid}/splitGroups/${groupId}/expenses/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'splitGroups', groupId, 'expenses', item.id), {
      ...item,
      ownerId: uid,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudGroupExpense(uid: string, groupId: string, expenseId: string): Promise<void> {
  const p = `users/${uid}/splitGroups/${groupId}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'splitGroups', groupId, 'expenses', expenseId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

export async function fetchCloudGroupSettlements(uid: string, groupId: string): Promise<GroupSettlement[]> {
  const p = `users/${uid}/splitGroups/${groupId}/settlements`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'splitGroups', groupId, 'settlements'));
    return snap.docs.map((d) => d.data() as GroupSettlement);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
    return [];
  }
}

export async function saveCloudGroupSettlement(uid: string, groupId: string, item: GroupSettlement): Promise<void> {
  const p = `users/${uid}/splitGroups/${groupId}/settlements/${item.id}`;
  try {
    await safeSetDoc(doc(db, 'users', uid, 'splitGroups', groupId, 'settlements', item.id), {
      ...item,
      ownerId: uid,
      createdAt: item.createdAt || Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudGroupSettlement(uid: string, groupId: string, settlementId: string): Promise<void> {
  const p = `users/${uid}/splitGroups/${groupId}/settlements/${settlementId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'splitGroups', groupId, 'settlements', settlementId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// ========================================================
// SHARED COLLABORATIVE GROUP WORKSPACES (Multi-User)
// ========================================================

export async function saveSharedGroup(group: SplitGroup): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.uid) {
    return;
  }
  const currentUid = auth.currentUser.uid;
  const p = `groups/${group.id}`;
  try {
    const safeOwnerId = group.ownerId && group.ownerId !== 'local_user' ? group.ownerId : currentUid;

    // Collect all associated UIDs for authorization checks
    const uids = new Set<string>();
    uids.add(safeOwnerId);
    uids.add(currentUid);
    (group.memberUids || []).forEach((u) => {
      if (u && u !== 'local_user') uids.add(u);
    });
    (group.members || []).forEach((m) => {
      if (m.uid && m.uid !== 'local_user') uids.add(m.uid);
    });

    const docData = removeUndefinedFields({
      ...group,
      ownerId: safeOwnerId,
      memberUids: Array.from(uids),
      updatedAt: Date.now(),
    });

    await safeSetDoc(doc(db, 'groups', group.id), docData);

    // Synchronize member subcollection docs
    const batch = writeBatch(db);
    (group.members || []).forEach((member) => {
      const memberRef = doc(db, 'groups', group.id, 'members', member.id);
      batch.set(
        memberRef,
        removeUndefinedFields({
          ...member,
          groupId: group.id,
          updatedAt: Date.now(),
        })
      );
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

/**
 * Delete a specific member document from the groups/{groupId}/members subcollection.
 */
export async function deleteSharedGroupMember(groupId: string, memberId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.uid) return;
  const p = `groups/${groupId}/members/${memberId}`;
  try {
    await deleteDoc(doc(db, 'groups', groupId, 'members', memberId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

/**
 * Leave Group Flow:
 * CRITICAL FIRESTORE SECURITY RULES REQUIREMENT:
 * The member subcollection document (`groups/{groupId}/members/{memberId}`) MUST be deleted
 * BEFORE updating the parent group document (`groups/{groupId}`).
 *
 * Rationale:
 * Deleting a member document requires `isGroupMember(groupId)`, which verifies that
 * `request.auth.uid in get(/groups/{groupId}).data.memberUids`.
 * If the parent group is updated first to remove the member's UID, the user is immediately
 * no longer considered a member, causing Firestore security rules to REJECT the subsequent
 * member document deletion. Deleting the member record FIRST ensures authorization succeeds.
 */
export async function leaveSharedGroup(groupId: string, memberId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.uid) return;
  const currentUid = auth.currentUser.uid;
  const memberRef = doc(db, 'groups', groupId, 'members', memberId);
  const groupRef = doc(db, 'groups', groupId);

  // STEP 1: Delete the member record FIRST while still in memberUids
  await deleteDoc(memberRef);

  // STEP 2: Update parent group to remove caller UID from memberUids
  const groupSnap = await getDoc(groupRef);
  if (groupSnap.exists()) {
    const data = groupSnap.data();
    const currentMemberUids: string[] = data.memberUids || [];
    const updatedMemberUids = currentMemberUids.filter((u) => u !== currentUid);
    const updatedMembers = (data.members || []).filter((m: any) => m.id !== memberId && m.uid !== currentUid);

    await updateDoc(groupRef, {
      memberUids: updatedMemberUids,
      members: updatedMembers,
      updatedAt: Date.now(),
    });
  }
}

export async function fetchSharedGroups(uid: string): Promise<SplitGroup[]> {
  if (!auth.currentUser || !auth.currentUser.uid) return [];
  const p = 'groups';
  try {
    // 1. Groups where user is owner
    const qOwner = query(collection(db, 'groups'), where('ownerId', '==', uid));
    const snapOwner = await getDocs(qOwner);

    // 2. Groups where user is in memberUids
    const qMember = query(collection(db, 'groups'), where('memberUids', 'array-contains', uid));
    const snapMember = await getDocs(qMember);

    const groupMap = new Map<string, SplitGroup>();
    snapOwner.docs.forEach((d) => groupMap.set(d.id, d.data() as SplitGroup));
    snapMember.docs.forEach((d) => groupMap.set(d.id, d.data() as SplitGroup));

    return Array.from(groupMap.values());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
    return [];
  }
}

export async function fetchSharedGroup(groupId: string): Promise<SplitGroup | null> {
  if (!auth.currentUser || !auth.currentUser.uid) return null;
  const p = `groups/${groupId}`;
  try {
    const snap = await getDoc(doc(db, 'groups', groupId));
    if (!snap.exists()) return null;
    return snap.data() as SplitGroup;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, p);
    return null;
  }
}

export async function deleteSharedGroup(groupId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.uid) return;
  const p = `groups/${groupId}`;
  try {
    // 1. Clean up subcollections: members, expenses, settlements, activity, invitations
    const subcollections = ['members', 'expenses', 'settlements', 'activity', 'invitations'];
    for (const subcol of subcollections) {
      try {
        const snap = await getDocs(collection(db, 'groups', groupId, subcol));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (subErr) {
        console.warn(`[Firestore] Notice deleting subcollection ${subcol} for group ${groupId}:`, subErr);
      }
    }

    // 2. Clean up root groupInvitations docs matching this groupId
    try {
      const q = query(collection(db, 'groupInvitations'), where('groupId', '==', groupId));
      const invSnap = await getDocs(q);
      if (!invSnap.empty) {
        const batch = writeBatch(db);
        invSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (invErr) {
      console.warn(`[Firestore] Notice deleting root groupInvitations for group ${groupId}:`, invErr);
    }

    // 3. Delete root group doc
    await deleteDoc(doc(db, 'groups', groupId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

export async function saveSharedGroupExpense(groupId: string, item: GroupExpense): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.uid) return;
  const currentUid = auth.currentUser.uid;
  const p = `groups/${groupId}/expenses/${item.id}`;
  try {
    const safeOwnerId = item.ownerId && item.ownerId !== 'local_user' ? item.ownerId : currentUid;
    const safeCreatedBy = item.createdBy && item.createdBy !== 'local_user' ? item.createdBy : currentUid;
    const data = removeUndefinedFields({
      ...item,
      ownerId: safeOwnerId,
      createdBy: safeCreatedBy,
      updatedAt: Date.now(),
    });
    await safeSetDoc(doc(db, 'groups', groupId, 'expenses', item.id), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteSharedGroupExpense(groupId: string, expenseId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.uid) return;
  const p = `groups/${groupId}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

export async function fetchSharedGroupExpenses(groupId: string): Promise<GroupExpense[]> {
  if (!auth.currentUser || !auth.currentUser.uid) return [];
  const p = `groups/${groupId}/expenses`;
  try {
    const snap = await getDocs(collection(db, 'groups', groupId, 'expenses'));
    return snap.docs.map((d) => d.data() as GroupExpense);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
    return [];
  }
}

export async function saveSharedGroupSettlement(groupId: string, item: GroupSettlement): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.uid) return;
  const currentUid = auth.currentUser.uid;
  const p = `groups/${groupId}/settlements/${item.id}`;
  try {
    const safeOwnerId = item.ownerId && item.ownerId !== 'local_user' ? item.ownerId : currentUid;
    const safeRecordedBy = item.recordedBy && item.recordedBy !== 'local_user' ? item.recordedBy : currentUid;
    const data = removeUndefinedFields({
      ...item,
      ownerId: safeOwnerId,
      recordedBy: safeRecordedBy,
      createdAt: item.createdAt || Date.now(),
    });
    await safeSetDoc(doc(db, 'groups', groupId, 'settlements', item.id), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteSharedGroupSettlement(groupId: string, settlementId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.uid) return;
  const p = `groups/${groupId}/settlements/${settlementId}`;
  try {
    await deleteDoc(doc(db, 'groups', groupId, 'settlements', settlementId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

export async function fetchSharedGroupSettlements(groupId: string): Promise<GroupSettlement[]> {
  if (!auth.currentUser || !auth.currentUser.uid) return [];
  const p = `groups/${groupId}/settlements`;
  try {
    const snap = await getDocs(collection(db, 'groups', groupId, 'settlements'));
    return snap.docs.map((d) => d.data() as GroupSettlement);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
    return [];
  }
}

// --- GROUP INVITATIONS ---

export async function saveGroupInvitation(invitation: GroupInvitation): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.uid) return;
  const p = `groupInvitations/${invitation.token}`;
  try {
    const cleanInv = removeUndefinedFields(invitation);
    // 1. Root lookup document (accessible with secret token)
    await safeSetDoc(doc(db, 'groupInvitations', invitation.token), cleanInv);
    // 2. Subcollection document in group
    await safeSetDoc(doc(db, 'groups', invitation.groupId, 'invitations', invitation.id), cleanInv);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function fetchGroupInvitationByToken(token: string): Promise<GroupInvitation | null> {
  const p = `groupInvitations/${token}`;
  try {
    const snap = await getDoc(doc(db, 'groupInvitations', token));
    if (!snap.exists()) return null;
    return snap.data() as GroupInvitation;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, p);
    return null;
  }
}

export async function updateGroupInvitationStatus(
  token: string,
  status: 'accepted' | 'declined' | 'revoked',
  acceptedByUid?: string,
  acceptedByName?: string
): Promise<void> {
  const p = `groupInvitations/${token}`;
  try {
    const inviteDoc = await fetchGroupInvitationByToken(token);
    if (!inviteDoc) return;

    const updated = removeUndefinedFields({
      ...inviteDoc,
      status,
      acceptedByUid: acceptedByUid || inviteDoc.acceptedByUid,
      acceptedByName: acceptedByName || inviteDoc.acceptedByName,
      acceptedAt: status === 'accepted' ? Date.now() : inviteDoc.acceptedAt,
    });

    await safeSetDoc(doc(db, 'groupInvitations', token), updated);
    if (inviteDoc.groupId && auth.currentUser) {
      await safeSetDoc(doc(db, 'groups', inviteDoc.groupId, 'invitations', inviteDoc.id), updated);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function fetchGroupInvitations(groupId: string): Promise<GroupInvitation[]> {
  if (!auth.currentUser || !auth.currentUser.uid) return [];
  const p = `groups/${groupId}/invitations`;
  try {
    const snap = await getDocs(collection(db, 'groups', groupId, 'invitations'));
    return snap.docs.map((d) => d.data() as GroupInvitation);
  } catch (err) {
    console.warn(`[Firestore] Fetch invitations notice for ${groupId}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

// --- GROUP ACTIVITY AUDIT LOG ---

export async function recordSharedGroupActivity(groupId: string, activity: GroupActivity): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.uid) return;
  const currentUid = auth.currentUser.uid;
  const p = `groups/${groupId}/activity/${activity.id}`;
  try {
    const safeActorUid = activity.actorUid && activity.actorUid !== 'local' ? activity.actorUid : currentUid;
    const data = removeUndefinedFields({
      ...activity,
      actorUid: safeActorUid,
      timestamp: activity.timestamp || Date.now(),
    });
    await safeSetDoc(doc(db, 'groups', groupId, 'activity', activity.id), data);
  } catch (err) {
    console.warn(`[Firestore] Record activity notice for ${groupId}:`, err instanceof Error ? err.message : err);
  }
}

export async function fetchSharedGroupActivity(groupId: string): Promise<GroupActivity[]> {
  if (!auth.currentUser || !auth.currentUser.uid) return [];
  const p = `groups/${groupId}/activity`;
  try {
    const q = query(collection(db, 'groups', groupId, 'activity'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as GroupActivity);
  } catch (err) {
    console.warn(`[Firestore] Fetch activity notice for ${groupId}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

// --- REAL-TIME LISTENERS (Scoped strictly to active group) ---

export function subscribeToSharedGroupDoc(
  groupId: string,
  onData: (group: SplitGroup | null) => void
): Unsubscribe {
  if (!auth.currentUser || !auth.currentUser.uid) {
    return () => {};
  }
  return onSnapshot(
    doc(db, 'groups', groupId),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as SplitGroup);
      } else {
        onData(null);
      }
    },
    (err) => {
      console.warn(`[Firestore] Group doc listener notice for ${groupId}:`, err.message);
    }
  );
}

export function subscribeToSharedGroupExpenses(
  groupId: string,
  onData: (expenses: GroupExpense[]) => void
): Unsubscribe {
  if (!auth.currentUser || !auth.currentUser.uid) {
    return () => {};
  }
  return onSnapshot(
    collection(db, 'groups', groupId, 'expenses'),
    (snap) => {
      const expenses = snap.docs.map((d) => d.data() as GroupExpense);
      onData(expenses);
    },
    (err) => {
      console.warn(`[Firestore] Group expenses listener notice for ${groupId}:`, err.message);
    }
  );
}

export function subscribeToSharedGroupSettlements(
  groupId: string,
  onData: (settlements: GroupSettlement[]) => void
): Unsubscribe {
  if (!auth.currentUser || !auth.currentUser.uid) {
    return () => {};
  }
  return onSnapshot(
    collection(db, 'groups', groupId, 'settlements'),
    (snap) => {
      const settlements = snap.docs.map((d) => d.data() as GroupSettlement);
      onData(settlements);
    },
    (err) => {
      console.warn(`[Firestore] Group settlements listener notice for ${groupId}:`, err.message);
    }
  );
}

export function subscribeToSharedGroupActivity(
  groupId: string,
  onData: (activity: GroupActivity[]) => void
): Unsubscribe {
  if (!auth.currentUser || !auth.currentUser.uid) {
    return () => {};
  }
  const q = query(collection(db, 'groups', groupId, 'activity'), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const activities = snap.docs.map((d) => d.data() as GroupActivity);
      onData(activities);
    },
    (err) => {
      console.warn(`[Firestore] Group activity listener notice for ${groupId}:`, err.message);
    }
  );
}



