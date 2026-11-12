import React,{ useState,useEffect } from 'react';
import {
Users,
CheckCircle2,
AlertCircle,ArrowRight,LogIn,
UserPlus,
Mail,
Lock,
User,
AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useFinTraQ } from '../../context/FinTraQContext';
import { GroupInvitation,SplitGroup } from '../../types/splitExpenses';
import {
fetchGroupInvitationByToken,
updateGroupInvitationStatus,
fetchSharedGroup,
} from '../../db/cloudFirestore';
import { MoneyVaultLogo } from '../MoneyVaultLogo';

interface GroupInviteViewProps {
  token: string;
  onJoined: (group: SplitGroup) => void;
  onCancel: () => void;
}

export const GroupInviteView: React.FC<GroupInviteViewProps> = ({
  token,
  onJoined,
  onCancel,
}) => {
  const {
    user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    joinGroupByInvitation,
    theme,
  } = useFinTraQ();

  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
  const [groupPreview, setGroupPreview] = useState<SplitGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [confirmMismatchedIdentity, setConfirmMismatchedIdentity] = useState(false);

  // Auth form state if not signed in
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const isEmailMismatched = Boolean(
    user?.email &&
      invitation?.recipientType === 'email' &&
      invitation?.recipientEmail &&
      user.email.toLowerCase() !== invitation.recipientEmail.toLowerCase()
  );

  useEffect(() => {
    let isMounted = true;

    async function loadInvite() {
      setIsLoading(true);
      setError(null);
      try {
        const inv = await fetchGroupInvitationByToken(token);
        if (!isMounted) return;

        if (!inv) {
          setError('This invitation link could not be found or has been removed.');
          setIsLoading(false);
          return;
        }

        if (inv.status === 'revoked') {
          setError('This invitation has been revoked by the group owner.');
          setInvitation(inv);
          setIsLoading(false);
          return;
        }

        if (inv.expiresAt < Date.now()) {
          setError('This invitation link expired after 7 days. Please request a new invite from the group owner.');
          setInvitation(inv);
          setIsLoading(false);
          return;
        }

        setInvitation(inv);

        // Pre-fill email in auth form if invited by email
        if (inv.recipientType === 'email' && (inv.recipientEmail || inv.recipientIdentifier)) {
          setEmail(inv.recipientEmail || inv.recipientIdentifier);
        }

        // Fetch basic preview details of group without exposing private finances
        const grp = await fetchSharedGroup(inv.groupId);
        if (isMounted && grp) {
          setGroupPreview(grp);
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load invitation.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInvite();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    if (isEmailMismatched && !confirmMismatchedIdentity) {
      setError('Please check the confirmation box to join with your current account.');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const res = await joinGroupByInvitation(token, { confirmMismatchedIdentity });
      if (res.success && res.group) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        onJoined(res.group);
      } else {
        setError(res.error || 'Failed to join group.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred while joining.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleDecline = async () => {
    try {
      await updateGroupInvitationStatus(token, 'declined');
    } catch (e) {
      console.warn(e);
    }
    onCancel();
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        if (!displayName.trim()) {
          setAuthError('Please enter your name.');
          setAuthLoading(false);
          return;
        }
        await signUpWithEmail(email.trim(), password, displayName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      // User will be authenticated; join action can be clicked next or automatic
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--mv-bg-primary)] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] flex items-center justify-center animate-pulse mb-4">
          <Users size={24} />
        </div>
        <p className="text-sm font-bold text-[var(--mv-text-secondary)]">Loading invitation details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--mv-bg-primary)] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <MoneyVaultLogo variant="mark" theme={theme} size="md" />
          <div>
            <h1 className="text-xl font-black text-[var(--mv-text-primary)] tracking-tight">MONEY VAULT</h1>
            <p className="text-xs font-semibold text-[var(--mv-text-muted)] uppercase tracking-wider">
              Collaborative Group Workspace
            </p>
          </div>
        </div>

        {/* Invitation Card */}
        <div className="bg-[var(--mv-surface)] border border-[var(--mv-border)] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--mv-primary)]/5 rounded-full blur-2xl pointer-events-none" />

          {error && !invitation ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 mx-auto flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-[var(--mv-text-primary)]">Invalid Invitation</h2>
                <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">{error}</p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2.5 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
              >
                Go to Money Vault
              </button>
            </div>
          ) : invitation ? (
            <div className="space-y-6">
              {/* Group Name & Inviter */}
              <div className="text-center space-y-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] uppercase tracking-wider">
                  You're Invited
                </span>
                <h2 className="text-2xl font-black text-[var(--mv-text-primary)] pt-1">
                  {invitation.groupName}
                </h2>
                {invitation.groupDescription && (
                  <p className="text-xs text-[var(--mv-text-secondary)]">
                    {invitation.groupDescription}
                  </p>
                )}
                <p className="text-xs text-[var(--mv-text-muted)] pt-1">
                  Invited by <strong className="text-[var(--mv-text-primary)]">{invitation.invitedByName}</strong>
                </p>
              </div>

              {/* Members Preview */}
              {groupPreview && (
                <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--mv-text-secondary)]">
                    <span>Members ({groupPreview.members.filter((m) => !m.isInactive).length})</span>
                    <span className="text-[11px] font-semibold text-[var(--mv-primary)]">
                      Your Role: Member
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {groupPreview.members
                      .filter((m) => !m.isInactive)
                      .slice(0, 8)
                      .map((m) => (
                        <span
                          key={m.id}
                          className="px-2.5 py-1 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[11px] font-bold text-[var(--mv-text-secondary)]"
                        >
                          {m.name}
                        </span>
                      ))}
                    {groupPreview.members.length > 8 && (
                      <span className="px-2 py-1 rounded-xl bg-[var(--mv-surface)] text-[11px] text-[var(--mv-text-muted)]">
                        +{groupPreview.members.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Feature Points */}
              <div className="space-y-2 text-xs text-[var(--mv-text-secondary)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[var(--mv-primary)] shrink-0" />
                  <span>Add and manage your own group expenses</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[var(--mv-primary)] shrink-0" />
                  <span>Real-time automatic balance calculation in ₹ INR</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[var(--mv-primary)] shrink-0" />
                  <span>Optimized settlement plan with zero duplicate entries</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* State A: Current User Signed In */}
              {user ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[var(--mv-primary)]/20 text-[var(--mv-primary)] flex items-center justify-center font-bold text-xs">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-[var(--mv-text-primary)] truncate">
                          {user.displayName || 'Current User'}
                        </div>
                        <div className="text-[11px] text-[var(--mv-text-muted)] truncate">{user.email}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                      Signed In
                    </span>
                  </div>

                  {/* Identity Mismatch Warning (Requirement 22) */}
                  {isEmailMismatched && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-left">
                      <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
                        <AlertTriangle size={16} />
                        <span>Account Mismatch Notice</span>
                      </div>
                      <p className="text-[11px] text-[var(--mv-text-secondary)] leading-relaxed">
                        This invitation was originally issued for{' '}
                        <strong className="text-[var(--mv-text-primary)]">{invitation.recipientEmail}</strong>, but you
                        are currently signed in as{' '}
                        <strong className="text-[var(--mv-text-primary)]">{user.email}</strong>.
                      </p>
                      <label className="flex items-start gap-2.5 pt-1 text-[11px] font-semibold text-[var(--mv-text-primary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmMismatchedIdentity}
                          onChange={(e) => setConfirmMismatchedIdentity(e.target.checked)}
                          className="mt-0.5 rounded text-[var(--mv-primary)] accent-[var(--mv-primary)]"
                        />
                        <span>I confirm I want to join this group using {user.email}</span>
                      </label>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={isJoining || (isEmailMismatched && !confirmMismatchedIdentity)}
                    className="w-full py-3.5 rounded-2xl bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] text-sm font-extrabold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-lg shadow-[var(--mv-primary)]/20 disabled:opacity-50"
                  >
                    {isJoining ? (
                      <span>Joining Group...</span>
                    ) : (
                      <>
                        <span>Join {invitation.groupName}</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDecline}
                    className="w-full py-2.5 text-xs font-bold text-[var(--mv-text-muted)] hover:text-[var(--mv-text-primary)] transition-colors cursor-pointer"
                  >
                    Decline Invitation
                  </button>
                </div>
              ) : (
                /* State B: User NOT Signed In */
                <div className="space-y-4 pt-2">
                  <div className="text-center">
                    <p className="text-xs font-bold text-[var(--mv-text-secondary)]">
                      Sign in or create your account to join
                    </p>
                  </div>

                  {/* Google Sign In */}
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-bold text-[var(--mv-text-primary)] flex items-center justify-center gap-2.5 hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[var(--mv-border)]" />
                    <span className="text-[10px] font-bold text-[var(--mv-text-muted)] uppercase">
                      or with email
                    </span>
                    <div className="flex-1 h-px bg-[var(--mv-border)]" />
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
                    {authMode === 'signup' && (
                      <div className="relative">
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your Full Name"
                          required
                          className="w-full px-3.5 py-2 pl-9 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                        />
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mv-text-muted)]" />
                      </div>
                    )}

                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        required
                        className="w-full px-3.5 py-2 pl-9 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                      />
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mv-text-muted)]" />
                    </div>

                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full px-3.5 py-2 pl-9 rounded-xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] text-xs font-semibold text-[var(--mv-text-primary)] focus:outline-none focus:border-[var(--mv-primary)]"
                      />
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mv-text-muted)]" />
                    </div>

                    {authError && (
                      <p className="text-[11px] text-red-400 font-semibold">{authError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 rounded-xl bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] text-xs font-extrabold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                    >
                      {authLoading ? (
                        <span>Processing...</span>
                      ) : authMode === 'signup' ? (
                        <>
                          <UserPlus size={14} />
                          <span>Create Account & Continue</span>
                        </>
                      ) : (
                        <>
                          <LogIn size={14} />
                          <span>Sign In & Continue</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                      className="text-[11px] font-bold text-[var(--mv-primary)] hover:underline cursor-pointer"
                    >
                      {authMode === 'signup'
                        ? 'Already have an account? Sign In'
                        : "Don't have an account? Create one"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
