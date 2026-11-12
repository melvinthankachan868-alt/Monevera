import React,{ useState,useMemo } from 'react';
import {
Users,
Plus,
Receipt,
Scale,
CheckCircle2,
Share2,ArrowRight,Archive,
Edit2,
Trash2,Info,AlertCircle,
Clock,
Check,
UserPlus,
Activity,
ShieldCheck,
Crown,
UserX,
Mail,Lock,
X
} from 'lucide-react';
import { useFinTraQ } from '../context/FinTraQContext';
import { SplitGroup,GroupExpense,SettlementRecommendation,GroupMember } from '../types/splitExpenses';
import { CreateGroupModal } from '../components/splitExpenses/CreateGroupModal';
import { AddGroupExpenseModal } from '../components/splitExpenses/AddGroupExpenseModal';
import { SettleUpModal } from '../components/splitExpenses/SettleUpModal';
import { ShareSummaryModal } from '../components/splitExpenses/ShareSummaryModal';
import { InviteMemberModal } from '../components/splitExpenses/InviteMemberModal';

export const SplitExpensesScreen: React.FC = () => {
  const {
    splitGroups,
    groupExpenses,
    groupSettlements,
    groupActivities,
    groupInvitations,
    activeSplitGroupId,
    setActiveSplitGroupId,
    deleteSplitGroup,
    deleteGroupExpense,
    deleteGroupSettlement,
    archiveSplitGroup,
    removeGroupMember,
    transferGroupOwnership,
    getGroupFinancialSummary,
    globalGroupBalancesSummary,
    user,
  } = useFinTraQ();

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SplitGroup | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GroupExpense | null>(null);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [activeRecommendation, setActiveRecommendation] = useState<SettlementRecommendation | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [confirmTransferMember, setConfirmTransferMember] = useState<GroupMember | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<GroupMember | null>(null);

  // Group Delete Confirmation State (Requirement Bug #1)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<SplitGroup | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tab inside group view: 'expenses' | 'balances' | 'settlement_plan' | 'activity' | 'members' | 'history'
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settlement_plan' | 'activity' | 'members' | 'history'>('expenses');
  const [showArchived, setShowArchived] = useState(false);

  // Filtered groups
  const visibleGroups = useMemo(() => {
    if (showArchived) return splitGroups;
    return splitGroups.filter((g) => !g.isArchived);
  }, [splitGroups, showArchived]);

  // Current active group
  const activeGroup = useMemo(() => {
    if (!splitGroups || splitGroups.length === 0) return null;
    if (activeSplitGroupId) {
      const found = splitGroups.find((g) => g.id === activeSplitGroupId);
      if (found) return found;
    }
    return visibleGroups[0] || splitGroups[0] || null;
  }, [splitGroups, activeSplitGroupId, visibleGroups]);

  // Group summary metrics
  const groupSummary = useMemo(() => {
    if (!activeGroup) return null;
    return getGroupFinancialSummary(activeGroup.id);
  }, [activeGroup, getGroupFinancialSummary]);

  const currentExpenses = useMemo(() => {
    if (!activeGroup) return [];
    return groupExpenses[activeGroup.id] || [];
  }, [activeGroup, groupExpenses]);

  const currentSettlements = useMemo(() => {
    if (!activeGroup) return [];
    return groupSettlements[activeGroup.id] || [];
  }, [activeGroup, groupSettlements]);

  // Handle Edit Group
  const handleOpenEditGroup = () => {
    if (!activeGroup) return;
    setEditingGroup(activeGroup);
    setCreateModalOpen(true);
  };

  // Handle Edit Expense
  const handleOpenEditExpense = (expense: GroupExpense) => {
    setEditingExpense(expense);
    setExpenseModalOpen(true);
  };

  // Handle Settle Up recommendation
  const handleOpenSettleRecommendation = (rec: SettlementRecommendation) => {
    setActiveRecommendation(rec);
    setSettleModalOpen(true);
  };

  // Authorization check: only group creator/owner or local vault owner can delete group
  const isCurrentGroupOwner = useMemo(() => {
    if (!activeGroup) return false;
    if (!activeGroup.ownerId || activeGroup.ownerId === 'local_user') return true;
    return Boolean(user?.uid && activeGroup.ownerId === user.uid);
  }, [activeGroup, user]);

  const handlePromptDeleteGroup = (group: SplitGroup) => {
    const isOwner =
      !group.ownerId ||
      group.ownerId === 'local_user' ||
      (user?.uid && group.ownerId === user.uid);

    if (!isOwner) {
      setDeleteError('Only the group owner is authorized to delete this group.');
      return;
    }
    setGroupToDelete(group);
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      setIsDeletingGroup(true);
      setDeleteError(null);
      await deleteSplitGroup(groupToDelete.id);
      setDeleteConfirmOpen(false);
      setGroupToDelete(null);
      setSuccessMessage('Group deleted successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to delete group:', err);
      setDeleteError(err?.message || 'Failed to delete group. Please try again.');
    } finally {
      setIsDeletingGroup(false);
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 font-bold text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="cursor-pointer hover:opacity-75 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {deleteError && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 dark:text-red-400 font-bold text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{deleteError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="cursor-pointer hover:opacity-75 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================
          1. GLOBAL GROUP BALANCES BANNER (Requirement 28)
      ======================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--mv-surface)] border border-[var(--mv-border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] flex items-center justify-center">
              <Users size={16} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--mv-text-primary)] tracking-tight">
              Split &amp; Group Expenses
            </h1>
          </div>
          <p className="text-xs text-[var(--mv-text-secondary)]">
            Multi-payer tracking, fair share calculation &amp; transaction-minimized settlement
          </p>
        </div>

        {/* Global Net Numbers across all groups */}
        <div className="flex items-center gap-3 sm:gap-6 bg-[var(--mv-bg-secondary)] p-3 rounded-2xl border border-[var(--mv-border)]">
          <div>
            <div className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider">
              You are owed
            </div>
            <div className="text-sm sm:text-base font-black text-emerald-500 tabular-nums">
              ₹{globalGroupBalancesSummary.totalYouAreOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="w-px h-8 bg-[var(--mv-border)]" />

          <div>
            <div className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider">
              You owe
            </div>
            <div className="text-sm sm:text-base font-black text-amber-500 tabular-nums">
              ₹{globalGroupBalancesSummary.totalYouOwe.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="w-px h-8 bg-[var(--mv-border)]" />

          <div>
            <div className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider">
              Net balance
            </div>
            <div
              className={`text-sm sm:text-base font-black tabular-nums ${
                globalGroupBalancesSummary.netGroupBalance > 0
                  ? 'text-emerald-500'
                  : globalGroupBalancesSummary.netGroupBalance < 0
                  ? 'text-amber-500'
                  : 'text-[var(--mv-text-muted)]'
              }`}
            >
              {globalGroupBalancesSummary.netGroupBalance > 0 ? '+' : ''}
              ₹{globalGroupBalancesSummary.netGroupBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. GROUP SELECTOR & CONTROLS
      ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Group Selector Dropdown / Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
          {visibleGroups.map((g) => {
            const isSelected = activeGroup?.id === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveSplitGroupId(g.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] border-[var(--mv-primary)] shadow-xs'
                    : 'bg-[var(--mv-surface)] border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:border-[var(--mv-border-hover)]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: g.color || '#10B981' }}
                />
                <span>{g.name}</span>
                {g.isArchived && <span className="text-[10px] opacity-75">(Archived)</span>}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setEditingGroup(null);
              setCreateModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-[var(--mv-surface)] border border-dashed border-[var(--mv-border)] hover:border-[var(--mv-primary)] text-[var(--mv-primary)] transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>New Group</span>
          </button>
        </div>

        {/* Archived Toggle */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--mv-text-muted)] self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="hover:text-[var(--mv-text-primary)] cursor-pointer"
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
        </div>
      </div>

      {/* ========================================================
          3. ACTIVE GROUP VIEW (OR EMPTY STATE)
      ======================================================== */}
      {!activeGroup ? (
        <div className="p-12 rounded-3xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] mx-auto flex items-center justify-center">
            <Users size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-[var(--mv-text-primary)]">No Split Groups Yet</h3>
            <p className="text-xs text-[var(--mv-text-secondary)] max-w-md mx-auto">
              Create a group for your vacation, apartment flatmates, dinner with friends, or road trips to automatically track who paid, who owes, and settle up with minimal transfers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-md hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Create Your First Group</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Active Group Header Card */}
          <div className="p-6 rounded-3xl bg-[var(--mv-surface)] border border-[var(--mv-border)] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: activeGroup.color || '#10B981' }}
                  />
                  <h2 className="text-xl font-black text-[var(--mv-text-primary)]">
                    {activeGroup.name}
                  </h2>
                  {activeGroup.isArchived && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                      Archived
                    </span>
                  )}
                </div>
                {activeGroup.description && (
                  <p className="text-xs text-[var(--mv-text-secondary)]">{activeGroup.description}</p>
                )}
                <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-[var(--mv-text-muted)] flex-wrap">
                  <span>Members:</span>
                  {activeGroup.members
                    .filter((m) => !m.isInactive)
                    .map((m) => (
                      <span
                        key={m.id}
                        className="px-2 py-0.5 rounded-lg bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[var(--mv-text-primary)]"
                      >
                        {m.name} {m.isCurrentUser ? '(You)' : ''}
                      </span>
                    ))}
                </div>
              </div>

              {/* Group Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setEditingExpense(null);
                    setExpenseModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-md hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>Add Expense</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[var(--mv-surface)] border border-[var(--mv-border)] hover:border-[var(--mv-primary)] text-[var(--mv-primary)] hover:bg-[var(--mv-primary)]/10 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  title="Invite Members by Email or Phone"
                >
                  <UserPlus size={15} />
                  <span>Invite</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveRecommendation(null);
                    setSettleModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>Settle Up</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] hover:bg-[var(--mv-surface-hover)] text-[var(--mv-text-primary)] transition-all cursor-pointer flex items-center gap-1.5"
                  title="Share Summary"
                >
                  <Share2 size={14} />
                  <span className="hidden sm:inline">Share</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenEditGroup}
                  className="p-2.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] hover:bg-[var(--mv-surface-hover)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
                  title="Edit Group"
                >
                  <Edit2 size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => archiveSplitGroup(activeGroup.id, !activeGroup.isArchived)}
                  className="p-2.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] hover:bg-[var(--mv-surface-hover)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
                  title={activeGroup.isArchived ? 'Unarchive Group' : 'Archive Group'}
                >
                  <Archive size={14} />
                </button>

                {isCurrentGroupOwner && (
                  <button
                    type="button"
                    onClick={() => handlePromptDeleteGroup(activeGroup)}
                    className="p-2.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] hover:border-red-500/50 hover:bg-red-500/10 text-[var(--mv-text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                    title="Delete Group"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Financial Summary Dashboard Row */}
            {groupSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--mv-border)]">
                <div className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)]">
                  <div className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider mb-0.5">
                    Total Spent
                  </div>
                  <div className="text-base sm:text-lg font-black text-[var(--mv-text-primary)] tabular-nums">
                    ₹{groupSummary.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--mv-text-muted)] mt-0.5">
                    {groupSummary.expenseCount} expense(s)
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)]">
                  <div className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider mb-0.5">
                    Your Share
                  </div>
                  <div className="text-base sm:text-lg font-black text-[var(--mv-text-primary)] tabular-nums">
                    ₹{groupSummary.currentUserShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--mv-text-muted)] mt-0.5">
                    Personal budget share
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)]">
                  <div className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider mb-0.5">
                    You Paid
                  </div>
                  <div className="text-base sm:text-lg font-black text-[var(--mv-text-primary)] tabular-nums">
                    ₹{groupSummary.currentUserPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--mv-text-muted)] mt-0.5">
                    Total cash outflow
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)]">
                  <div className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase tracking-wider mb-0.5">
                    Your Net Status
                  </div>
                  <div
                    className={`text-base sm:text-lg font-black tabular-nums ${
                      groupSummary.currentUserNetBalance > 0
                        ? 'text-emerald-500'
                        : groupSummary.currentUserNetBalance < 0
                        ? 'text-amber-500'
                        : 'text-[var(--mv-text-muted)]'
                    }`}
                  >
                    {groupSummary.currentUserNetBalance > 0 ? '+' : ''}
                    ₹{groupSummary.currentUserNetBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--mv-text-muted)] mt-0.5">
                    {groupSummary.currentUserNetBalance > 0
                      ? 'You are owed'
                      : groupSummary.currentUserNetBalance < 0
                      ? 'You owe the group'
                      : 'All settled'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Group Tabs: Expenses, Balances, Settlement Plan, History */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--mv-surface)] rounded-2xl border border-[var(--mv-border)] text-xs font-bold overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'expenses'
                  ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs'
                  : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
              }`}
            >
              <Receipt size={14} />
              <span>Expenses ({currentExpenses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('balances')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'balances'
                  ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs'
                  : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
              }`}
            >
              <Users size={14} />
              <span>Member Balances</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settlement_plan')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'settlement_plan'
                  ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs'
                  : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
              }`}
            >
              <Scale size={14} />
              <span>Settlement Plan ({groupSummary?.optimalSettlements.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'activity'
                  ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs'
                  : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
              }`}
            >
              <Activity size={14} />
              <span>Recent Activity ({(groupActivities[activeGroup.id] || []).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'members'
                  ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs'
                  : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Members & Roles ({activeGroup.members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs'
                  : 'text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
              }`}
            >
              <Clock size={14} />
              <span>History ({currentSettlements.length})</span>
            </button>
          </div>

          {/* ========================================================
              TAB 1: EXPENSES LIST
          ======================================================== */}
          {activeTab === 'expenses' && (
            <div className="space-y-3">
              {currentExpenses.length === 0 ? (
                <div className="p-8 rounded-3xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] mx-auto flex items-center justify-center">
                    <Receipt size={22} />
                  </div>
                  <h4 className="text-sm font-black text-[var(--mv-text-primary)]">No Shared Expenses Yet</h4>
                  <p className="text-xs text-[var(--mv-text-secondary)] max-w-sm mx-auto">
                    Add hotels, meals, transport, or groceries. You can specify one or multiple payers and split equally, by exact amounts, percentages, or shares.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExpense(null);
                      setExpenseModalOpen(true);
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs hover:brightness-110 cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add First Expense</span>
                  </button>
                </div>
              ) : (
                currentExpenses.map((exp) => {
                  // Figure out who paid description
                  const paidNames = exp.paidBy
                    .map((p) => {
                      const m = activeGroup.members.find((mem) => mem.id === p.memberId);
                      return `${m?.name || 'Member'} (₹${p.amount.toLocaleString('en-IN')})`;
                    })
                    .join(', ');

                  // Figure out user's share
                  const mySplit = exp.splits.find((s) => {
                    const m = activeGroup.members.find((mem) => mem.id === s.memberId);
                    return m?.isCurrentUser;
                  });

                  return (
                    <div
                      key={exp.id}
                      className="p-4 rounded-2xl bg-[var(--mv-surface)] border border-[var(--mv-border)] hover:border-[var(--mv-border-hover)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-center text-[var(--mv-primary)] shrink-0">
                          <Receipt size={18} />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-[var(--mv-text-primary)]">{exp.title}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)]">
                              {exp.category}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] uppercase">
                              {exp.splitMethod} split
                            </span>
                          </div>
                          <div className="text-xs text-[var(--mv-text-secondary)]">
                            Paid by: <span className="font-bold text-[var(--mv-text-primary)]">{paidNames}</span>
                            {exp.createdByName && (
                              <span className="text-[11px] text-[var(--mv-text-muted)] ml-2">
                                • Added by {exp.createdByName}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--mv-text-muted)] flex items-center gap-2">
                            <span>{exp.date}</span>
                            <span>•</span>
                            <span>Split among {exp.splitBetween.length} members</span>
                            {exp.notes && (
                              <>
                                <span>•</span>
                                <span className="italic">{exp.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--mv-border)]">
                        <div className="text-left sm:text-right">
                          <div className="text-base font-black text-[var(--mv-text-primary)] tabular-nums">
                            ₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          {mySplit && (
                            <div className="text-[11px] font-bold text-[var(--mv-primary)] tabular-nums">
                              Your share: ₹{mySplit.shareAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>

                        {/* Edit / Delete actions with authorization check */}
                        {(() => {
                          const isOwner = activeGroup.ownerId === user?.uid;
                          const isCreator = !exp.createdBy || exp.createdBy === user?.uid;
                          const canEditOrDelete = isOwner || isCreator || !user;

                          if (!canEditOrDelete) {
                            return (
                              <div className="p-2 text-[var(--mv-text-muted)]" title="Only creator or group owner can edit">
                                <Lock size={13} className="opacity-50" />
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditExpense(exp)}
                                className="p-2 rounded-xl text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
                                title="Edit expense"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteGroupExpense(activeGroup.id, exp.id)}
                                className="p-2 rounded-xl text-[var(--mv-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Delete expense"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2: MEMBER BALANCES
          ======================================================== */}
          {activeTab === 'balances' && groupSummary && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupSummary.memberBalances.map((b) => {
                  return (
                    <div
                      key={b.memberId}
                      className="p-4 rounded-2xl bg-[var(--mv-surface)] border border-[var(--mv-border)] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center ${
                              b.isCurrentUser
                                ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C]'
                                : 'bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[var(--mv-text-primary)]'
                            }`}
                          >
                            {b.memberName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-black text-[var(--mv-text-primary)] flex items-center gap-1.5">
                              <span>{b.memberName}</span>
                              {b.isCurrentUser && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--mv-primary)]/15 text-[var(--mv-primary)]">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-semibold text-[var(--mv-text-muted)]">
                              {b.statusDescription}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`text-base font-black tabular-nums ${
                            b.netBalance > 0
                              ? 'text-emerald-500'
                              : b.netBalance < 0
                              ? 'text-amber-500'
                              : 'text-[var(--mv-text-muted)]'
                          }`}
                        >
                          {b.netBalance > 0 ? '+' : ''}
                          ₹{b.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[var(--mv-border)] text-[10px] font-semibold text-[var(--mv-text-secondary)]">
                        <div>
                          <span className="block text-[var(--mv-text-muted)]">Paid</span>
                          <span className="font-bold text-[var(--mv-text-primary)]">
                            ₹{b.totalPaid.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[var(--mv-text-muted)]">Share</span>
                          <span className="font-bold text-[var(--mv-text-primary)]">
                            ₹{b.totalShare.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[var(--mv-text-muted)]">Settled Recv</span>
                          <span className="font-bold text-emerald-500">
                            ₹{b.settlementReceived.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[var(--mv-text-muted)]">Settled Paid</span>
                          <span className="font-bold text-amber-500">
                            ₹{b.settlementPaid.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: SETTLEMENT PLAN (Transaction Minimized)
          ======================================================== */}
          {activeTab === 'settlement_plan' && groupSummary && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs text-[var(--mv-text-secondary)] flex items-center gap-2">
                <Info size={16} className="text-[var(--mv-primary)] shrink-0" />
                <span>
                  The settlement engine automatically nets all mutual obligations to minimize the total number of transactions required to settle the group.
                </span>
              </div>

              {groupSummary.optimalSettlements.length === 0 ? (
                <div className="p-10 rounded-3xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-black text-[var(--mv-text-primary)]">All Balances Settled!</h4>
                  <p className="text-xs text-[var(--mv-text-secondary)]">
                    No member owes any money in {activeGroup.name}.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {groupSummary.optimalSettlements.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-2xl bg-[var(--mv-surface)] border border-[var(--mv-border)] flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 font-black text-xs flex items-center justify-center">
                          {rec.fromMemberName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-[var(--mv-text-primary)]">
                            {rec.fromMemberName}
                          </span>
                          <span className="text-xs text-[var(--mv-text-muted)] flex items-center gap-1 font-bold">
                            <ArrowRight size={13} className="text-emerald-500" />
                            <span>pays</span>
                          </span>
                          <span className="text-sm font-black text-[var(--mv-text-primary)]">
                            {rec.toMemberName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-emerald-500 tabular-nums">
                          ₹{rec.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenSettleRecommendation(rec)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Check size={13} />
                          <span>Settle</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 4: SETTLEMENT HISTORY
          ======================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {currentSettlements.length === 0 ? (
                <div className="p-8 rounded-3xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-center space-y-2">
                  <Clock size={24} className="text-[var(--mv-text-muted)] mx-auto" />
                  <h4 className="text-sm font-black text-[var(--mv-text-primary)]">No Settlement History</h4>
                  <p className="text-xs text-[var(--mv-text-secondary)]">
                    Recorded repayments and settlements between members will appear here.
                  </p>
                </div>
              ) : (
                currentSettlements.map((set) => {
                  const fromM = activeGroup.members.find((m) => m.id === set.fromMemberId);
                  const toM = activeGroup.members.find((m) => m.id === set.toMemberId);

                  return (
                    <div
                      key={set.id}
                      className="p-4 rounded-2xl bg-[var(--mv-surface)] border border-[var(--mv-border)] flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-black text-[var(--mv-text-primary)] flex items-center gap-2">
                          <span>{fromM?.name || 'Member'}</span>
                          <ArrowRight size={13} className="text-emerald-500" />
                          <span>{toM?.name || 'Member'}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                            {set.paymentMethod || 'UPI'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--mv-text-muted)]">
                          <span>{set.date}</span>
                          {set.notes && <span> • {set.notes}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-emerald-500 tabular-nums">
                          ₹{set.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteGroupSettlement(activeGroup.id, set.id)}
                          className="p-2 text-[var(--mv-text-muted)] hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete payment record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================
              TAB 5: RECENT ACTIVITY
          ======================================================== */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              {!(groupActivities[activeGroup.id]?.length) ? (
                <div className="p-8 rounded-3xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-center space-y-2">
                  <Activity size={24} className="text-[var(--mv-text-muted)] mx-auto" />
                  <h4 className="text-sm font-black text-[var(--mv-text-primary)]">No Activity Logged Yet</h4>
                  <p className="text-xs text-[var(--mv-text-secondary)]">
                    Real-time actions for created expenses, recorded repayments, and invitations appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(groupActivities[activeGroup.id] || []).map((act) => (
                    <div
                      key={act.id}
                      className="p-4 rounded-2xl bg-[var(--mv-surface)] border border-[var(--mv-border)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[var(--mv-primary)] flex items-center justify-center shrink-0">
                          {act.action === 'created_group' && <Users size={14} />}
                          {act.action === 'invited_member' && <Mail size={14} />}
                          {act.action === 'joined_group' && <CheckCircle2 size={14} />}
                          {act.action === 'added_expense' && <Receipt size={14} />}
                          {act.action === 'edited_expense' && <Edit2 size={14} />}
                          {act.action === 'deleted_expense' && <Trash2 size={14} />}
                          {act.action === 'recorded_settlement' && <Check size={14} />}
                          {act.action === 'removed_member' && <UserX size={14} />}
                          {act.action === 'transferred_ownership' && <Crown size={14} />}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--mv-text-primary)]">{act.title}</p>
                          <p className="text-[10px] text-[var(--mv-text-muted)]">
                            {new Date(act.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>
                      </div>
                      {act.amount && (
                        <span className="font-extrabold text-[var(--mv-primary)] tabular-nums">
                          ₹{act.amount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 6: MEMBERS & ROLES
          ======================================================== */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-[var(--mv-text-primary)]">Group Workspace Members</h3>
                  <p className="text-xs text-[var(--mv-text-secondary)]">Manage membership, roles, and invitations</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="px-4 py-2 rounded-2xl text-xs font-bold bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>Invite New Member</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeGroup.members.map((member) => {
                  const isOwner =
                    activeGroup.ownerId === member.uid ||
                    activeGroup.ownerId === member.id ||
                    member.role === 'owner';
                  const isCurrent = member.isCurrentUser || (user?.uid && member.uid === user.uid);
                  const isInactive = member.isInactive || member.status === 'inactive';
                  const isPending = member.status === 'invited';
                  const canManage = (activeGroup.ownerId === user?.uid || !user) && !isOwner;

                  return (
                    <div
                      key={member.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isInactive
                          ? 'bg-[var(--mv-bg-secondary)]/50 border-[var(--mv-border)] opacity-60'
                          : 'bg-[var(--mv-surface)] border-[var(--mv-border)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-center font-black text-sm text-[var(--mv-text-primary)] shrink-0">
                          {member.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-[var(--mv-text-primary)] truncate">
                              {member.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold text-[var(--mv-primary)]">(You)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isOwner ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                <Crown size={9} /> Owner
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[var(--mv-bg-secondary)] text-[var(--mv-text-muted)] border border-[var(--mv-border)]">
                                {member.role || 'Member'}
                              </span>
                            )}

                            {isInactive ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-500/15 text-zinc-400">
                                Inactive
                              </span>
                            ) : isPending ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400">
                                Pending Invite
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400">
                                ✓ Joined
                              </span>
                            )}
                          </div>
                          {(member.email || member.phone) && (
                            <p className="text-[10px] text-[var(--mv-text-muted)] truncate">
                              {member.email || member.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setConfirmTransferMember(member)}
                            className="p-2 rounded-xl text-[var(--mv-text-muted)] hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                            title="Transfer Ownership"
                          >
                            <Crown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveMember(member)}
                            className="p-2 rounded-xl text-[var(--mv-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Remove or Deactivate Member"
                          >
                            <UserX size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal: Transfer Ownership */}
      {confirmTransferMember && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mx-auto">
              <Crown size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-[var(--mv-text-primary)]">Transfer Group Ownership</h3>
              <p className="text-xs text-[var(--mv-text-secondary)]">
                Are you sure you want to make <strong className="text-[var(--mv-text-primary)]">{confirmTransferMember.name}</strong> the owner of "{activeGroup.name}"?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmTransferMember(null)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await transferGroupOwnership(activeGroup.id, confirmTransferMember.id);
                  setConfirmTransferMember(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Remove Member */}
      {confirmRemoveMember && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
              <UserX size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-[var(--mv-text-primary)]">Remove Member</h3>
              <p className="text-xs text-[var(--mv-text-secondary)]">
                Remove <strong className="text-[var(--mv-text-primary)]">{confirmRemoveMember.name}</strong> from "{activeGroup.name}"? If they have prior expenses, their financial records will be safely preserved as Inactive.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveMember(null)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await removeGroupMember(activeGroup.id, confirmRemoveMember.id);
                  setConfirmRemoveMember(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {inviteModalOpen && activeGroup && (
        <InviteMemberModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          group={activeGroup}
        />
      )}
      {createModalOpen && (
        <CreateGroupModal
          isOpen={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            setEditingGroup(null);
          }}
          editingGroup={editingGroup}
          onDeleteClick={(group) => handlePromptDeleteGroup(group)}
        />
      )}

      {/* Delete Group Confirmation Dialog (Requirement Bug #1) */}
      {deleteConfirmOpen && groupToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--mv-surface)] rounded-3xl w-full max-w-md p-6 border border-red-500/30 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-[var(--mv-text-primary)]">
                Delete &ldquo;{groupToDelete.name}&rdquo;?
              </h3>
              <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">
                This will permanently remove this group and its shared expenses, settlements, invitations, and group-specific data.
              </p>
              <p className="text-xs font-bold text-red-500 mt-1">
                This action cannot be undone.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-[11px] text-[var(--mv-text-secondary)] flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
              <span>Accounting safety: Linked personal accounting entries will be safely reconciled without corrupting your records.</span>
            </div>

            {deleteError && (
              <div className="p-3 bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373] text-xs font-semibold rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-[var(--mv-border)]">
              <button
                type="button"
                disabled={isDeletingGroup}
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setGroupToDelete(null);
                  setDeleteError(null);
                }}
                className="btn-secondary flex-1 py-2.5 rounded-2xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingGroup}
                onClick={handleConfirmDeleteGroup}
                className="flex-1 py-2.5 rounded-2xl text-xs font-black bg-red-500 hover:bg-red-600 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingGroup ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {expenseModalOpen && activeGroup && (
        <AddGroupExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => {
            setExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          group={activeGroup}
          editingExpense={editingExpense}
        />
      )}

      {settleModalOpen && activeGroup && (
        <SettleUpModal
          isOpen={settleModalOpen}
          onClose={() => {
            setSettleModalOpen(false);
            setActiveRecommendation(null);
          }}
          group={activeGroup}
          initialRecommendation={activeRecommendation}
        />
      )}

      {shareModalOpen && activeGroup && groupSummary && (
        <ShareSummaryModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          group={activeGroup}
          summary={groupSummary}
        />
      )}
    </div>
  );
};
