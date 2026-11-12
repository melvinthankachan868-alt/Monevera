import React,{ useState,useRef,useEffect } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { formatINR,toDateString } from '../utils/calculations';
import { ChatMessage } from '../types';
import {
Sparkles,
Send,
Trash2,User,
Camera,
CheckCircle2,
AlertCircle,Receipt,Check,
Edit2,
RefreshCw,
LogIn
} from 'lucide-react';
import { AccountModal } from '../components/AccountModal';
import { SIGN_IN_PROMPT,SESSION_EXPIRED_MSG,getAiErrorMessage } from '../utils/aiErrorHelper';

const EMPTY_MESSAGES: ChatMessage[] = [];

export const AIScreen: React.FC = () => {
  const {
    askFinTraQAI,
    chatMessages,
    isAiLoading,
    aiStatusError,
    clearAiStatusError,
    clearChatMessages,
    addExpense,
    setQuickAddOpen,
    setReceiptScanModalOpen,
    user,
  } = useFinTraQ();

  const visibleMessages = user ? chatMessages : EMPTY_MESSAGES;

  const [inputPrompt, setInputPrompt] = useState('');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});
  const [cancelledActions, setCancelledActions] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [visibleMessages, isAiLoading, isProcessingReceipt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isAiLoading) return;
    clearAiStatusError();
    const q = inputPrompt.trim();
    setInputPrompt('');
    await askFinTraQAI(q);
  };

  const handleActionExecute = async (msgId: string, action: NonNullable<ChatMessage['actionProposal']>) => {
    try {
      let bucketCategory: any = 'Wants';
      if (
        action.category === 'Groceries' ||
        action.category === 'Utilities' ||
        action.category === 'Healthcare' ||
        action.category === 'Transportation'
      ) {
        bucketCategory = 'Needs';
      }

      await addExpense({
        category: bucketCategory,
        subcategory: action.subcategory || action.category || 'Expense',
        amount: Math.round(action.amount),
        note: action.note || 'Logged via Mike Assistant',
        date: action.date || toDateString(new Date()),
        paymentMethod: 'UPI',
      });

      setExecutedActions((prev) => ({ ...prev, [msgId]: true }));
    } catch (err) {
      console.error('Failed to execute action:', err);
    }
  };

  const handleActionCancel = (msgId: string) => {
    setCancelledActions((prev) => ({ ...prev, [msgId]: true }));
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file triggers event
    e.target.value = '';

    // File validation
    if (file.size === 0) {
      setUploadError('The selected file is empty (0 bytes).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit. Please upload a smaller photo.');
      return;
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!validMimes.includes(file.type.toLowerCase()) && !hasValidExt) {
      setUploadError('Invalid file type. Please upload a valid JPG, PNG, or WEBP receipt photo.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setUploadError('Could not read image file. Please try again.');
    };
    reader.onload = async (evt) => {
      const b64 = evt.target?.result as string;
      await processReceiptInChat(b64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const processReceiptInChat = async (base64Data: string, mime: string) => {
    setIsProcessingReceipt(true);
    setUploadError(null);
    clearAiStatusError();

    // (1) If there is no signed-in user, do not call the server.
    if (!user) {
      setIsProcessingReceipt(false);
      setUploadError(SIGN_IN_PROMPT);
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      try {
        const token = await user.getIdToken();
        if (token && typeof token === 'string' && token.trim().length > 0) {
          headers['Authorization'] = `Bearer ${token.trim()}`;
        }
      } catch {
        // fallback
      }

      const res = await fetch('/api/ocr/receipt', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mime,
        }),
      });

      if (!res.ok) {
        // Map status codes to honest messages: 401, 429, 503, other
        const msg = getAiErrorMessage(res.status);
        setUploadError(msg);
        return;
      }

      const data = await res.json();
      const ext = data.extracted || {};
      const amt = ext.amount || 0;
      const merchant = ext.merchant && ext.merchant !== 'Not detected' ? ext.merchant : 'Merchant';
      const cat = ext.category || 'Shopping';
      const dateStr = ext.date || toDateString(new Date());

      // Ask Gemini with this context
      await askFinTraQAI(
        `I scanned a receipt for ${merchant} of ₹${amt} on ${dateStr} for ${cat}. Please prepare the action proposal to record this expense.`
      );
    } catch (err: any) {
      console.error('Chat receipt error:', err);
      setUploadError(getAiErrorMessage(500));
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  const quickActions = [
    { label: '📷 Scan Receipt', action: () => setReceiptScanModalOpen(true) },
    { label: '📊 Check Budget', prompt: 'How is my 50/30/20 budget performing this month?' },
    { label: '📈 Stock Discovery', prompt: 'Tell me about high-growth companies with strong balance sheets and positive free cash flow in the Money Vault Research Engine.' },
    { label: '🔍 Where Is My Money Going?', prompt: 'Where is my money going? Give me an expense breakdown.' },
    { label: '📅 Upcoming Bills', prompt: 'What are my upcoming bills and EMI payments?' },
    { label: '🛡️ Savings Progress', prompt: 'How is my emergency fund and savings progress?' },
    { label: '🤝 Money Owed Status', prompt: 'Summarize money owed to me vs money I need to repay.' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] max-w-4xl mx-auto pb-2 animate-in fade-in duration-300">
      {/* Mike Header */}
      <div className="flex items-center justify-between py-3.5 border-b border-[var(--mv-border)] mb-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center shadow-xs">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-[var(--mv-text-primary)] tracking-tight">
                Mike
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--mv-primary)]/15 text-[var(--mv-primary)] border border-[var(--mv-primary)]/30">
                Money Vault Assistant
              </span>
            </div>
            <p className="text-[11px] text-[var(--mv-text-secondary)] mt-0.5">
              Available 24/7 • Grounded strictly in your real financial data
            </p>
          </div>
        </div>

        {visibleMessages.length > 0 && (
          <button
            type="button"
            onClick={clearChatMessages}
            className="p-2 text-[var(--mv-text-muted)] hover:text-rose-500 rounded-xl hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
            title="Clear conversation"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {visibleMessages.length === 0 ? (
          <div className="py-8 text-center space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[var(--mv-primary)] flex items-center justify-center mx-auto shadow-sm">
              <Sparkles size={32} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-extrabold text-[var(--mv-text-primary)]">
                Hi, I'm Mike — Your Money Vault Assistant
              </h2>
              <p className="text-xs text-[var(--mv-text-secondary)] leading-relaxed">
                Tell me about an expense you made, upload a receipt, or ask questions about your budget, loans, and emergency fund.
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {quickActions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.prompt) {
                      askFinTraQAI(item.prompt);
                    }
                  }}
                  className="text-left text-xs bg-[var(--mv-surface)] hover:bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-primary)] p-2.5 rounded-xl text-[var(--mv-text-primary)] transition-all shadow-xs cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          visibleMessages.map((msg: ChatMessage) => {
            const isUser = msg.role === 'user';
            const actionExecuted = executedActions[msg.id] || msg.actionProposal?.executed;

            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={15} />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[78%] space-y-2`}>
                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-[var(--mv-primary)] text-white dark:text-[#0B0D0C] font-semibold'
                        : 'bg-[var(--mv-surface)] text-[var(--mv-text-primary)] border border-[var(--mv-border)]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {msg.contextSummary && (
                      <div className="mt-2 pt-2 border-t border-[var(--mv-border)]/50 text-[10px] text-[var(--mv-text-muted)] italic">
                        Verified from records: {msg.contextSummary}
                      </div>
                    )}
                  </div>

                  {/* Interactive Action Proposal Card (Requirement 19, 20, 23) */}
                  {msg.actionProposal && (
                    <div className="p-3.5 rounded-2xl bg-[var(--mv-surface)] border border-[var(--mv-border)] shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-[var(--mv-border)] pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--mv-primary)] flex items-center gap-1.5">
                          <Receipt size={12} />
                          <span>Action Prepared by Mike</span>
                        </span>
                        <span className="text-[10px] font-semibold text-[var(--mv-text-muted)]">
                          Requires Confirmation
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-extrabold text-[var(--mv-text-primary)]">
                            {msg.actionProposal.subcategory || msg.actionProposal.category || 'Expense Entry'}
                          </div>
                          <div className="text-[11px] text-[var(--mv-text-secondary)] mt-0.5">
                            {msg.actionProposal.category} • {msg.actionProposal.date || 'Today'}
                          </div>
                          {msg.actionProposal.note && (
                            <div className="text-[10px] text-[var(--mv-text-muted)] italic mt-0.5">
                              "{msg.actionProposal.note}"
                            </div>
                          )}
                        </div>

                        <div className="text-base font-black text-[var(--mv-text-primary)] tabular-nums">
                          {formatINR(msg.actionProposal.amount)}
                        </div>
                      </div>

                      {actionExecuted ? (
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 justify-center">
                          <CheckCircle2 size={16} />
                          <span>Expense Confirmed & Recorded in Vault</span>
                        </div>
                      ) : cancelledActions[msg.id] ? (
                        <div className="p-2.5 rounded-xl bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] text-[var(--mv-text-muted)] text-xs font-semibold flex items-center gap-2 justify-center">
                          <span>Action Cancelled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleActionExecute(msg.id, msg.actionProposal!)}
                            className="flex-1 py-2 bg-[var(--mv-primary)] hover:brightness-110 text-white dark:text-[#0B0D0C] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Confirm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleActionCancel(msg.id)}
                            className="px-4 py-2 bg-[var(--mv-bg-secondary)] border border-[var(--mv-border)] hover:bg-[var(--mv-surface-hover)] text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickAddOpen(true, 'expense')}
                            className="px-3 py-2 bg-[var(--mv-surface-hover)] border border-[var(--mv-border)] hover:border-[var(--mv-border-strong)] text-[var(--mv-text-primary)] rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Edit details in manual form"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-[var(--mv-text-secondary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={15} />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {(isAiLoading || isProcessingReceipt) && (
          <div className="flex items-center space-x-2 text-xs text-[var(--mv-text-secondary)] py-2">
            <div className="w-7 h-7 rounded-xl bg-[var(--mv-primary)]/15 border border-[var(--mv-primary)]/30 text-[var(--mv-primary)] flex items-center justify-center">
              <RefreshCw size={13} className="animate-spin" />
            </div>
            <span className="font-semibold italic">
              {isProcessingReceipt ? 'Mike is analyzing uploaded receipt...' : 'Mike is thinking...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Assistant Status / Error Banner (honest status, not stored in chat history) */}
      {aiStatusError && (
        <div className="mt-2 p-3.5 bg-[var(--mv-surface)] border border-[var(--mv-danger)]/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--mv-danger)]/15 text-[var(--mv-danger)] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle size={15} />
            </div>
            <span className="text-xs font-semibold text-[var(--mv-text-primary)]">
              {aiStatusError.message}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {aiStatusError.requiresSignIn && (
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[var(--mv-primary)] text-[var(--mv-primary-text)] text-xs font-black hover:brightness-110 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            )}
            <button
              type="button"
              onClick={clearAiStatusError}
              className="px-2.5 py-1.5 text-xs text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] rounded-lg hover:bg-[var(--mv-surface-hover)] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Receipt OCR Upload Error Banner */}
      {uploadError && (
        <div className="mt-2 p-3.5 bg-[var(--mv-surface)] border border-[var(--mv-danger)]/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--mv-danger)]/15 text-[var(--mv-danger)] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle size={15} />
            </div>
            <span className="text-xs font-semibold text-[var(--mv-text-primary)]">
              {uploadError}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {(uploadError === SIGN_IN_PROMPT || uploadError === SESSION_EXPIRED_MSG || !user) && (
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[var(--mv-primary)] text-[var(--mv-primary-text)] text-xs font-black hover:brightness-110 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="px-2.5 py-1.5 text-xs text-[var(--mv-text-secondary)] hover:text-[var(--mv-text-primary)] rounded-lg hover:bg-[var(--mv-surface-hover)] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Input Bar with Receipt Scanning Attachment */}
      <form onSubmit={handleSubmit} className="mt-3 relative">
        <div className="flex items-center bg-[var(--mv-surface)] border border-[var(--mv-border)] focus-within:border-[var(--mv-primary)] rounded-2xl shadow-xs transition-all p-1.5">
          {/* Receipt Upload Icon inside Input */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-[var(--mv-text-muted)] hover:text-[var(--mv-primary)] rounded-xl hover:bg-[var(--mv-surface-hover)] transition-colors cursor-pointer"
            title="Scan or upload a receipt photo"
          >
            <Camera size={18} />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleReceiptFileChange}
            className="hidden"
          />

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask Mike, or type 'I spent ₹500 at restaurant'..."
            disabled={isAiLoading || isProcessingReceipt}
            className="flex-1 bg-transparent px-2.5 py-2 text-xs sm:text-sm text-[var(--mv-text-primary)] placeholder-[var(--mv-text-muted)] focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isAiLoading || isProcessingReceipt}
            className="p-2.5 bg-[var(--mv-primary)] hover:brightness-110 disabled:opacity-30 text-white dark:text-[#0B0D0C] rounded-xl transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed shrink-0"
          >
            <Send size={15} />
          </button>
        </div>

        <div className="text-[10px] text-[var(--mv-text-muted)] text-center mt-1.5">
          Mike provides verified guidance based on your Money Vault records. Important financial entries always require your confirmation.
        </div>
      </form>

      {/* Account Modal for Sign-In Flow */}
      {accountModalOpen && (
        <AccountModal
          isOpen={accountModalOpen}
          onClose={() => setAccountModalOpen(false)}
        />
      )}
    </div>
  );
};
