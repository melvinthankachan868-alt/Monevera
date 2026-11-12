import React,{ useState } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { firebaseConfig } from '../lib/firebase/config';
import {
User as UserIcon,
LogIn,
LogOut,
X,
ShieldCheck,
Cloud,
Trash2,
AlertTriangle,
RefreshCw,
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    deleteUserAccount,
    cloudSyncStatus,
    lastSyncedAt,
    isAuthLoading,
    authError,
    setAuthError,
    sendPasswordReset,
  } = useFinTraQ();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn('Google sign-in attempt notice:', err);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setAuthError('Please enter your email address above to receive a password reset link.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    setAuthError(null);
    setIsResetting(true);
    try {
      await sendPasswordReset(cleanEmail);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 8000);
    } catch (err: any) {
      console.warn('Password reset notice:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    try {
      if (isSignUp) {
        await signUpWithEmail(cleanEmail, password, displayName.trim());
      } else {
        await signInWithEmail(cleanEmail, password);
      }
    } catch (err: any) {
      console.warn('Email auth notice:', err?.code || 'auth-error');
      let userMsg = err?.message || 'Authentication failed. Please try again.';
      if (err?.code === 'auth/operation-not-allowed') {
        userMsg = isSignUp
          ? `Email & Password registration request was rejected by Firebase (auth/operation-not-allowed). Please verify provider enablement and project configuration in ${firebaseConfig.projectId}.`
          : `Email & Password sign-in request was rejected by Firebase (auth/operation-not-allowed). Please verify provider enablement and project configuration in ${firebaseConfig.projectId}.`;
      } else if (err?.code === 'auth/email-already-in-use') {
        userMsg = 'This email is already registered. Please sign in instead.';
      } else if (err?.code === 'auth/weak-password') {
        userMsg = 'Password is too weak. Please use at least 6 characters.';
      } else if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
      ) {
        userMsg = 'Invalid email or password. Please verify your credentials.';
      } else if (err?.code === 'auth/network-request-failed') {
        userMsg = 'Network connection failure. Please check your internet connection.';
      } else if (err?.code === 'auth/too-many-requests') {
        userMsg = 'Too many attempts. Access is temporarily suspended. Please try again later or reset password.';
      }
      setAuthError(userMsg);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await deleteUserAccount();
      setConfirmDelete(false);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="vault-panel rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 border border-[var(--mv-border)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--mv-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center">
              <UserIcon size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[var(--mv-text-primary)]">Account & Cloud Sync</h2>
              <span className="text-[11px] text-[var(--mv-text-secondary)]">Firebase Auth + Cloud Firestore</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[var(--mv-surface-elevated)] border border-[var(--mv-border)] hover:bg-[var(--mv-surface-hover)] flex items-center justify-center text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* User Info / Sign In */}
        {user ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-12 h-12 rounded-2xl object-cover border border-[var(--mv-primary)]/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center font-bold text-lg">
                  {user.displayName ? user.displayName[0] : 'U'}
                </div>
              )}
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-[var(--mv-text-primary)] truncate block">
                    {user.displayName || 'Authenticated User'}
                  </span>
                  {user.emailVerified && (
                    <ShieldCheck size={14} className="text-[var(--mv-income)] shrink-0" />
                  )}
                </div>
                <span className="text-[11px] text-[var(--mv-text-secondary)] truncate block">{user.email}</span>
                <span className="text-[9px] text-[var(--mv-text-muted)] font-mono block mt-0.5 truncate">
                  UID: {user.uid}
                </span>
              </div>
            </div>

            {/* Cloud Sync State */}
            <div className="p-3 rounded-2xl bg-[var(--mv-income)]/15 border border-[var(--mv-income)]/30 flex items-center justify-between text-xs text-[var(--mv-income)] font-semibold">
              <div className="flex items-center gap-2">
                <Cloud size={16} className="text-[var(--mv-income)]" />
                <span>
                  {cloudSyncStatus === 'synced'
                    ? 'Cloud Firestore Synced'
                    : cloudSyncStatus === 'syncing'
                    ? 'Syncing with Cloud...'
                    : 'Offline Mode'}
                </span>
              </div>
              {lastSyncedAt && (
                <span className="text-[10px] text-[var(--mv-income)]/80 font-normal">
                  {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {/* Sign Out Action */}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                onClose();
              }}
              className="btn-secondary w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>

            {/* Danger Zone: Delete Account */}
            <div className="pt-2 border-t border-[var(--mv-border)] space-y-2">
              <span className="text-[11px] font-bold text-[#FF7373] uppercase tracking-wider block">
                Danger Zone
              </span>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="btn-danger w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete Account & Financial Data</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#2D1616] border border-[#FF7373]/30 space-y-2.5 text-xs text-[#FF7373]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={15} className="text-[#FF7373]" />
                    <span>Confirm Permanent Deletion</span>
                  </div>
                  <p className="text-[11px] text-[#FF7373]/80 leading-relaxed">
                    This will permanently delete your authentication record and all financial documents
                    under your UID in Cloud Firestore. This action cannot be undone.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                      Type <b>DELETE</b> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="DELETE"
                      className="w-full px-3 py-1.5 text-xs bg-[var(--mv-bg-secondary)] text-[var(--mv-text-primary)] rounded-lg border border-[#FF7373]/50 focus:outline-none focus:border-[#FF7373]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={deleteInput !== 'DELETE' || isDeleting}
                      onClick={handleDelete}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#FF7373] hover:bg-[#FF8585] disabled:opacity-40 text-[#0B0D0C] font-black text-xs cursor-pointer"
                    >
                      {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDelete(false);
                        setDeleteInput('');
                      }}
                      className="btn-secondary py-2 px-3 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Local-Only Mode Status Card */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Local-Only Vault Mode
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  Active
                </span>
              </div>
              <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">
                All records, transactions, and budgets are saved <b>locally on this device</b> in your browser's private IndexedDB storage.
              </p>
              <div className="text-[11px] text-[var(--mv-text-muted)] flex items-center gap-1.5 pt-1 border-t border-emerald-500/15">
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                <span>Private & offline-first. Local records do not sync across devices unless you connect an account.</span>
              </div>
            </div>

            <div className="text-center space-y-2 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] mx-auto flex items-center justify-center">
                <Cloud size={24} />
              </div>
              <h3 className="text-sm font-extrabold text-[var(--mv-text-primary)]">Optional Cloud Sync</h3>
              <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed max-w-xs mx-auto">
                Connect your account if you want multi-device synchronization and automatic cloud backups.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373] text-xs font-semibold rounded-2xl flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isAuthLoading}
              onClick={handleGoogleSignIn}
              className="btn-primary w-full py-3.5 px-4 rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              {isAuthLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Connect with Google</span>
                </>
              )}
            </button>

            {/* Email / Password fallback toggle */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowEmailAuth(!showEmailAuth);
                  setAuthError(null);
                }}
                className="text-xs text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] underline font-medium cursor-pointer"
              >
                {showEmailAuth ? 'Hide email option' : 'Or use Email & Password'}
              </button>
            </div>

            {showEmailAuth && (
              <form onSubmit={handleEmailAuthSubmit} className="space-y-3 p-4 rounded-2xl bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] animate-in fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-[var(--mv-border)] text-xs font-bold">
                  <span>{isSignUp ? 'Create New Account' : 'Sign In with Email'}</span>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-[var(--mv-primary)] hover:underline cursor-pointer"
                  >
                    {isSignUp ? 'Have an account? Log in' : 'New user? Register'}
                  </button>
                </div>

                {isSignUp && (
                  <div>
                    <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)]"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--mv-text-secondary)] block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 text-xs bg-[var(--mv-surface)] text-[var(--mv-text-primary)] rounded-xl border border-[var(--mv-border)] focus:outline-none focus:border-[var(--mv-primary)]"
                  />
                </div>

                {!isSignUp && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={handleForgotPassword}
                      className="text-[11px] text-[var(--mv-text-secondary)] hover:text-[var(--mv-primary)] underline font-medium cursor-pointer"
                    >
                      {isResetting ? 'Sending reset link...' : 'Forgot password?'}
                    </button>
                  </div>
                )}

                {resetSent && (
                  <div className="p-3 bg-[var(--mv-income)]/15 border border-[var(--mv-income)]/30 text-[var(--mv-income)] text-xs font-semibold rounded-xl flex items-start gap-2">
                    <ShieldCheck size={15} className="shrink-0 mt-0.5" />
                    <span>Password reset email sent. Please check your inbox.</span>
                  </div>
                )}

                {authError && (
                  <div className="p-3 bg-[#2D1616] border border-[#FF7373]/30 text-[#FF7373] text-xs font-semibold rounded-xl flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="btn-primary w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAuthLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
