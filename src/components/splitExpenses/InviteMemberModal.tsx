import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  Copy,
  Check,
  Send,
  AlertCircle,
  Clock,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Eye,
  Share2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useFinTraQ } from '../../context/FinTraQContext';
import { SplitGroup, GroupInvitation } from '../../types/splitExpenses';
import { InvitationDeliveryProvider, ProviderConfig } from '../../services/invitationDeliveryProvider';
import { validateEmail, validatePhone } from '../../utils/invitationValidation';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: SplitGroup;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  group,
}) => {
  const {
    inviteMemberToGroup,
    resendGroupInvitation,
    revokeGroupInvitation,
    groupInvitations,
    user,
  } = useFinTraQ();

  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    text: string;
    token?: string;
    provider?: string;
    delivered?: boolean;
    shareableUrl?: string;
  } | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);

  // Load backend provider config on open
  useEffect(() => {
    if (isOpen) {
      InvitationDeliveryProvider.getProviderConfig().then(setProviderConfig).catch(() => {});
    }
  }, [isOpen]);

  // Tick cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns((prev) => {
        let changed = false;
        const next: Record<string, number> = {};
        for (const [id, sec] of Object.entries(prev)) {
          if (sec > 1) {
            next[id] = sec - 1;
            changed = true;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const currentInvitations = (groupInvitations[group.id] || []).filter(
    (inv) => inv.status !== 'revoked'
  );

  const handleCopyLink = async (token: string) => {
    const url = InvitationDeliveryProvider.getInviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    } catch {
      // Fallback prompt
      window.prompt('Copy invitation link:', url);
    }
  };

  const handleWhatsAppShare = (inv: GroupInvitation) => {
    const url = InvitationDeliveryProvider.getInviteUrl(inv.token);
    const waUrl = InvitationDeliveryProvider.getWhatsAppShareUrl(group.name, url, user?.displayName || undefined);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      if (activeTab === 'email') {
        const val = validateEmail(emailInput);
        if (!val.isValid) {
          setStatusMessage({
            type: 'error',
            text: val.error || 'Please enter a valid email address.',
          });
          setIsSubmitting(false);
          return;
        }

        const { invitation, deliveryResult } = await inviteMemberToGroup(
          group.id,
          val.normalized,
          'email',
          nameInput.trim() || undefined
        );

        setEmailInput('');
        setNameInput('');

        if (deliveryResult.deliveryStatus === 'sent') {
          setStatusMessage({
            type: 'success',
            title: 'Message Sent Successfully',
            text: `Email invitation dispatched to ${val.normalized} via ${deliveryResult.provider || 'configured mailer'}.`,
            token: invitation.token,
            delivered: true,
            shareableUrl: deliveryResult.shareableUrl,
          });
        } else {
          // Requirement 4: DO NOT claim success if external email was not sent
          setStatusMessage({
            type: 'warning',
            title: 'Invitation Created (External Email Not Sent)',
            text: `External email delivery is not configured (${deliveryResult.failureReason || 'RESEND_API_KEY or SMTP required'}). Please copy the secure invitation link below or share via WhatsApp.`,
            token: invitation.token,
            delivered: false,
            shareableUrl: deliveryResult.shareableUrl,
          });
        }
      } else {
        const val = validatePhone(phoneInput);
        if (!val.isValid) {
          setStatusMessage({
            type: 'error',
            text: val.error || 'Please enter a valid mobile number.',
          });
          setIsSubmitting(false);
          return;
        }

        const { invitation, deliveryResult } = await inviteMemberToGroup(
          group.id,
          val.normalized,
          'phone',
          nameInput.trim() || undefined
        );

        setPhoneInput('');
        setNameInput('');

        if (deliveryResult.deliveryStatus === 'sent') {
          setStatusMessage({
            type: 'success',
            title: 'SMS Sent Successfully',
            text: `SMS invitation dispatched to ${val.normalized} via ${deliveryResult.provider || 'Twilio'}.`,
            token: invitation.token,
            delivered: true,
            shareableUrl: deliveryResult.shareableUrl,
          });
        } else {
          // Requirement 9: DO NOT claim success if SMS provider is not configured
          setStatusMessage({
            type: 'warning',
            title: 'Invitation Created (SMS Not Sent)',
            text: `SMS invitations are not configured yet (${deliveryResult.failureReason || 'Twilio credentials required'}). Please share the invitation link directly via WhatsApp or copy link.`,
            token: invitation.token,
            delivered: false,
            shareableUrl: deliveryResult.shareableUrl,
          });
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to dispatch invitation.';
      const isDuplicate = err?.isDuplicate || errMsg.includes('already has a pending invitation');
      setStatusMessage({
        type: isDuplicate ? 'info' : 'error',
        title: isDuplicate ? 'Pending Invitation Exists' : 'Invitation Error',
        text: errMsg,
        token: err?.data?.invitation?.token,
        shareableUrl: err?.shareableUrl,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (invitation: GroupInvitation) => {
    if (cooldowns[invitation.id]) return;

    setResendingId(invitation.id);
    setStatusMessage(null);

    try {
      const res = await resendGroupInvitation(invitation);
      // Set 60-second cooldown
      setCooldowns((prev) => ({ ...prev, [invitation.id]: 60 }));

      if (res.deliveryStatus === 'sent') {
        setStatusMessage({
          type: 'success',
          title: 'Resent Successfully',
          text: `Invitation resent to ${invitation.recipientIdentifier} via ${res.provider}.`,
          token: invitation.token,
          delivered: true,
        });
      } else {
        setStatusMessage({
          type: 'warning',
          title: 'External Delivery Not Configured',
          text: `Resend attempted, but message could not be sent: ${res.failureReason || 'Service not configured'}. Please share the link directly.`,
          token: invitation.token,
          delivered: false,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        title: 'Resend Failed',
        text: err?.message || 'Failed to resend invitation.',
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleRevoke = async (invitation: GroupInvitation) => {
    try {
      await revokeGroupInvitation(group.id, invitation.token);
      setStatusMessage({
        type: 'info',
        title: 'Invitation Revoked',
        text: `Invitation for ${invitation.recipientIdentifier} has been revoked. The link is no longer valid.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to revoke invitation.',
      });
    }
  };

  const sampleInviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/group-invite/sample-token`
    : 'https://moneyvault.app/group-invite/sample-token';

  const previewContent = InvitationDeliveryProvider.generateEmailContent(
    user?.displayName || 'Alvin',
    group.name,
    group.description,
    sampleInviteUrl,
    nameInput.trim() || 'Friend'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--mv-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--mv-text-primary)]">Invite to {group.name}</h2>
              <p className="text-xs text-[var(--mv-text-secondary)]">
                Collaborative workspace invitation with secure token
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

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Local Mode Notice */}
          {!user && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs text-[var(--mv-text-secondary)] space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                <AlertCircle size={15} />
                <span>Local-Only Group Mode</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                This split group and its settlement calculations are stored locally on this device. Real-time multi-device collaboration with external members requires an authenticated cloud account.
              </p>
            </div>
          )}

          {/* Channel Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--mv-bg-secondary)] rounded-2xl border border-[var(--mv-border)]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('email');
                setStatusMessage(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'email'
                  ? 'bg-[var(--mv-surface)] text-[var(--mv-text-primary)] shadow-xs'
                  : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
              }`}
            >
              <Mail size={14} />
              <span>Invite via Email</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('phone');
                setStatusMessage(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'phone'
                  ? 'bg-[var(--mv-surface)] text-[var(--mv-text-primary)] shadow-xs'
                  : 'text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)]'
              }`}
            >
              <Phone size={14} />
              <span>Invite via Phone / SMS</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider mb-1.5">
                Recipient Name (Optional)
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Rahul, Anu, Arjun"
                className="w-full px-4 py-2.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-sm font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
              />
            </div>

            {activeTab === 'email' ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">
                    Email Address *
                  </label>
                  {providerConfig && (
                    <span
                      className={`text-[10px] font-semibold flex items-center gap-1 ${
                        providerConfig.emailConfigured ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${providerConfig.emailConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {providerConfig.emailConfigured
                        ? `${providerConfig.emailProvider || 'Mailer'} active`
                        : 'Provider unconfigured (Manual link/WhatsApp fallback)'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-sm font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                    required
                  />
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--mv-text-muted)]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">
                    Mobile Phone Number *
                  </label>
                  {providerConfig && (
                    <span
                      className={`text-[10px] font-semibold flex items-center gap-1 ${
                        providerConfig.smsConfigured ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${providerConfig.smsConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {providerConfig.smsConfigured ? 'Twilio SMS active' : 'Twilio unconfigured (WhatsApp fallback)'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+91 98765 43210 or 10-digit number"
                    className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-sm font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                    required
                  />
                  <Phone
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--mv-text-muted)]"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--mv-text-muted)] leading-relaxed">
                  Indian numbers normalized automatically. If no SMS provider is configured, you can share via WhatsApp or copy the secure link.
                </p>
              </div>
            )}

            {/* Status Message (Strictly distinguishes Created vs Sent vs Failed) */}
            {statusMessage && (
              <div
                className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                    : statusMessage.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/25 text-red-400'
                    : statusMessage.type === 'warning'
                    ? 'bg-amber-500/10 border border-amber-500/25 text-amber-300'
                    : 'bg-blue-500/10 border border-blue-500/25 text-blue-400'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />
                ) : statusMessage.type === 'warning' ? (
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                )}

                <div className="flex-1 space-y-2 min-w-0">
                  {statusMessage.title && (
                    <div className="font-extrabold uppercase tracking-wide text-[11px]">
                      {statusMessage.title}
                    </div>
                  )}
                  <p className="text-[12px] leading-relaxed text-[var(--mv-text-primary)]">
                    {statusMessage.text}
                  </p>

                  {statusMessage.token && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(statusMessage.token!)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[11px] font-bold text-[var(--mv-primary)] hover:bg-[var(--mv-surface-hover)] transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedToken === statusMessage.token ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy Invitation Link</span>
                          </>
                        )}
                      </button>

                      <a
                        href={InvitationDeliveryProvider.getWhatsAppShareUrl(
                          group.name,
                          InvitationDeliveryProvider.getInviteUrl(statusMessage.token!),
                          user?.displayName || undefined
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-[11px] font-bold hover:bg-[#25D366]/25 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Share2 size={12} />
                        <span>Share on WhatsApp</span>
                      </a>

                      <a
                        href={InvitationDeliveryProvider.getInviteUrl(statusMessage.token!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[11px] font-bold text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink size={12} />
                        <span>Test Link</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {activeTab === 'email' && (
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(!showEmailPreview)}
                  className="text-xs font-bold text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye size={14} />
                  <span>{showEmailPreview ? 'Hide Preview' : 'Email Template Preview'}</span>
                </button>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-2xl bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] text-xs font-extrabold flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-md shadow-[var(--mv-primary)]/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Email Preview Drawer */}
          {showEmailPreview && (
            <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--mv-text-primary)]">Preview: {previewContent.subject}</span>
                <span className="text-[10px] text-[var(--mv-text-muted)]">Money Vault Standard Template</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs text-[var(--mv-text-secondary)] whitespace-pre-line leading-relaxed font-mono text-[11px]">
                {previewContent.text}
              </div>
            </div>
          )}

          {/* Pending Invitations List (Requirement 8 & 15) */}
          <div className="pt-4 border-t border-[var(--mv-border)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--mv-text-secondary)] uppercase tracking-wider">
                Group Invitations ({currentInvitations.length})
              </h3>
              <span className="text-[11px] text-[var(--mv-text-muted)]">Valid for 7 days</span>
            </div>

            {currentInvitations.length === 0 ? (
              <p className="text-xs text-[var(--mv-text-muted)] italic py-2">
                No active invitations yet. Enter an email or phone number above to invite collaborators.
              </p>
            ) : (
              <div className="space-y-2">
                {currentInvitations.map((inv) => {
                  const isExpired = inv.expiresAt < Date.now();
                  const isAccepted = inv.status === 'accepted';
                  const isPending = inv.status === 'pending' && !isExpired;
                  const cd = cooldowns[inv.id] || 0;

                  return (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[var(--mv-text-primary)] truncate">
                            {inv.recipientName ? `${inv.recipientName} (${inv.recipientIdentifier})` : inv.recipientIdentifier}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              isAccepted
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : isExpired
                                ? 'bg-zinc-500/15 text-zinc-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {isAccepted ? 'Joined' : isExpired ? 'Expired' : 'Pending'}
                          </span>

                          {/* Delivery Status Badge (Strict distinction) */}
                          {inv.deliveryStatus === 'sent' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ✓ {inv.recipientType === 'email' ? 'Email Sent' : 'SMS Sent'} ({inv.deliveryProvider || 'Delivered'})
                            </span>
                          ) : (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              title={inv.failureReason || 'Provider unconfigured'}
                            >
                              ⚠ Message Not Sent
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--mv-text-muted)]">
                          Invited by {inv.invitedByName} • {inv.recipientType === 'email' ? 'Email' : 'Mobile Phone'}
                          {inv.failureReason && inv.deliveryStatus !== 'sent' && (
                            <span className="text-amber-400/80 block mt-0.5 truncate">
                              Notice: {inv.failureReason}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(inv.token)}
                          title="Copy Invitation Link"
                          className="p-2 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
                        >
                          {copiedToken === inv.token ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleWhatsAppShare(inv)}
                          title="Share on WhatsApp"
                          className="p-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20 transition-colors cursor-pointer"
                        >
                          <Share2 size={14} />
                        </button>

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleResend(inv)}
                              disabled={cd > 0 || resendingId === inv.id}
                              title={cd > 0 ? `Wait ${cd}s to resend` : 'Resend Invitation'}
                              className="p-2 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer disabled:opacity-40"
                            >
                              {resendingId === inv.id ? (
                                <RefreshCw size={14} className="animate-spin text-[var(--mv-primary)]" />
                              ) : cd > 0 ? (
                                <span className="text-[10px] font-mono font-bold">{cd}s</span>
                              ) : (
                                <RefreshCw size={14} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevoke(inv)}
                              title="Revoke Invitation"
                              className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
