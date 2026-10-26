import React, { useState } from 'react';
import { X, Users, Plus, Trash2, Check, Sparkles } from 'lucide-react';
import { useFinTraQ } from '../../context/FinTraQContext';
import { SplitGroup } from '../../types/splitExpenses';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGroup?: SplitGroup | null;
  onDeleteClick?: (group: SplitGroup) => void;
}

const PRESET_ICONS = ['Users', 'Plane', 'Home', 'Utensils', 'Car', 'ShoppingBag', 'PartyPopper', 'Briefcase'];
const PRESET_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#14B8A6'];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  editingGroup,
  onDeleteClick,
}) => {
  const { createSplitGroup, updateSplitGroup, user } = useFinTraQ();

  const [name, setName] = useState(editingGroup?.name || '');
  const [description, setDescription] = useState(editingGroup?.description || '');
  const [selectedColor, setSelectedColor] = useState(editingGroup?.color || '#10B981');
  const [selectedIcon, setSelectedIcon] = useState(editingGroup?.icon || 'Users');

  // Members list (excluding "You" who is added automatically)
  const [members, setMembers] = useState<Array<{ id?: string; name: string; email?: string }>>(() => {
    if (editingGroup) {
      return editingGroup.members
        .filter((m) => !m.isCurrentUser && !m.isInactive)
        .map((m) => ({ id: m.id, name: m.name, email: m.email }));
    }
    return [{ name: '' }, { name: '' }];
  });

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddMemberRow = () => {
    setMembers((prev) => [...prev, { name: '' }]);
  };

  const handleRemoveMemberRow = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMemberChange = (idx: number, field: 'name' | 'email', val: string) => {
    setMembers((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a group name (e.g. Trip to Goa, Flatmates).');
      return;
    }

    const validOtherMembers = members
      .map((m) => ({ name: m.name.trim(), email: m.email?.trim() || undefined }))
      .filter((m) => m.name.length > 0);

    if (validOtherMembers.length === 0) {
      setError('Please add at least 1 other member to split expenses with.');
      return;
    }

    try {
      if (editingGroup) {
        // Updating group: preserve existing members and add new ones
        const currentMe = editingGroup.members.find((m) => m.isCurrentUser) || {
          id: 'member-me',
          name: user?.displayName ? user.displayName.split(' ')[0] : 'You',
          isCurrentUser: true,
        };

        const existingOtherMembers = editingGroup.members.filter((m) => !m.isCurrentUser);
        // Map updated names
        const updatedMembers = [currentMe];

        validOtherMembers.forEach((vm, idx) => {
          const matchExisting = existingOtherMembers[idx];
          if (matchExisting) {
            updatedMembers.push({
              ...matchExisting,
              name: vm.name,
              email: vm.email,
              isInactive: false,
            });
          } else {
            updatedMembers.push({
              id: `mem-${Date.now()}-${idx}`,
              name: vm.name,
              email: vm.email,
              isCurrentUser: false,
            });
          }
        });

        await updateSplitGroup({
          ...editingGroup,
          name: name.trim(),
          description: description.trim() || undefined,
          color: selectedColor,
          icon: selectedIcon,
          members: updatedMembers,
        });
      } else {
        await createSplitGroup(name.trim(), description.trim(), validOtherMembers, selectedIcon, selectedColor);
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save group');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
              style={{ backgroundColor: selectedColor }}
            >
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--mv-text-primary)]">
                {editingGroup ? 'Edit Group' : 'Create Split Group'}
              </h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">
                Manage trips, flatmates, dinners &amp; shared bills
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] rounded-full hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-2xl">
              {error}
            </div>
          )}

          {/* Group Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1.5">
                Group Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Trip to Goa, Flatmates 402, Office Lunch"
                className="w-full px-4 py-2.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-sm font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Weekend vacation with college friends"
                className="w-full px-4 py-2 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-medium text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              />
            </div>
          </div>

          {/* Color & Theme */}
          <div>
            <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-2">
              Group Accent Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                    selectedColor === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[var(--mv-surface)]' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {selectedColor === c && <Check size={14} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">
                Group Members ({members.filter((m) => m.name.trim()).length + 1})
              </label>
              <span className="text-[11px] font-semibold text-[var(--mv-primary)]">
                Default Currency: ₹ INR
              </span>
            </div>

            {/* Current User chip (Always included as You) */}
            <div className="p-3 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] font-black text-xs flex items-center justify-center">
                  ME
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--mv-text-primary)]">
                    {user?.displayName ? user.displayName.split(' ')[0] : 'You'}
                  </span>
                  <span className="ml-2 text-[10px] font-semibold text-[var(--mv-text-muted)] bg-[var(--mv-surface)] px-1.5 py-0.5 rounded-full border border-[var(--mv-border)]">
                    Owner
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[var(--mv-text-muted)]">Automatic</span>
            </div>

            {/* Other Members Inputs */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {members.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                    placeholder={`Member ${idx + 1} Name (e.g. Rahul, Anu)`}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                  />
                  <input
                    type="text"
                    value={m.email || ''}
                    onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                    placeholder="Email / Phone (Optional)"
                    className="w-36 hidden sm:block px-3 py-2 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-normal text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMemberRow(idx)}
                      className="p-2 text-[var(--mv-text-muted)] hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddMemberRow}
              className="w-full py-2 rounded-2xl border border-dashed border-[var(--mv-border)] hover:border-[var(--mv-primary)] text-xs font-bold text-[var(--mv-primary)] hover:bg-[var(--mv-primary)]/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Another Member</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[var(--mv-border)]">
            {editingGroup && onDeleteClick ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteClick(editingGroup);
                }}
                className="px-3 py-2 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete Group</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] shadow-md hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>{editingGroup ? 'Save Changes' : 'Create Group'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
