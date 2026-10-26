/**
 * Money Vault — Split / Group Expenses Domain Models & Types
 * Production-quality Group Expense Splitting, Multi-Payer & Automatic Settlement Engine
 */

import { PaymentMethod } from './index';

export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';
export type MemberRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'joined' | 'invited' | 'inactive';

export interface GroupMember {
  id: string; // member identifier (UID if linked account, or contact ID)
  uid?: string; // Firebase Auth UID when joined
  name: string;
  email?: string;
  phone?: string;
  role?: MemberRole; // Default: 'member', creator is 'owner'
  status?: MemberStatus; // 'joined' | 'invited' | 'inactive'
  joinedAt?: number;
  isCurrentUser: boolean;
  isInactive?: boolean; // For soft-removal to preserve financial history
  avatarColor?: string;
}

export interface SplitGroup {
  id: string;
  ownerId?: string;
  ownerName?: string;
  memberUids?: string[]; // Array of UIDs for Firestore security rules and queries
  name: string;
  description?: string;
  currency: string; // Default: 'INR'
  icon?: string;
  color?: string;
  members: GroupMember[];
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
export type DeliveryStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'not_configured';

export interface GroupInvitation {
  id: string; // invitationId
  token: string; // Secure cryptographically random string
  tokenHash?: string; // SHA-256 hash of token
  groupId: string;
  groupName: string;
  groupDescription?: string;
  currency: string;
  invitedByUid: string;
  invitedByName: string;
  recipientIdentifier: string; // email or phone
  recipientType: 'email' | 'phone';
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  role: 'member' | 'admin';
  createdAt: number;
  expiresAt: number; // e.g. 7 days
  status: InvitationStatus;
  acceptedByUid?: string;
  acceptedByName?: string;
  acceptedAt?: number;
  deliveryMethod?: 'email' | 'sms' | 'whatsapp' | 'manual';
  deliveryStatus: DeliveryStatus;
  deliveryProvider?: string;
  deliveryMessageId?: string;
  lastDeliveryAttemptAt?: number;
  failureReason?: string;
  deliveryMessage?: string;
}

export interface GroupActivity {
  id: string;
  groupId: string;
  actorUid: string;
  actorName: string;
  action:
    | 'created_group'
    | 'invited_member'
    | 'joined_group'
    | 'left_group'
    | 'removed_member'
    | 'added_expense'
    | 'edited_expense'
    | 'deleted_expense'
    | 'recorded_settlement'
    | 'revoked_invitation'
    | 'transferred_ownership';
  title: string;
  description?: string;
  amount?: number;
  timestamp: number;
}

export interface SplitExpensePayment {
  memberId: string;
  amount: number; // in INR
}

export interface SplitParticipant {
  memberId: string;
  shareAmount: number; // in INR
  percentage?: number; // e.g. 25 (%)
  shares?: number; // e.g. 2 (shares)
}

export interface GroupExpense {
  id: string;
  groupId: string;
  ownerId?: string;
  createdBy?: string; // UID of the user who recorded the expense
  createdByName?: string;
  title: string;
  amount: number; // in INR
  date: string; // YYYY-MM-DD
  category: string; // Food, Travel, Accommodation, Transport, Shopping, Entertainment, Bills, Utilities, Other
  notes?: string;
  paidBy: SplitExpensePayment[]; // Multi-payer supported
  splitMethod: SplitMethod;
  splitBetween: string[]; // memberIds included in split
  splits: SplitParticipant[]; // Calculated or custom member shares
  receiptUrl?: string;
  linkedPersonalExpenseId?: string; // Links to personal expense ledger for current user share
  linkedMoneyOwedIds?: string[]; // Links to MoneyOwed receivables/payables
  createdAt: number;
  updatedAt: number;
}

export interface GroupSettlement {
  id: string;
  groupId: string;
  ownerId?: string;
  recordedBy?: string; // UID of user recording payment
  recordedByName?: string;
  fromMemberId: string; // Debtor
  toMemberId: string; // Creditor
  amount: number; // in INR
  date: string; // YYYY-MM-DD
  paymentMethod?: PaymentMethod | string; // Cash, UPI, Bank Transfer, Card, Other
  notes?: string;
  status?: 'completed' | 'recorded' | 'pending';
  linkedMoneyOwedPaymentId?: string;
  createdAt: number;
}

export interface SettlementRecommendation {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  fromMemberName: string;
  toMemberName: string;
  amount: number; // in INR
}

export interface MemberBalanceSummary {
  memberId: string;
  memberName: string;
  isCurrentUser: boolean;
  isInactive: boolean;
  totalPaid: number;
  totalShare: number;
  settlementReceived: number;
  settlementPaid: number;
  netBalance: number; // Positive = should receive money; Negative = owes money; 0 = settled
  statusDescription: string;
}

export interface GroupFinancialSummary {
  totalSpent: number;
  totalSettled: number;
  currentUserPaid: number;
  currentUserShare: number;
  currentUserNetBalance: number; // >0 => owed, <0 => owes
  memberBalances: MemberBalanceSummary[];
  optimalSettlements: SettlementRecommendation[];
  expenseCount: number;
  settlementCount: number;
}

export interface GlobalGroupBalancesSummary {
  totalYouAreOwed: number; // in INR
  totalYouOwe: number; // in INR
  netGroupBalance: number; // in INR
  activeGroupCount: number;
  unsettledGroups: Array<{
    groupId: string;
    groupName: string;
    userNet: number;
  }>;
}
