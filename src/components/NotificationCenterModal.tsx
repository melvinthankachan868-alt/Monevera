import React,{ useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR } from '../utils/calculations';
import {
Bell,
CheckCircle2,X,Trash2,
ExternalLink,SlidersHorizontal
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    markNotificationRead,
    resolveNotification,
    clearAllNotifications,
    setActiveTab,
    setAlertsModalOpen,
  } = useFinTraQ();

  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'resolved'>('all');

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = notifications.filter((n) => {
    if (filter === 'resolved') return n.resolved;
    if (filter === 'overdue') return n.title.toLowerCase().includes('overdue');
    if (filter === 'today') return n.dueDate === todayStr;
    return !n.resolved;
  });

  const handleOpenRelated = (item: any) => {
    onClose();
    if (item.relatedRecordType === 'moneyOwed') {
      setActiveTab('money_owed');
    } else if (item.relatedRecordType === 'loan') {
      setActiveTab('loans');
    } else if (item.relatedRecordType === 'bill' || item.relatedRecordType === 'subscription') {
      setActiveTab('reminders');
    } else if (item.relatedRecordType === 'emergencyFund') {
      setActiveTab('emergency_fund');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      await markNotificationRead(n.id);
    }
  };

  const handleOpenAlertSettings = () => {
    onClose();
    setActiveTab('alerts');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="vault-panel rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[var(--mv-border)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C1A14] border border-[#F4D35E]/30 text-[#F4D35E] flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--mv-text-primary)]">Notifications & Alert Center</h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">Payment reminders, overdue alerts, and threshold triggers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAlertSettings}
              className="p-2 rounded-xl bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] hover:bg-[#252B27] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
              title="Configure Alert Rules"
            >
              <SlidersHorizontal size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] hover:bg-[#252B27] flex items-center justify-center text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Quick Actions */}
        <div className="flex items-center justify-between border-b border-[var(--mv-border)] px-5 pt-2 text-xs font-bold">
          <div className="flex gap-4">
            {[
              { id: 'all', label: `Active (${notifications.filter((n) => !n.resolved).length})` },
              { id: 'today', label: 'Due Today' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'resolved', label: `Resolved (${notifications.filter((n) => n.resolved).length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as any)}
                className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'border-[#A8F34A] text-[#A8F34A]'
                    : 'border-transparent text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {notifications.some((n) => !n.read) && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] pb-2 font-bold text-[var(--mv-primary)] hover:underline cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <CheckCircle2 size={32} className="text-[#78D64B] mx-auto" />
              <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">No notifications</h3>
              <p className="text-xs text-[var(--mv-text-secondary)]">You are all caught up on all financial obligations.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const isOverdue = item.title.toLowerCase().includes('overdue');
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all space-y-2 ${
                    item.resolved
                      ? 'bg-[var(--mv-bg-secondary)] border-[var(--mv-border)] opacity-60'
                      : isOverdue
                      ? 'bg-[#2D1616] border-[#FF7373]/30'
                      : 'vault-card border-[var(--mv-border)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[var(--mv-text-primary)] text-xs">{item.title}</span>
                        {!item.read && !item.resolved && (
                          <span className="w-2 h-2 rounded-full bg-[#A8F34A] animate-pulse" />
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
                      <p className="text-[11px] text-[var(--mv-text-secondary)] mt-1">{item.reason}</p>
                    </div>

                    {item.amount !== undefined && (
                      <span className="font-extrabold text-[var(--mv-text-primary)] text-xs tabular-nums shrink-0">
                        {formatINR(item.amount)}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[var(--mv-border)] text-[10px]">
                    <span className="text-[var(--mv-text-muted)]">
                      {new Date(item.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>

                    <div className="flex items-center gap-3">
                      {item.relatedRecordType && (
                        <button
                          type="button"
                          onClick={() => handleOpenRelated(item)}
                          className="font-bold text-[#A8F34A] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Record</span>
                          <ExternalLink size={11} />
                        </button>
                      )}
                      {!item.read && (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(item.id)}
                          className="font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] hover:underline cursor-pointer"
                        >
                          Mark as read
                        </button>
                      )}
                      {!item.resolved && (
                        <button
                          type="button"
                          onClick={() => resolveNotification(item.id)}
                          className="font-bold text-[#78D64B] hover:underline cursor-pointer"
                        >
                          Mark as resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--mv-bg-secondary)] border-t border-[var(--mv-border)] flex items-center justify-between text-xs text-[var(--mv-text-secondary)]">
          <button
            type="button"
            onClick={clearAllNotifications}
            className="text-[#FF7373] hover:underline flex items-center gap-1 font-bold cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Clear history</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAlertSettings}
              className="btn-secondary px-3.5 py-2 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1"
            >
              <SlidersHorizontal size={13} />
              <span>Configure Rules</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary px-4 py-2 font-bold text-xs rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
