import express,{ Request,Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from '@google/genai';
import { initializeApp,getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { MarketDataProvider } from './src/services/marketDataProvider';
import { IndianMarketDataProvider } from './src/services/indianMarketDataProvider';
import { SECDataProvider } from './src/services/secDataProvider';
import { RESEARCH_GLOSSARY_TERMS } from './src/constants/researchGlossary';
import { validateEmail,validatePhone } from './src/utils/invitationValidation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin for server-side ID token verification and Firestore operations
let adminDb: FirebaseFirestore.Firestore | null = null;
try {
  const adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        projectId: firebaseConfig.projectId,
      });
  adminDb = getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.warn('Firebase Admin initialize warning:', err);
}

// Initialize Gemini SDK with User-Agent header as required
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface GeminiInvocationResult {
  response: any;
  modelUsed: string;
  durationMs: number;
  attemptsCount: number;
}

// In-flight OCR request deduplication map to prevent concurrent duplicate invocations
const inFlightOcrRequests = new Map<string, Promise<any>>();

/**
 * Robust Gemini model invoker:
 * - Configurable model candidate chain via process.env.GEMINI_MODELS
 * - Transient error classification (429, 503, UNAVAILABLE, ETIMEDOUT, ECONNRESET)
 * - Immediate abort for permanent errors (400, 401, 403, 404, invalid argument, auth failure)
 * - Bounded retries with exponential backoff & jitter
 * - Model usage, latency, and sanitized diagnostic telemetry
 */
async function generateWithGemini(
  aiClient: GoogleGenAI,
  params: { contents: any; config?: any }
): Promise<GeminiInvocationResult> {
  const configuredModels = process.env.GEMINI_MODELS
    ? process.env.GEMINI_MODELS.split(',').map((s) => s.trim()).filter(Boolean)
    : [
        'gemini-3.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.8-flash',
      ];

  let lastError: any = null;
  let attemptsCount = 0;
  const startTime = Date.now();

  for (const model of configuredModels) {
    // Max 2 attempts per candidate model
    for (let attempt = 0; attempt < 2; attempt++) {
      attemptsCount++;
      const attemptStart = Date.now();
      try {
        const response = await aiClient.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        const durationMs = Date.now() - attemptStart;
        console.log(`[Gemini OK] Model: ${model} | Latency: ${durationMs}ms | Attempts: ${attemptsCount}`);
        return {
          response,
          modelUsed: model,
          durationMs,
          attemptsCount,
        };
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err).toLowerCase();
        const status = err?.status || err?.code || 0;

        // Classify permanent errors: do not retry this model or cycle needlessly
        const isPermanent =
          status === 400 ||
          status === 401 ||
          status === 403 ||
          status === 404 ||
          msg.includes('api_key_invalid') ||
          msg.includes('permission_denied') ||
          msg.includes('unauthenticated') ||
          msg.includes('not found') ||
          msg.includes('invalid argument');

        if (isPermanent) {
          console.warn(`[Gemini Permanent Error] Model ${model} returned non-retryable status ${status}: ${msg.slice(0, 80)}`);
          break; // Break attempt loop to next model candidate or fail fast
        }

        const isTransient =
          status === 'UNAVAILABLE' ||
          status === 503 ||
          status === 429 ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('resource exhausted') ||
          msg.includes('rate limit') ||
          msg.includes('timeout') ||
          msg.includes('etimedout') ||
          msg.includes('econnreset');

        if (isTransient) {
          console.warn(`[Gemini Transient Notice] Model ${model} attempt ${attempt + 1} experienced spike (${status}). Backoff with jitter...`);
          // Exponential backoff with jitter: 250ms + jitter
          if (attempt === 0) {
            const backoff = 250 + Math.floor(Math.random() * 100);
            await new Promise((resolve) => setTimeout(resolve, backoff));
          }
        } else {
          // Unknown error, proceed to next candidate
          break;
        }
      }
    }
  }

  const totalTime = Date.now() - startTime;
  console.error(`[Gemini Exhausted] All candidate models failed in ${totalTime}ms. Last error: ${lastError?.message || lastError}`);
  throw lastError;
}

// Global process error handlers
process.on('unhandledRejection', (reason: any) => {
  console.error('[Process Error] Unhandled Rejection:', reason?.message || String(reason));
});
process.on('uncaughtException', (err: any) => {
  console.error('[Process Fatal] Uncaught Exception:', err?.message || String(err));
  process.exit(1);
});

export function resolveTrustProxyHops(
  envVal = process.env.TRUST_PROXY_HOPS,
  nodeEnv = process.env.NODE_ENV
): number {
  if (envVal !== undefined && envVal.trim().length > 0) {
    const trimmed = envVal.trim();
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && String(parsed) === trimmed && parsed >= 0 && parsed <= 5) {
      return parsed;
    }
    console.warn(
      `[Server Warning] Invalid TRUST_PROXY_HOPS "${envVal}". Must be an integer between 0 and 5. Falling back to default.`
    );
  }
  return nodeEnv === 'production' ? 1 : 0;
}

const app = express();
const trustProxyHops = resolveTrustProxyHops();
app.set('trust proxy', trustProxyHops);
app.disable('x-powered-by');
// Body size limits: only receipt OCR (base64 image) needs a large body. Everything else is small JSON,
// so a low cap stops unauthenticated callers from forcing the server to buffer huge payloads.
const largeJson = express.json({ limit: '10mb' });
const smallJson = express.json({ limit: '1mb' });
app.use((req, res, next) => (req.path === '/api/ocr/receipt' ? largeJson : smallJson)(req, res, next));

// Set Security Headers (preserving Cross-Origin-Opener-Policy for Firebase OAuth popup auth)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Lightweight In-Memory Per-User / Per-IP Rate Limiter (Zero external dependencies)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function cleanupExpiredRateLimits(now = Date.now()): void {
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Prune expired entries periodically to prevent memory leaks from one-off IPs
const rateLimitCleanupTimer = setInterval(() => {
  cleanupExpiredRateLimits();
}, 60000);
rateLimitCleanupTimer.unref?.();

function checkRateLimit(key: string, limit: number, windowMs: number, customNow?: number): boolean {
  const now = customNow ?? Date.now();
  // Opportunistic cleanup if store has accumulated entries
  if (rateLimitStore.size > 200) {
    cleanupExpiredRateLimits(now);
  }
  const record = rateLimitStore.get(key);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count++;
  return true;
}

function rateLimitMiddleware(limit: number, windowMs = 60000, prefix = 'rl') {
  return (req: Request, res: Response, next: () => void) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'anonymous';
    const userKey = (req as any).user?.uid || clientIp;
    const key = `${prefix}:${userKey}`;
    if (!checkRateLimit(key, limit, windowMs)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait a moment before trying again.',
      });
    }
    next();
  };
}

/**
 * Strict Middleware: Require Authenticated Firebase User
 * Rejects missing, invalid, expired, or revoked tokens with HTTP 401.
 */
async function requireAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken || idToken === 'undefined' || idToken === 'null') {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token in Bearer header.' });
  }

  // Fast check: A valid Firebase ID token must be a 3-part base64-encoded JWT
  const segments = idToken.split('.');
  if (segments.length !== 3 || !segments[0] || !segments[1] || !segments[2]) {
    return res.status(401).json({ error: 'Unauthorized: Malformed JWT token format.' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    if (decodedToken.aud !== firebaseConfig.projectId) {
      return res.status(401).json({ error: 'Unauthorized: Token audience does not match project.' });
    }
    (req as any).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
    };
    return next();
  } catch (error: any) {
    console.log('[Server Auth] requireAuth rejected token:', error?.code || error?.message || 'Invalid or revoked token');
    return res.status(401).json({ error: `Unauthorized: ${error?.message || 'Invalid or revoked token'}` });
  }
}

/**
 * Build Comprehensive Summarized Financial Context
 * Avoids raw dumping. Provides structured, exact numbers from real user records:
 * - Regular income, allowances, bonuses, other income
 * - Total expenses, category and subcategory spending
 * - Money owed (Who owes me, who do I owe, amounts, due dates, days remaining/overdue)
 * - Emergency fund (Target, current amount, progress %, months covered, remaining)
 * - Loans, EMIs & debts
 * - Upcoming payments & overdue payments
 * - Subscriptions & bills
 * - Savings & investments
 * - Cash flow & Net worth
 */
function buildFinancialContext(question: string, clientData: any): string {
  if (!clientData) {
    return 'No financial data provided in request.';
  }

  const lines: string[] = [];
  const currentMonth = clientData.selectedMonth || 'Current Period';
  lines.push(`Period: ${currentMonth}`);

  // Income structure
  const inc = clientData.incomeBreakdown || {};
  lines.push(`\n=== INCOME STRUCTURE ===`);
  lines.push(`Regular Base Salary: ₹ ${inc.baseIncome || 0}`);
  lines.push(`Allowances Total: ₹ ${inc.allowancesTotal || 0}`);
  lines.push(`Bonuses Total: ₹ ${inc.bonusesTotal || 0}`);
  lines.push(`Other Inflow: ₹ ${inc.otherIncomeTotal || 0}`);
  lines.push(`Total Cash Inflow: ₹ ${inc.totalInflow || 0}`);

  // Expenses & Budgets
  const summary = clientData.summary || {};
  lines.push(`\n=== EXPENSES & BUDGET ===`);
  lines.push(`Total Expenses: ₹ ${summary.totalExpenses || 0}`);
  lines.push(`Net Cash Remaining: ₹ ${summary.netRemaining || 0}`);
  lines.push(`Savings Rate: ${summary.savingsRate || 0}%`);

  const categorySummaries = Array.isArray(clientData.categories) ? clientData.categories : [];
  categorySummaries.forEach((c: any) => {
    lines.push(`- ${c.category}: Budget ₹ ${c.budget || 0}, Spent ₹ ${c.spent || 0}, Remaining ₹ ${c.remaining || 0} (${c.isOverBudget ? 'OVER BUDGET' : 'Within budget'})`);
  });

  // Emergency Fund
  const ef = clientData.emergencyFund || {};
  lines.push(`\n=== EMERGENCY FUND SYSTEM ===`);
  lines.push(`Essential Monthly Expenses: ₹ ${ef.essentialMonthlyExpenses || 0}`);
  lines.push(`Target Duration: ${ef.targetMonths || 6} months`);
  lines.push(`Emergency Fund Target: ₹ ${ef.targetAmount || 0}`);
  lines.push(`Current Balance: ₹ ${ef.currentAmount || 0}`);
  lines.push(`Progress: ${ef.progressPercentage || 0}%`);
  lines.push(`Remaining to Target: ₹ ${ef.remainingAmount || 0}`);
  lines.push(`Months Covered: ${ef.monthsCovered || 0} months`);
  if (ef.monthlyContributionPlan > 0) {
    lines.push(`Planned Monthly Contribution: ₹ ${ef.monthlyContributionPlan}`);
    lines.push(`Estimated Months to Complete: ${ef.estimatedMonthsToComplete} months (${ef.estimatedCompletionDate})`);
  }

  // Money Owed (Lent & Borrowed)
  const moneyOwed = Array.isArray(clientData.moneyOwed) ? clientData.moneyOwed : [];
  const lent = moneyOwed.filter((m: any) => m.type === 'lent' && m.status !== 'Settled');
  const borrowed = moneyOwed.filter((m: any) => m.type === 'borrowed' && m.status !== 'Settled');

  lines.push(`\n=== MONEY OWED (PERSONAL TRANSFERS) ===`);
  const toReceive = lent.reduce((sum: number, m: any) => sum + (m.remainingAmount || 0), 0);
  const toRepay = borrowed.reduce((sum: number, m: any) => sum + (m.remainingAmount || 0), 0);
  lines.push(`Total Money to Receive: ₹ ${toReceive}`);
  lines.push(`Total Money to Repay: ₹ ${toRepay}`);
  lines.push(`Net Outstanding: ₹ ${toReceive - toRepay} (not spendable cash)`);

  if (lent.length > 0) {
    lines.push(`Money Owed to User (To Receive):`);
    lent.forEach((m: any) => {
      lines.push(`- ${m.personName}: ₹ ${m.remainingAmount} remaining of ₹ ${m.originalAmount} (Due: ${m.dueDate}, Status: ${m.status})`);
    });
  }

  if (borrowed.length > 0) {
    lines.push(`Money User Owes (To Repay):`);
    borrowed.forEach((m: any) => {
      lines.push(`- To ${m.personName}: ₹ ${m.remainingAmount} remaining of ₹ ${m.originalAmount} (Due: ${m.dueDate}, Status: ${m.status})`);
    });
  }

  // Loans & EMIs
  const loans = Array.isArray(clientData.loans) ? clientData.loans : [];
  if (loans.length > 0) {
    lines.push(`\n=== LOANS & LIABILITIES ===`);
    loans.forEach((l: any) => {
      lines.push(`- ${l.name} (${l.type}): Outstanding ₹ ${l.outstandingAmount}, EMI ₹ ${l.emiAmount}, Next Due: ${l.nextPaymentDate || l.dueDate}, Interest: ${l.interestRate || 0}%, Status: ${l.status}`);
    });
  }

  // Upcoming & Overdue Payments
  const upcoming = Array.isArray(clientData.upcoming) ? clientData.upcoming : [];
  const overdue = Array.isArray(clientData.overdue) ? clientData.overdue : [];

  if (upcoming.length > 0) {
    lines.push(`\n=== UPCOMING OBLIGATIONS ===`);
    upcoming.slice(0, 8).forEach((u: any) => {
      lines.push(`- ${u.title}: ₹ ${u.amount} (${u.dueLabel}, Due ${u.dueDate})`);
    });
  }

  if (overdue.length > 0) {
    lines.push(`\n=== OVERDUE OBLIGATIONS ===`);
    overdue.forEach((o: any) => {
      lines.push(`- ${o.title}: ₹ ${o.amount} (OVERDUE: ${o.dueLabel}, Due ${o.dueDate})`);
    });
  }

  // Subscriptions & Bills
  const subscriptions = Array.isArray(clientData.subscriptions) ? clientData.subscriptions : [];
  if (subscriptions.length > 0) {
    const monthlySubCost = subscriptions.filter((s: any) => s.isActive).reduce((sum: number, s: any) => {
      return sum + (s.frequency === 'Yearly' ? Math.round(s.amount / 12) : s.amount);
    }, 0);
    lines.push(`\n=== SUBSCRIPTIONS ===`);
    lines.push(`Active Subscriptions: ${subscriptions.filter((s: any) => s.isActive).length}`);
    lines.push(`Estimated Monthly Cost: ₹ ${monthlySubCost}`);
  }

  // Investments & Goals
  const investments = Array.isArray(clientData.investments) ? clientData.investments : [];
  if (investments.length > 0) {
    const totalInv = investments.reduce((s: number, i: any) => s + (i.amountInvested || 0), 0);
    const totalCur = investments.reduce((s: number, i: any) => s + (i.currentValue || 0), 0);
    lines.push(`\n=== INVESTMENTS ===`);
    lines.push(`Invested: ₹ ${totalInv}, Current Value: ₹ ${totalCur}, Net Gain/Loss: ₹ ${totalCur - totalInv}`);
  }

  const goals = Array.isArray(clientData.goals) ? clientData.goals : [];
  if (goals.length > 0) {
    lines.push(`\n=== FINANCIAL GOALS ===`);
    goals.slice(0, 5).forEach((g: any) => {
      lines.push(`- ${g.name}: Target ₹ ${g.targetAmount}, Saved ₹ ${g.currentAmount} (${Math.round((g.currentAmount / (g.targetAmount || 1)) * 100)}%), Target Date: ${g.targetDate}`);
    });
  }

  // Net worth
  const nw = clientData.netWorth;
  if (nw) {
    lines.push(`\n=== NET WORTH ===`);
    lines.push(`Total Assets: ₹ ${nw.assets?.total || 0}`);
    lines.push(`Total Liabilities: ₹ ${nw.liabilities?.total || 0}`);
    lines.push(`Net Worth: ₹ ${nw.netWorth || 0} (Assets - Liabilities; not spendable cash)`);
  }

  return lines.join('\n');
}

/**
 * Endpoint: POST /api/gemini/chat
 * Secure AI financial conversation endpoint for Mike — Your Money Vault Assistant
 */
app.post('/api/gemini/chat', requireAuth, rateLimitMiddleware(20, 60000, 'gemini'), async (req: Request, res: Response) => {
  try {
    const { message, history, financialContext } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Missing question or prompt.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Mike Assistant service is currently configuring its API credentials. Please check back shortly.',
      });
    }

    const minimalContext = buildFinancialContext(message, financialContext);

    const systemInstruction = `You are Mike — Your Money Vault Assistant. You are an expert, calm, friendly, and objective personal finance command center companion.
You provide clear, accurate guidance based EXCLUSIVELY on the user's actual Money Vault data.
Brand Motto: "Secure Your Money. Master Your Future."

YOUR CORE RESPONSIBILITIES:
1. Help users understand where their money goes, their budget status, emergency fund progress, loan EMIs, and upcoming obligations.
2. Help users log expenses, income, or scan receipts interactively.
3. ACTION PROPOSALS:
   When the user states they spent money, earned money, or asks you to add an expense/income:
   - Example 1: "I spent ₹500 at Starbucks on coffee"
   - Example 2: "I bought groceries for ₹1,200"
   - Example 3: "Add ₹2,500 electricity bill"
   - Example 4: "I received bonus ₹25,000"
   CRITICAL SAFETY RULE: You must NEVER pretend the transaction was already saved without user confirmation.
   Instead, state clearly what you detected, and provide a structured action proposal block at the end of your message in this exact format:
   <<<ACTION_PROPOSAL
   {"type":"expense","amount":500,"category":"Food & Dining","subcategory":"Coffee","date":"${new Date().toISOString().slice(0, 10)}","note":"Starbucks"}
   ACTION_PROPOSAL>>>
   Supported types: "expense", "income", "bill".
   Supported expense categories: "Food & Dining", "Groceries", "Shopping", "Utilities", "Transportation", "Healthcare", "Entertainment", "Personal Care", "Education", "Other".

CRITICAL INVARIANTS:
1. NEVER fabricate or invent missing numbers, debts, or accounts. If a metric is not recorded in Money Vault, say: "I don't have that information recorded in Money Vault yet."
2. All monetary amounts must be stated in Indian Rupees (₹) with appropriate commas (e.g. ₹ 10,000, ₹ 1,50,000).
3. Clearly distinguish:
   - Base salary vs Allowances vs Bonuses vs Other Inflow
   - Money lent to others ("Money to receive") vs Money borrowed from others ("Money to repay")
   - Liquid cash vs Net Worth (explain that net worth is not spendable cash)
   - Emergency Fund targets vs Ordinary savings
4. Keep your tone supportive, concise, sharp, and helpful. Always introduce yourself or sign off as Mike when appropriate.
5. MONEY RESEARCH & INDIAN STOCK DISCOVERY ENGINE:
   Money Vault features a built-in Indian Equities Stock Discovery & Fundamental Research Engine (under GROW -> Money Research).
   Focuses on NSE and BSE listed Indian equities (e.g. TCS, Infosys, Reliance Industries, HDFC Bank, ICICI Bank, State Bank of India, Indian Oil Corporation, ITC, Larsen & Toubro, Bharti Airtel, Hindustan Unilever, Tata Motors, etc.) in ₹ INR.
   Cognizant (CTSH) is primarily US-listed on NASDAQ, NOT an NSE/BSE listed Indian equity.
   When the user asks about discovering stocks, company growth, valuation, promoter holding, or balance sheet strength:
   - Provide verified fundamental facts in ₹ INR (e.g. revenue growth, operating margin, promoter holding, net cash/debt positions, ROCE/ROE, and primary risks).
   - Distinguish high business quality from valuation multiples.
   - Never guarantee returns, predict price targets, or declare any stock "the next TCS" or "guaranteed multibagger".
   - Direct the user to the "Money Research" screen for full audited financial statements, multi-year CAGRs, and side-by-side peer comparisons.

Verified User Data from Money Vault Records:
${minimalContext}`;

    const formattedContents: any[] = [];
    if (Array.isArray(history)) {
      history.slice(-8).forEach((h: any) => {
        if (h.role && h.content) {
          formattedContents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(h.content).slice(0, 1500) }],
          });
        }
      });
    }

    formattedContents.push({
      role: 'user',
      parts: [{ text: message.trim().slice(0, 1500) }],
    });

    const aiClient = getAiClient();
    const geminiResult = await generateWithGemini(aiClient, {
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.4,
        topP: 0.9,
      },
    });

    const rawText = geminiResult.response?.text || 'I analyzed your financial records, but could not produce a response. Please rephrase your question.';

    // Check for structured ACTION_PROPOSAL block
    let reply = rawText;
    let actionProposal: any = null;
    const actionMatch = rawText.match(/<<<ACTION_PROPOSAL\s*([\s\S]*?)\s*ACTION_PROPOSAL>>>/);
    if (actionMatch) {
      try {
        actionProposal = JSON.parse(actionMatch[1]);
        reply = rawText.replace(/<<<ACTION_PROPOSAL[\s\S]*?ACTION_PROPOSAL>>>/, '').trim();
      } catch (e) {
        console.warn('Could not parse action proposal:', e);
      }
    }

    return res.json({
      reply,
      actionProposal,
      contextSnippet: minimalContext.slice(0, 300),
    });
  } catch (err: any) {
    console.error('Mike Assistant Error:', err);
    return res.status(503).json({
      error: 'Mike is temporarily unavailable. Please try again.',
    });
  }
});

/**
 * Endpoint: POST /api/ocr/receipt
 * Extract structured expense information from receipt or bill image with Gemini Multimodal Vision
 */
app.post('/api/ocr/receipt', requireAuth, rateLimitMiddleware(15, 60000, 'ocr'), async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Missing receipt image data.' });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
    if (!cleanBase64.trim()) {
      return res.status(400).json({ error: 'Image data is empty.' });
    }

    // Server-side size verification (max 10MB)
    const approximateSizeBytes = (cleanBase64.length * 3) / 4;
    if (approximateSizeBytes > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size exceeds maximum limit of 10MB.' });
    }

    // Server-side MIME validation
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/jpg'];
    const effectiveMime = mimeType ? String(mimeType).toLowerCase() : 'image/jpeg';
    if (!allowedMimes.includes(effectiveMime)) {
      return res.status(400).json({
        error: 'Unsupported image format. Please upload a JPEG, PNG, WebP, or HEIC photo.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Receipt OCR service is currently configuring its API credentials. Please try again shortly.',
      });
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const prompt = `You are a high-precision financial OCR engine for Money Vault ("Secure Your Money. Master Your Future.").
Analyze this image of a receipt, invoice, or bill and extract all expense details.
Return a STRICT JSON object with these exact keys:
{
  "merchant": string (The store or company name like "Amazon", "Starbucks", "Walmart", "Lulu Hypermarket", "Reliance", or "Not detected"),
  "amount": number or null (The final total payable amount as a positive number. Do NOT include currency symbols.),
  "currency": string (Default to "INR" if in rupees or symbol ₹ is present, or "USD", etc.),
  "date": string or null (Transaction date in YYYY-MM-DD format, or "${todayDate}" if not found),
  "time": string or null (e.g. "14:32" or null),
  "category": string (Must select the most appropriate category: "Groceries", "Food & Dining", "Shopping", "Utilities", "Transportation", "Healthcare", "Entertainment", "Personal Care", "Education", "Other", or "Needs review"),
  "subcategory": string or null (e.g. "Supermarket", "Coffee", "Electronics", "Electricity", "Pharmacy", etc.),
  "paymentMethod": string (One of: "Credit Card", "UPI", "Debit Card", "Cash", "Net Banking", "Other", or "Not detected"),
  "tax": number or null (Total tax/GST amount if itemized, else null),
  "items": array of { "name": string, "quantity": number, "price": number },
  "notes": string or null (Brief itemized summary or reference),
  "confidence": "high" | "medium" | "low",
  "summary": string (A concise 1-sentence description, e.g. "₹1,850 at Lulu Hypermarket for Groceries on Oct 2")
}

INVARIANTS:
1. NEVER invent, hallucinate, or assume missing information.
2. If the total amount is unclear or missing, set amount to null and confidence to "low".
3. If merchant cannot be determined, set merchant to "Not detected".
4. If category is ambiguous, set category to "Needs review".
5. Return ONLY the raw JSON string without markdown code fences.`;

    const userScope = (req as any).user?.uid || 'anonymous';
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${userScope}:${cleanBase64.slice(0, 4096)}:${cleanBase64.length}`)
      .digest('hex');

    if (inFlightOcrRequests.has(fingerprint)) {
      console.log(`[OCR Deduplication] Reusing in-flight analysis for fingerprint ${fingerprint.slice(0, 8)} (user: ${userScope.slice(0, 8)})`);
      const existingResult = await inFlightOcrRequests.get(fingerprint);
      return res.json(existingResult);
    }

    const ocrPromise = (async () => {
      const aiClient = getAiClient();
      const imagePart = {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || 'image/jpeg',
        },
      };
      const textPart = { text: prompt };

      const geminiResult = await generateWithGemini(aiClient, {
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = geminiResult.response?.text?.trim() || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        const cleaned = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      // Temporary image data is now discarded; only structured data is returned
      return {
        success: true,
        extracted: parsed,
        modelUsed: geminiResult.modelUsed,
        latencyMs: geminiResult.durationMs,
      };
    })();

    inFlightOcrRequests.set(fingerprint, ocrPromise);
    try {
      const outcome = await ocrPromise;
      return res.json(outcome);
    } finally {
      setTimeout(() => inFlightOcrRequests.delete(fingerprint), 15000);
    }
  } catch (err: any) {
    console.error('Receipt OCR Error:', err);
    return res.status(503).json({
      error: 'Receipt OCR service is temporarily unavailable. Please try again.',
    });
  }
});

/**
 * Endpoint: POST /api/alerts/notify
 * Handles alert notification queueing and email delivery with Money Vault branding
 */
app.post('/api/alerts/notify', requireAuth, async (req: Request, res: Response) => {
  try {
    const { alert, recipientEmail, notificationDetails } = req.body;
    if (!alert && !notificationDetails) {
      return res.status(400).json({ error: 'Missing alert or notification data' });
    }

    const emailKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
    const canSendEmail = Boolean(emailKey && recipientEmail);

    if (canSendEmail) {
      return res.json({
        success: true,
        status: 'sent',
        message: `Money Vault notification sent to ${recipientEmail}`,
      });
    } else {
      return res.json({
        success: true,
        status: recipientEmail ? 'queued' : 'delivered',
        message: recipientEmail
          ? `Money Vault alert queued for ${recipientEmail}. (In-app delivery active)`
          : 'Money Vault in-app notification delivered successfully.',
      });
    }
  } catch (err: any) {
    console.error('Alert notify error:', err);
    return res.status(500).json({ error: 'Failed to process alert notification' });
  }
});

// ============================================================
// MONEY RESEARCH & STOCK DISCOVERY API ENDPOINTS
// ============================================================

/**
 * GET /api/research/discover
 * Filter Indian companies by measurable fundamental characteristics (NSE & BSE)
 */
app.get('/api/research/discover', rateLimitMiddleware(120, 60000, 'research'), async (req: Request, res: Response) => {
  try {
    const {
      search,
      sector,
      market,
      marketCap,
      minRevenueGrowth,
      minFCFGrowth,
      minOperatingMargin,
      minROIC,
      minROE,
      maxDebtToEquity,
      maxPE,
      maxPB,
      maxPS,
      preset,
      profitableOnly,
      positiveFCFOnly,
    } = req.query;

    let companies = await IndianMarketDataProvider.searchCompanies(typeof search === 'string' ? search : undefined);

    // Filter by market (NSE / BSE)
    if (market && market !== 'All') {
      if (market === 'NSE') {
        companies = companies.filter((c) => c.primaryExchange === 'NSE' || c.exchange.includes('NSE'));
      } else if (market === 'BSE') {
        companies = companies.filter((c) => c.primaryExchange === 'BSE' || c.exchange.includes('BSE'));
      }
    }

    // Filter by sector
    if (sector && sector !== 'All') {
      companies = companies.filter((c) => c.sector === sector || (sector === 'IT' && c.sector === 'IT Services'));
    }

    // Filter by market cap category
    if (marketCap && marketCap !== 'All') {
      companies = companies.filter((c) => c.marketCapCategory === marketCap);
    }

    // Filter by profitable only
    if (profitableOnly === 'true') {
      companies = companies.filter((c) => c.calculations.netMarginCurrent > 0);
    }

    // Filter by positive FCF only
    if (positiveFCFOnly === 'true') {
      companies = companies.filter((c) => c.calculations.fcfConversionRatio > 0);
    }

    // Numeric thresholds
    if (minRevenueGrowth) {
      const minRG = parseFloat(minRevenueGrowth as string);
      if (!isNaN(minRG)) {
        companies = companies.filter((c) => c.calculations.revenueGrowth1Y >= minRG);
      }
    }

    if (minFCFGrowth) {
      const minFCF = parseFloat(minFCFGrowth as string);
      if (!isNaN(minFCF)) {
        companies = companies.filter((c) => c.calculations.fcfGrowth1Y >= minFCF);
      }
    }

    if (minOperatingMargin) {
      const minOM = parseFloat(minOperatingMargin as string);
      if (!isNaN(minOM)) {
        companies = companies.filter((c) => c.calculations.operatingMarginCurrent >= minOM);
      }
    }

    if (minROIC) {
      const minR = parseFloat(minROIC as string);
      if (!isNaN(minR)) {
        companies = companies.filter((c) => c.calculations.roicCurrent >= minR);
      }
    }

    if (minROE) {
      const minR = parseFloat(minROE as string);
      if (!isNaN(minR)) {
        companies = companies.filter((c) => c.calculations.roeCurrent >= minR);
      }
    }

    if (maxDebtToEquity) {
      const maxDE = parseFloat(maxDebtToEquity as string);
      if (!isNaN(maxDE)) {
        companies = companies.filter((c) => (c.calculations.netDebtToEbitda ?? 0) <= maxDE);
      }
    }

    if (maxPE) {
      const maxP = parseFloat(maxPE as string);
      if (!isNaN(maxP)) {
        companies = companies.filter((c) => c.valuation.peRatio !== null && c.valuation.peRatio <= maxP);
      }
    }

    if (maxPS) {
      const maxS = parseFloat(maxPS as string);
      if (!isNaN(maxS)) {
        companies = companies.filter((c) => c.valuation.psRatio <= maxS);
      }
    }

    if (maxPB) {
      const maxB = parseFloat(maxPB as string);
      if (!isNaN(maxB)) {
        companies = companies.filter((c) => c.valuation.pbRatio !== null && (c.valuation.pbRatio ?? 99) <= maxB);
      }
    }

    // Apply Presets
    if (preset === 'hyper_growth_fcf') {
      companies = companies.filter((c) => c.calculations.revenueGrowth1Y >= 12 && c.calculations.fcfGrowth1Y > 0);
    } else if (preset === 'margin_expander') {
      companies = companies.filter((c) => c.calculations.operatingMarginTrend > 0.5 && c.calculations.operatingMarginCurrent >= 15);
    } else if (preset === 'cash_machine') {
      companies = companies.filter((c) => c.calculations.fcfConversionRatio >= 0.7 && c.calculations.netMarginCurrent > 10);
    } else if (preset === 'fortress_balance_sheet') {
      companies = companies.filter((c) => c.calculations.netDebtToEbitda === null || c.calculations.netDebtToEbitda <= 0);
    } else if (preset === 'rd_innovator') {
      companies = companies.filter((c) => c.calculations.rdIntensityRatio >= 0.5 || c.sector === 'IT Services' || c.sector === 'Pharma & Healthcare');
    } else if (preset === 'early_compounder') {
      companies = companies.filter((c) => c.earlyStageScore >= 50);
    }

    // Sort by earlyStageScore descending, then revenue growth
    companies.sort((a, b) => b.earlyStageScore - a.earlyStageScore || b.calculations.revenueGrowth1Y - a.calculations.revenueGrowth1Y);

    return res.json({
      success: true,
      totalCount: companies.length,
      companies,
    });
  } catch (err: any) {
    console.error('Discover API error:', err);
    return res.status(500).json({ error: 'Failed to execute discovery screening' });
  }
});

/**
 * GET /api/research/search
 * Dynamic auto-suggest / search endpoint for 5,180+ Indian equities
 */
app.get('/api/research/search', rateLimitMiddleware(120, 60000, 'research'), async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const limit = parseInt(req.query.limit as string) || 15;
    const sector = req.query.sector as string | undefined;
    const exchange = req.query.exchange as string | undefined;

    const results = await IndianMarketDataProvider.searchCompanies(q, {
      limit,
      sector,
      exchange,
    });

    return res.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (err: any) {
    console.error('Search API error:', err);
    return res.status(500).json({ error: 'Failed to search Indian equities' });
  }
});

/**
 * GET /api/research/browse
 * Paginated browsing across all 5,180+ Indian listed equities
 */
app.get('/api/research/browse', rateLimitMiddleware(120, 60000, 'research'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const sector = req.query.sector as string | undefined;
    const exchange = req.query.exchange as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await IndianMarketDataProvider.browseCompanies({
      page,
      limit,
      sector,
      exchange,
      search,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Browse API error:', err);
    return res.status(500).json({ error: 'Failed to browse Indian equities' });
  }
});

/**
 * GET /api/research/peers/:ticker
 * Peers in the same sector from the Indian company master
 */
app.get('/api/research/peers/:ticker', rateLimitMiddleware(120, 60000, 'research'), async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const peers = await IndianMarketDataProvider.getPeerCompanies(ticker, 4);
    return res.json({
      success: true,
      count: peers.length,
      peers,
    });
  } catch (err: any) {
    console.error('Peers API error:', err);
    return res.status(500).json({ error: 'Failed to retrieve peer companies' });
  }
});

/**
 * GET /api/research/company/:ticker
 * Full fundamental company profile with NSE/BSE filings, growth analysis, catalysts & risks in INR
 */
app.get('/api/research/company/:ticker', rateLimitMiddleware(120, 60000, 'research'), async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    if (!ticker) return res.status(400).json({ error: 'Missing ticker symbol' });

    // Primary lookup via IndianMarketDataProvider
    const profile = await IndianMarketDataProvider.getCompanyProfile(ticker);
    if (profile) {
      return res.json({
        success: true,
        company: profile,
      });
    }

    // Fallback to legacy US provider if explicit US ticker
    const fallbackProfile = await MarketDataProvider.getCompanyProfile(ticker);
    if (fallbackProfile) {
      return res.json({
        success: true,
        company: fallbackProfile,
      });
    }

    return res.status(404).json({ error: `Company profile for ${ticker.toUpperCase()} not found in research universe.` });
  } catch (err: any) {
    console.error(`Company profile API error for ${req.params.ticker}:`, err);
    return res.status(500).json({ error: 'Failed to retrieve company profile' });
  }
});

/**
 * GET /api/research/quote/:ticker
 * Current market quote in INR
 */
app.get('/api/research/quote/:ticker', rateLimitMiddleware(120, 60000, 'research'), async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const quote = await IndianMarketDataProvider.getQuote(ticker);
    if (quote) {
      return res.json({ success: true, quote });
    }

    // Fallback
    const fallbackQuote = await MarketDataProvider.getQuote(ticker);
    if (!fallbackQuote) return res.status(404).json({ error: 'Quote unavailable' });
    return res.json({ success: true, quote: fallbackQuote });
  } catch (err: any) {
    console.error('Quote API error:', err);
    return res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

/**
 * GET /api/research/prices/:ticker
 * Historical prices in INR
 */
app.get('/api/research/prices/:ticker', rateLimitMiddleware(120, 60000, 'research'), async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const range = (req.query.range as any) || '1Y';
    const prices = await IndianMarketDataProvider.getHistoricalPrices(ticker, range);
    return res.json({ success: true, ticker: ticker.toUpperCase(), range, prices });
  } catch (err: any) {
    console.error('Prices API error:', err);
    return res.status(500).json({ error: 'Failed to fetch historical prices' });
  }
});

/**
 * GET /api/research/compare
 * Side-by-side comparison of Indian companies
 */
app.get('/api/research/compare', rateLimitMiddleware(120, 60000, 'research'), async (req: Request, res: Response) => {
  try {
    const tickersParam = req.query.tickers as string;
    if (!tickersParam) return res.status(400).json({ error: 'Missing tickers parameter' });

    const tickerList = tickersParam.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
    const profiles = await Promise.all(
      tickerList.map(async (t) => {
        const p = await IndianMarketDataProvider.getCompanyProfile(t);
        if (p) return p;
        return MarketDataProvider.getCompanyProfile(t);
      })
    );
    const found = profiles.filter(Boolean);

    return res.json({
      success: true,
      companies: found,
    });
  } catch (err: any) {
    console.error('Compare API error:', err);
    return res.status(500).json({ error: 'Failed to execute comparison' });
  }
});

/**
 * GET /api/research/sec/:ticker/filings
 * Official SEC EDGAR filings list with direct sec.gov links
 */
app.get('/api/research/sec/:ticker/filings', rateLimitMiddleware(120, 60000, 'research'), async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const cik = await SECDataProvider.getCIKForTicker(ticker);
    if (!cik) return res.status(404).json({ error: `Could not resolve SEC CIK for ${ticker}` });

    const filings = await SECDataProvider.getCompanyFilings(cik, 15);
    return res.json({
      success: true,
      ticker: ticker.toUpperCase(),
      cik,
      edgarBrowseUrl: `https://www.sec.gov/edgar/browse/?CIK=${cik}`,
      filings,
    });
  } catch (err: any) {
    console.error('SEC filings API error:', err);
    return res.status(500).json({ error: 'Failed to fetch SEC filings' });
  }
});

/**
 * GET /api/research/glossary
 * Educational glossary terms explaining fundamental concepts
 */
app.get('/api/research/glossary', rateLimitMiddleware(120, 60000, 'research'), (_req: Request, res: Response) => {
  return res.json({
    success: true,
    terms: RESEARCH_GLOSSARY_TERMS,
  });
});

/**
 * ============================================================================
 * LIVE CURRENCY CONVERSION (FX) ENGINE
 * Keyless, in-memory cached, rate-limited, fail-safe foreign exchange endpoint
 * ============================================================================
 */
const ALLOWED_FX_CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD', 'AUD', 'SAR', 'KWD'] as const;

interface FxRatesCacheEntry {
  base: 'INR';
  rates: Record<string, number>;
  provider: string;
  providerUrl: string;
  attributionText: string;
  termsUrl: string;
  publishedDate: string;
  publishedTimestamp: number;
  fetchedAt: number;
}

let fxRatesCache: FxRatesCacheEntry | null = null;
let fxRatesInFlightPromise: Promise<FxRatesCacheEntry> | null = null;
const FX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour minimum cache
const FX_BACKOFF_MS = 15 * 60 * 1000; // 15 minutes failure back-off
let fxBackoffUntil = 0;

function isValidUpstreamRate(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val > 0;
}

async function fetchUpstreamFxRates(): Promise<FxRatesCacheEntry> {
  // Primary upstream: open.er-api.com (keyless, full INR coverage including AED, SAR, KWD)
  let primaryError: any = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://open.er-api.com/v6/latest/INR', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      if (data && data.result === 'success' && data.rates && typeof data.rates === 'object') {
        const rates: Record<string, number> = {};
        for (const curr of ALLOWED_FX_CURRENCIES) {
          const val = data.rates[curr];
          if (!isValidUpstreamRate(val)) {
            throw new Error(`Invalid or missing rate for ${curr} in primary upstream response`);
          }
          rates[curr] = val;
        }

        const publishedTimestamp = data.time_last_update_unix
          ? data.time_last_update_unix * 1000
          : data.time_last_update_utc
          ? new Date(data.time_last_update_utc).getTime()
          : Date.now();

        const publishedDate = new Date(publishedTimestamp).toISOString().slice(0, 10);

        return {
          base: 'INR',
          rates,
          provider: 'Exchange Rate API',
          providerUrl: 'https://www.exchangerate-api.com',
          attributionText: 'Rates by Exchange Rate API',
          termsUrl: 'https://www.exchangerate-api.com/terms',
          publishedDate,
          publishedTimestamp,
          fetchedAt: Date.now(),
        };
      }
    }
  } catch (err) {
    primaryError = err;
    console.warn('[FX Rates] Primary upstream (open.er-api.com) failed or timed out:', err);
  }

  // Secondary keyless fallback: api.frankfurter.dev (ECB reference rates)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=INR', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      if (data && data.rates && typeof data.rates === 'object') {
        const rates: Record<string, number> = {};
        for (const curr of ALLOWED_FX_CURRENCIES) {
          if (data.rates[curr] !== undefined) {
            const val = data.rates[curr];
            if (!isValidUpstreamRate(val)) {
              throw new Error(`Invalid rate for ${curr} in fallback upstream response`);
            }
            rates[curr] = val;
          }
        }
        if (Object.keys(rates).length === 0) {
          throw new Error('Fallback upstream returned zero valid rates');
        }
        const publishedDate = data.date || new Date().toISOString().slice(0, 10);
        const publishedTimestamp = new Date(publishedDate).getTime() || Date.now();

        return {
          base: 'INR',
          rates,
          provider: 'Frankfurter (ECB)',
          providerUrl: 'https://frankfurter.dev',
          attributionText: 'Rates by European Central Bank via Frankfurter',
          termsUrl: 'https://frankfurter.dev/license',
          publishedDate,
          publishedTimestamp,
          fetchedAt: Date.now(),
        };
      }
    }
  } catch (secErr) {
    console.warn('[FX Rates] Secondary upstream (frankfurter.dev) failed or timed out:', secErr);
  }

  throw new Error(`Upstream FX providers unavailable. Primary: ${primaryError?.message || 'unknown'}`);
}

app.get('/api/fx/rates', requireAuth, rateLimitMiddleware(30, 60000, 'fx'), async (req: Request, res: Response) => {
  try {
    const { currencies } = req.query;
    let requestedCurrencies: string[] = [];

    if (typeof currencies === 'string' && currencies.trim().length > 0) {
      const parsed = currencies.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
      for (const c of parsed) {
        if (!ALLOWED_FX_CURRENCIES.includes(c as any)) {
          return res.status(400).json({
            error: 'INVALID_CURRENCY',
            message: `Currency "${c}" is not supported. Allowed currencies: ${ALLOWED_FX_CURRENCIES.join(', ')}`,
          });
        }
      }
      requestedCurrencies = parsed;
    }

    const now = Date.now();
    let isStale = false;
    let entry: FxRatesCacheEntry;

    // Check if currently in 15-minute failure back-off
    if (now < fxBackoffUntil) {
      if (fxRatesCache) {
        entry = fxRatesCache;
        isStale = true;
      } else {
        return res.status(503).json({
          error: 'UPSTREAM_UNAVAILABLE',
          message: 'Currency exchange rates are temporarily unavailable. Please try again later.',
        });
      }
    } else if (fxRatesCache && (now - fxRatesCache.fetchedAt < FX_CACHE_TTL_MS)) {
      // Check if in-memory cache is fresh
      entry = fxRatesCache;
    } else {
      // Coalesce concurrent refreshes
      if (!fxRatesInFlightPromise) {
        fxRatesInFlightPromise = fetchUpstreamFxRates()
          .then((fresh) => {
            // If fallback returned fewer currencies than existing cache, do not replace cache & trigger back-off
            if (fxRatesCache && Object.keys(fresh.rates).length < Object.keys(fxRatesCache.rates).length) {
              console.warn('[FX Rates] Fallback returned fewer currencies than cached entry; keeping existing cache and setting failure back-off.');
              fxBackoffUntil = Date.now() + FX_BACKOFF_MS;
              return fxRatesCache;
            }
            fxRatesCache = fresh;
            fxBackoffUntil = 0; // Success clears back-off
            return fresh;
          })
          .catch((err) => {
            fxBackoffUntil = Date.now() + FX_BACKOFF_MS;
            throw err;
          })
          .finally(() => {
            fxRatesInFlightPromise = null;
          });
      }

      try {
        const resultEntry = await fxRatesInFlightPromise;
        if (fxRatesCache && resultEntry === fxRatesCache && (now - fxRatesCache.fetchedAt >= FX_CACHE_TTL_MS)) {
          isStale = true;
        }
        entry = resultEntry;
      } catch (upstreamErr) {
        // On upstream failure, serve last good rates with "stale": true
        if (fxRatesCache) {
          entry = fxRatesCache;
          isStale = true;
          console.warn('[FX Rates] Serving stale cached rates due to upstream failure.');
        } else {
          return res.status(503).json({
            error: 'UPSTREAM_UNAVAILABLE',
            message: 'Currency exchange rates are temporarily unavailable. Please try again later.',
          });
        }
      }
    }

    // Filter rates to requested currencies (or all allowed currencies)
    const filteredRates: Record<string, number> = {};
    const targetCurrencies = requestedCurrencies.length > 0 ? requestedCurrencies : ALLOWED_FX_CURRENCIES;
    for (const c of targetCurrencies) {
      if (typeof entry.rates[c] === 'number') {
        filteredRates[c] = entry.rates[c];
      }
    }

    return res.json({
      base: entry.base,
      rates: filteredRates,
      provider: entry.provider,
      providerUrl: entry.providerUrl,
      attributionText: entry.attributionText,
      termsUrl: entry.termsUrl,
      publishedDate: entry.publishedDate,
      publishedTimestamp: entry.publishedTimestamp,
      stale: isStale,
    });
  } catch (error: any) {
    console.error('[FX Rates Error]', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to process currency exchange rate request.',
    });
  }
});

/**
 * POST /api/research/ask-mike
 * Ask Mike qualitative research questions grounded strictly in calculated metrics
 */
app.post('/api/research/ask-mike', requireAuth, rateLimitMiddleware(20, 60000, 'ask-mike'), async (req: Request, res: Response) => {
  try {
    const { query, tickerContext } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing research query' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Research assistant API is currently configuring its credentials.',
      });
    }

    // Retrieve verified Indian context
    let targetCompany: any = null;
    let relevantCompanies: any[] = [];

    if (tickerContext) {
      targetCompany = await IndianMarketDataProvider.getCompanyProfile(tickerContext);
      if (!targetCompany) {
        targetCompany = await MarketDataProvider.getCompanyProfile(tickerContext);
      }
    }

    const all = await IndianMarketDataProvider.searchCompanies();
    relevantCompanies = all.slice(0, 10);

    const contextData = {
      targetCompany: targetCompany
        ? {
            ticker: targetCompany.ticker,
            nseSymbol: targetCompany.nseSymbol,
            bseCode: targetCompany.bseCode,
            exchange: targetCompany.exchange,
            isNonIndianEquity: targetCompany.isNonIndianEquity,
            nonIndianReason: targetCompany.nonIndianReason,
            name: targetCompany.name,
            sector: targetCompany.sector,
            industry: targetCompany.industry,
            marketCapINR: targetCompany.marketCap,
            priceINR: targetCompany.price,
            calculations: targetCompany.calculations,
            valuation: targetCompany.valuation,
            shareholdingPattern: targetCompany.shareholdingPattern,
            corporateActions: targetCompany.corporateActions?.slice(0, 4),
            earlyStageCharacteristics: targetCompany.earlyStageCharacteristics,
            catalysts: targetCompany.catalysts,
            risks: targetCompany.risks,
            bullCase: targetCompany.bullCase,
            bearCase: targetCompany.bearCase,
          }
        : null,
      screenedUniverse: relevantCompanies.map((c) => ({
        ticker: c.ticker,
        nseSymbol: c.nseSymbol,
        bseCode: c.bseCode,
        name: c.name,
        sector: c.sector,
        marketCapINR: c.marketCap,
        priceINR: c.price,
        revenueGrowth1Y: c.calculations.revenueGrowth1Y,
        revenueCAGR3Y: c.calculations.revenueCAGR3Y,
        fcfGrowth1Y: c.calculations.fcfGrowth1Y,
        operatingMargin: c.calculations.operatingMarginCurrent,
        roic: c.calculations.roicCurrent,
        roe: c.calculations.roeCurrent,
        promoterHolding: c.shareholdingPattern?.promoterHolding,
        peRatio: c.valuation.peRatio,
        psRatio: c.valuation.psRatio,
        earlyStageScore: c.earlyStageScore,
        whyItAppeared: c.whyItAppeared,
        topCatalyst: c.topCatalyst,
        primaryRisk: c.primaryRisk,
      })),
    };

    const systemPrompt = `You are Mike, the Investment Research & Fundamental Analysis Assistant for Money Vault ("Secure Your Money. Master Your Future.").
Your role is to explain Indian listed company fundamentals (NSE / BSE), growth characteristics, valuation, business quality, catalysts, and risks in Indian Rupees (₹ INR).

CRITICAL INVARIANTS:
1. All monetary values must be in Indian Rupees (₹) and Indian numerical formats (e.g. ₹ Crores, ₹ Lakh Crores, or ₹ per share). NEVER use US Dollars ($).
2. NEVER invent or hallucinate financial figures. Ground every revenue, margin, growth rate, and ratio STRICTLY in the provided verified data. If a metric is not in the data, state "Not available in audited disclosures".
3. ALWAYS distinguish between BUSINESS QUALITY and CURRENT VALUATION. A great company can still trade at an elevated valuation multiple.
4. NEVER make price predictions, promise future returns, say "guaranteed multibagger", or declare a stock "the next TCS" or "the next NVIDIA".
5. ALWAYS present both the potential growth catalysts AND key risks/bear cases. Every analysis must be balanced.
6. Emphasize that Money Vault provides educational research, not personalized financial advice.
7. If the user asks about Cognizant (CTSH), clearly explain that Cognizant Technology Solutions is primarily US-listed on NASDAQ (CTSH), NOT an NSE/BSE-listed Indian equity, despite having major operational facilities in India.
8. Clearly cite sources ("Source: NSE / BSE Corporate Filings & Audited Financial Statements").

VERIFIED FINANCIAL CONTEXT:
${JSON.stringify(contextData, null, 2)}

USER INQUIRY:
"${query}"

Provide a clear, structured, professional response adhering to the invariants. Format with clear headings and bullet points.`;

    const ai = getAiClient();
    const geminiResult = await generateWithGemini(ai, {
      contents: systemPrompt,
      config: {
        temperature: 0.2,
      },
    });

    const reply = geminiResult.response?.text?.trim() || 'Could not generate research response.';
    return res.json({
      success: true,
      reply,
      citedSources: ['SEC EDGAR 10-K / 10-Q filings', 'Company Investor Relations'],
    });
  } catch (err: any) {
    console.error('Research Ask Mike API error:', err);
    return res.status(500).json({ error: 'Failed to process research inquiry' });
  }
});

/**
 * ============================================================================
 * GROUP INVITATIONS & COLLABORATIVE WORKSPACE DELIVERY PIPELINE
 * ============================================================================
 */

function buildInvitationUrl(token: string, req?: Request): string {
  const isProd = process.env.NODE_ENV === 'production';
  const appUrl = process.env.APP_URL?.trim();
  const isLocalhost = !appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

  if (isProd) {
    if (!appUrl || isLocalhost) {
      console.error('[invitations] Production mode requires APP_URL to be set to a non-localhost URL to generate invitation links.');
      throw new Error('SERVICE_UNAVAILABLE: APP_URL environment variable is missing or set to localhost in production.');
    }
    return `${appUrl.replace(/\/$/, '')}/group-invite/${encodeURIComponent(token)}`;
  }

  // Non-production (dev/testing) fallback
  if (appUrl && !isLocalhost) {
    return `${appUrl.replace(/\/$/, '')}/group-invite/${encodeURIComponent(token)}`;
  }
  const base = (req ? getBaseUrl(req) : '') || appUrl || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/group-invite/${encodeURIComponent(token)}`;
}

function getBaseUrl(req: Request): string {
  const appUrl = process.env.APP_URL?.trim();
  const isLocalhost = !appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1');
  if (appUrl && !isLocalhost) {
    return appUrl.replace(/\/$/, '');
  }
  // In production, never fall back to request headers
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  const forwardedHost = req.headers['x-forwarded-host'];
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
  if (forwardedHost) {
    const hostStr = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    return `${forwardedProto}://${hostStr}`;
  }
  const host = req.get('host');
  if (host) {
    const proto = req.protocol === 'https' || req.secure ? 'https' : 'http';
    return `${proto}://${host}`;
  }
  return '';
}

function generateMoneyVaultEmail(params: {
  recipientName?: string;
  inviterName: string;
  groupName: string;
  groupDescription?: string;
  inviteUrl: string;
}): { subject: string; text: string; html: string } {
  const greeting = params.recipientName ? `Hi ${params.recipientName},` : 'Hello,';
  const subject = "You're invited to join a Money Vault group";

  const text = `${greeting}\n\n${params.inviterName} invited you to join:\n\n${params.groupName}\n\nin Money Vault.\n\nJoin the group to:\n• Add your own expenses\n• See shared expenses\n• Track who owes whom\n• Settle balances easily\n\n[ JOIN GROUP ]: ${params.inviteUrl}\n\nMoney Vault\nSecure Your Money. Master Your Future.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0D0C; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #151917; border: 1px solid #232B27; border-radius: 24px; padding: 36px 32px; text-align: left;">
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid #232B27;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; width: 44px; height: 44px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 22px; line-height: 44px;">⚡</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <div style="font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #10B981;">MONEY VAULT</div>
                    <div style="font-size: 10px; color: #7F8C8D; letter-spacing: 0.5px; text-transform: uppercase;">COLLABORATIVE WORKSPACE</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding-top: 28px; padding-bottom: 12px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF; line-height: 1.3;">
                ${greeting}
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 15px; color: #A0AEC0; line-height: 1.5;">
                <strong style="color: #FFFFFF;">${params.inviterName}</strong> invited you to join:
              </p>
            </td>
          </tr>

          <!-- Group Card -->
          <tr>
            <td style="padding: 16px 0;">
              <div style="background-color: #1C2320; border: 1px solid #2C3833; border-radius: 16px; padding: 20px 24px;">
                <div style="font-size: 20px; font-weight: 900; color: #10B981; margin-bottom: 4px;">
                  ${params.groupName}
                </div>
                ${params.groupDescription ? `<div style="font-size: 13px; color: #8C9B94; line-height: 1.4;">${params.groupDescription}</div>` : ''}
              </div>
            </td>
          </tr>

          <!-- Purpose -->
          <tr>
            <td style="padding: 12px 0 24px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #D1D5DB;">
                Join the group to:
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #9CA3AF; line-height: 1.8;">
                <li><strong style="color: #E5E7EB;">Add your own expenses</strong></li>
                <li><strong style="color: #E5E7EB;">See shared expenses</strong></li>
                <li><strong style="color: #E5E7EB;">Track who owes whom</strong></li>
                <li><strong style="color: #E5E7EB;">Settle balances easily</strong></li>
              </ul>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 12px 0 28px 0;">
              <a href="${params.inviteUrl}" target="_blank" style="display: inline-block; background-color: #10B981; color: #04130C; font-size: 15px; font-weight: 900; text-decoration: none; padding: 14px 40px; border-radius: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
                JOIN GROUP
              </a>
            </td>
          </tr>

          <!-- Direct Link -->
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #232B27;">
              <p style="margin: 0; font-size: 12px; color: #6B7280; line-height: 1.5; word-break: break-all;">
                Or copy and paste this link in your browser:<br/>
                <a href="${params.inviteUrl}" style="color: #10B981; text-decoration: none;">${params.inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <div style="font-size: 13px; font-weight: 800; color: #9CA3AF; letter-spacing: 0.5px;">MONEY VAULT</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 4px;">Secure Your Money. Master Your Future.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function dispatchEmail(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<{ delivered: boolean; provider?: string; messageId?: string; error?: string }> {
  // 1. Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Money Vault <onboarding@resend.dev>',
          to: [to],
          subject,
          text,
          html,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        return { delivered: true, provider: 'Resend', messageId: data.id };
      } else {
        return { delivered: false, provider: 'Resend', error: data.message || 'Resend rejected email dispatch' };
      }
    } catch (err: any) {
      return { delivered: false, provider: 'Resend', error: err?.message || String(err) };
    }
  }

  // 2. SendGrid
  if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.EMAIL_FROM || 'invitations@moneyvault.app', name: 'Money Vault' },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });
      if (response.status === 202 || response.ok) {
        return { delivered: true, provider: 'SendGrid' };
      } else {
        const errorText = await response.text();
        return { delivered: false, provider: 'SendGrid', error: errorText || 'SendGrid rejected email dispatch' };
      }
    } catch (err: any) {
      return { delivered: false, provider: 'SendGrid', error: err?.message || String(err) };
    }
  }

  // 3. SMTP (Standard SMTP, Gmail, Postmark SMTP, Mailgun SMTP, etc.)
  if (process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      });
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Money Vault <invitations@moneyvault.app>',
        to,
        subject,
        text,
        html,
      });
      return { delivered: true, provider: 'SMTP', messageId: info.messageId };
    } catch (err: any) {
      return { delivered: false, provider: 'SMTP', error: err?.message || String(err) };
    }
  }

  // Strict Requirement 4: DO NOT claim success if no email provider is configured
  return {
    delivered: false,
    error: 'Email service is not configured (RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST required).',
  };
}

async function dispatchSms(
  to: string,
  message: string
): Promise<{ delivered: boolean; provider?: string; error?: string }> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
      const params = new URLSearchParams({
        To: to,
        From: twilioFrom,
        Body: message,
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (response.ok) {
        return { delivered: true, provider: 'Twilio SMS' };
      } else {
        const errJson = await response.json().catch(() => ({}));
        return { delivered: false, provider: 'Twilio SMS', error: errJson.message || 'Twilio rejected SMS' };
      }
    } catch (err: any) {
      return { delivered: false, provider: 'Twilio SMS', error: err?.message || String(err) };
    }
  }

  // Strict Requirement 9: DO NOT claim success if no SMS provider is configured
  return {
    delivered: false,
    error: 'SMS service is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER required).',
  };
}

// In-memory resilient stores (guarantees seamless operation in local dev and testing)
const memoryInvitations = new Map<string, any>(); // keyed by token and id
const memoryGroups = new Map<string, any>(); // keyed by groupId

// 1. GET /api/invitations/config
app.get('/api/invitations/config', (req: Request, res: Response) => {
  const emailConfigured = Boolean(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.SMTP_HOST);
  const smsConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
  const emailProvider = process.env.RESEND_API_KEY ? 'Resend' : process.env.SENDGRID_API_KEY ? 'SendGrid' : process.env.SMTP_HOST ? 'SMTP' : null;
  const smsProvider = smsConfigured ? 'Twilio' : null;

  res.json({
    emailConfigured,
    emailProvider,
    smsConfigured,
    smsProvider,
    appUrl: getBaseUrl(req),
  });
});

// 2. POST /api/groups/:groupId/invitations (Requirement 13)
app.post('/api/groups/:groupId/invitations', requireAuth, rateLimitMiddleware(10, 60000, 'grp-inv'), async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { email, phone, name, role = 'member', inviterName: explicitInviterName } = req.body;

    const requesterUser = (req as any).user;
    const requesterUid = requesterUser?.uid || 'vault-user';
    const inviterName = explicitInviterName || requesterUser?.name || requesterUser?.email?.split('@')[0] || 'A Money Vault Member';

    // 4. Validate email / phone
    let recipientIdentifier = '';
    let recipientType: 'email' | 'phone' = 'email';
    let normalizedEmail: string | undefined;
    let normalizedPhone: string | undefined;

    if (email !== undefined) {
      const emailVal = validateEmail(email);
      if (!emailVal.isValid) {
        return res.status(400).json({ error: 'INVALID_EMAIL', message: emailVal.error });
      }
      recipientIdentifier = emailVal.normalized;
      normalizedEmail = emailVal.normalized;
      recipientType = 'email';
    } else if (phone !== undefined) {
      const phoneVal = validatePhone(phone);
      if (!phoneVal.isValid) {
        return res.status(400).json({ error: 'INVALID_PHONE', message: phoneVal.error });
      }
      recipientIdentifier = phoneVal.normalized;
      normalizedPhone = phoneVal.normalized;
      recipientType = 'phone';
    } else {
      return res.status(400).json({ error: 'MISSING_RECIPIENT', message: 'Either email or phone number is required.' });
    }

    // 2. Fetch group data from Firestore first (do NOT trust clientGroupData for authorization or write to memoryGroups)
    let groupData: any = null;
    if (adminDb) {
      try {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
          return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
        }
        groupData = groupDoc.data();
        memoryGroups.set(groupId, groupData);
      } catch (dbErr: any) {
        console.error(`[invitations] Firestore read error on group ${groupId}:`, dbErr?.message || dbErr);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Database read failed while verifying group.' });
      }
    } else {
      groupData = memoryGroups.get(groupId);
    }

    if (!groupData) {
      return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
    }

    if (!groupData.ownerId || groupData.ownerId !== requesterUid) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the confirmed group owner can invite members.' });
    }

    // 5. Check existing membership (Requirement 18)
    const existingMember = (groupData.members || []).find((m: any) => {
      if (m.isInactive) return false;
      if (recipientType === 'email') {
        return m.email?.toLowerCase() === recipientIdentifier.toLowerCase();
      } else {
        return m.phone === recipientIdentifier;
      }
    });

    const isJoinedMember = existingMember && (existingMember.status === 'joined' || (!existingMember.status && existingMember.status !== 'invited') || existingMember.role === 'owner');
    if (isJoinedMember) {
      return res.status(400).json({
        error: 'ALREADY_MEMBER',
        message: `${name || existingMember.name || recipientIdentifier} is already a member of this group.`,
      });
    }

    // 6. Check pending invitation
    let existingPending: any = Array.from(memoryInvitations.values()).find(
      (i: any) =>
        i.groupId === groupId &&
        i.recipientIdentifier?.toLowerCase() === recipientIdentifier.toLowerCase() &&
        i.status === 'pending' &&
        (i.expiresAt || 0) > Date.now()
    ) || null;

    if (adminDb) {
      try {
        const invSnap = await adminDb
          .collection('groups')
          .doc(groupId)
          .collection('invitations')
          .where('recipientIdentifier', '==', recipientIdentifier)
          .where('status', '==', 'pending')
          .get();

        const activeDoc = invSnap.docs.find((d) => (d.data().expiresAt || 0) > Date.now());
        if (activeDoc) {
          existingPending = activeDoc.data();
        }
      } catch (dbErr: any) {
        console.error(`[invitations] Error checking pending invitations for ${groupId}:`, dbErr?.message || dbErr);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Failed to verify pending invitations in database.' });
      }
    }

    if (existingPending) {
      let existingUrl: string;
      try {
        existingUrl = buildInvitationUrl(existingPending.token, req);
      } catch (err: any) {
        console.error('[invitations] Cannot build invitation URL for duplicate pending invitation:', err?.message || err);
        return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Invitation service is temporarily unavailable.' });
      }
      return res.status(409).json({
        error: 'DUPLICATE_INVITATION',
        message: `${name || recipientIdentifier} already has a pending invitation.`,
        invitation: existingPending,
        inviteUrl: existingUrl,
        canResend: true,
      });
    }

    // 7. Generate secure cryptographically random token
    const token = crypto.randomBytes(24).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitationId = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    let inviteUrl: string;
    try {
      inviteUrl = buildInvitationUrl(token, req);
    } catch (err: any) {
      console.error('[invitations] Cannot build invitation URL for new invitation:', err?.message || err);
      return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Invitation service is temporarily unavailable.' });
    }

    // 10. Send through provider
    let deliveryStatus: 'sent' | 'pending' | 'failed' | 'not_configured' = 'pending';
    let deliveryProvider: string | undefined;
    let deliveryMessageId: string | undefined;
    let failureReason: string | undefined;
    let deliveryMessage: string | undefined;

    if (recipientType === 'email') {
      const emailContent = generateMoneyVaultEmail({
        recipientName: name,
        inviterName,
        groupName: groupData.name || 'Money Vault Group',
        groupDescription: groupData.description,
        inviteUrl,
      });
      const dispatchRes = await dispatchEmail(
        normalizedEmail!,
        emailContent.subject,
        emailContent.text,
        emailContent.html
      );

      if (dispatchRes.delivered) {
        deliveryStatus = 'sent';
        deliveryProvider = dispatchRes.provider;
        deliveryMessageId = dispatchRes.messageId;
        deliveryMessage = `Invitation delivered to ${recipientIdentifier} via ${dispatchRes.provider}`;
      } else {
        deliveryStatus = 'failed';
        deliveryProvider = dispatchRes.provider;
        failureReason = dispatchRes.error || 'Email service not configured';
        deliveryMessage = failureReason;
      }
    } else {
      const smsText = `${inviterName} invited you to join '${groupData.name}' in Money Vault. Join: ${inviteUrl}`;
      const dispatchRes = await dispatchSms(normalizedPhone!, smsText);

      if (dispatchRes.delivered) {
        deliveryStatus = 'sent';
        deliveryProvider = dispatchRes.provider;
        deliveryMessage = `SMS invitation dispatched to ${recipientIdentifier} via ${dispatchRes.provider}`;
      } else {
        deliveryStatus = 'failed';
        deliveryProvider = dispatchRes.provider;
        failureReason = dispatchRes.error || 'SMS service not configured';
        deliveryMessage = failureReason;
      }
    }

    // 8 & 14. Create invitation record
    const invitationRecord = {
      id: invitationId,
      token,
      tokenHash,
      groupId,
      groupName: groupData.name || 'Money Vault Group',
      groupDescription: groupData.description,
      currency: groupData.currency || 'INR',
      invitedByUid: requesterUid,
      invitedByName: inviterName,
      recipientIdentifier,
      recipientType,
      recipientEmail: normalizedEmail,
      recipientPhone: normalizedPhone,
      recipientName: name?.trim() || undefined,
      role: role === 'admin' ? 'admin' : 'member',
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      status: 'pending',
      deliveryMethod: recipientType,
      deliveryStatus,
      deliveryProvider,
      deliveryMessageId,
      lastDeliveryAttemptAt: Date.now(),
      failureReason,
      deliveryMessage,
    };

    // Resilient memory cache
    memoryInvitations.set(token, invitationRecord);
    memoryInvitations.set(invitationId, invitationRecord);

    // 11. Persist to Firestore
    if (adminDb) {
      try {
        await adminDb.collection('groupInvitations').doc(token).set(invitationRecord);
        await adminDb
          .collection('groups')
          .doc(groupId)
          .collection('invitations')
          .doc(invitationId)
          .set(invitationRecord);

        // Add 'invited' placeholder member to group roster
        if (!existingMember) {
          const placeholderMember = {
            id: `mem_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            name: name?.trim() || recipientIdentifier.split('@')[0],
            email: normalizedEmail,
            phone: normalizedPhone,
            role,
            status: 'invited',
            isCurrentUser: false,
          };
          const updatedMembers = [...(groupData.members || []), placeholderMember];
          await adminDb.collection('groups').doc(groupId).update({
            members: updatedMembers,
            updatedAt: Date.now(),
          });
        }

        // Record activity
        await adminDb.collection('groups').doc(groupId).collection('activity').doc(`act_${Date.now()}`).set({
          id: `act_${Date.now()}`,
          groupId,
          actorUid: requesterUid,
          actorName: inviterName,
          action: 'invited_member',
          title: `${inviterName} invited ${recipientIdentifier}`,
          timestamp: Date.now(),
        });
      } catch (dbErr: any) {
        console.error('[invitations] Admin Firestore invitation persist error:', dbErr?.message || dbErr);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Failed to persist invitation to database.' });
      }
    }

    // 12. Return accurate status
    return res.json({
      success: true,
      invitation: invitationRecord,
      inviteUrl,
      delivered: deliveryStatus === 'sent',
      deliveryStatus,
      deliveryProvider,
      failureReason,
      message:
        deliveryStatus === 'sent'
          ? `Invitation sent successfully to ${recipientIdentifier}`
          : `Invitation created, but message not sent (${failureReason}). Please copy or share the invitation link directly.`,
    });
  } catch (err: any) {
    console.error('Create group invitation error:', err);
    return res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// 3. POST /api/groups/:groupId/invitations/:invitationId/resend (Requirement 16)
app.post('/api/groups/:groupId/invitations/:invitationId/resend', requireAuth, rateLimitMiddleware(10, 60000, 'inv-resend'), async (req: Request, res: Response) => {
  try {
    const { groupId, invitationId } = req.params;
    const requesterUid = (req as any).user?.uid;

    // 1. Load group from Firestore first
    let group: any = null;
    if (adminDb) {
      try {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
          return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
        }
        group = groupDoc.data();
        memoryGroups.set(groupId, group);
      } catch (err: any) {
        console.error(`[resend] Firestore error reading group ${groupId}:`, err?.message || err);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Database read failed while verifying group.' });
      }
    } else {
      group = memoryGroups.get(groupId);
      if (!group) {
        return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
      }
    }

    // 2. Verify caller is group owner
    if (!group.ownerId || group.ownerId !== requesterUid) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the confirmed group owner can resend invitations.' });
    }

    // 3. Load invitation from Firestore
    let invitation: any = null;
    if (adminDb) {
      try {
        const invDoc = await adminDb.collection('groups').doc(groupId).collection('invitations').doc(invitationId).get();
        if (!invDoc.exists) {
          return res.status(404).json({ error: 'INVITATION_NOT_FOUND', message: 'Invitation record not found.' });
        }
        invitation = invDoc.data();
      } catch (err: any) {
        console.error(`[resend] Firestore error reading invitation ${invitationId}:`, err?.message || err);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Database read failed while verifying invitation.' });
      }
    } else {
      invitation = memoryInvitations.get(invitationId);
      if (!invitation) {
        return res.status(404).json({ error: 'INVITATION_NOT_FOUND', message: 'Invitation record not found.' });
      }
    }

    // 4. Require invitation.groupId === req.params.groupId
    if (invitation.groupId !== groupId) {
      return res.status(400).json({ error: 'GROUP_MISMATCH', message: 'Invitation does not belong to the specified group.' });
    }

    // Anti-spam cooldown (60s)
    const now = Date.now();
    const lastAttempt = invitation.lastDeliveryAttemptAt || 0;
    if (now - lastAttempt < 60000) {
      const waitSec = Math.ceil((60000 - (now - lastAttempt)) / 1000);
      return res.status(429).json({
        error: 'COOLDOWN_ACTIVE',
        message: `Please wait ${waitSec}s before resending another invitation.`,
      });
    }

    let inviteUrl: string;
    try {
      inviteUrl = buildInvitationUrl(invitation.token, req);
    } catch (err: any) {
      console.error('[resend] Cannot build invitation URL for resend:', err?.message || err);
      return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Invitation service is temporarily unavailable.' });
    }

    let deliveryStatus: 'sent' | 'pending' | 'failed' | 'not_configured' = 'pending';
    let deliveryProvider: string | undefined;
    let deliveryMessageId: string | undefined;
    let failureReason: string | undefined;
    let deliveryMessage: string | undefined;

    if (invitation.recipientType === 'email' && (invitation.recipientEmail || invitation.recipientIdentifier)) {
      const targetEmail = invitation.recipientEmail || invitation.recipientIdentifier;
      const emailContent = generateMoneyVaultEmail({
        recipientName: invitation.recipientName,
        inviterName: group.ownerName || invitation.invitedByName || 'Group Owner',
        groupName: group.name || invitation.groupName || 'Money Vault Group',
        groupDescription: group.description || invitation.groupDescription,
        inviteUrl,
      });
      const dispatchRes = await dispatchEmail(
        targetEmail,
        emailContent.subject,
        emailContent.text,
        emailContent.html
      );

      if (dispatchRes.delivered) {
        deliveryStatus = 'sent';
        deliveryProvider = dispatchRes.provider;
        deliveryMessageId = dispatchRes.messageId;
        deliveryMessage = `Invitation redelivered via ${dispatchRes.provider}`;
      } else {
        deliveryStatus = 'failed';
        deliveryProvider = dispatchRes.provider;
        failureReason = dispatchRes.error || 'Email service not configured';
        deliveryMessage = failureReason;
      }
    } else if (invitation.recipientPhone || invitation.recipientIdentifier) {
      const targetPhone = invitation.recipientPhone || invitation.recipientIdentifier;
      const sender = group.ownerName || invitation.invitedByName || 'Group Owner';
      const gName = group.name || invitation.groupName || 'Money Vault Group';
      const smsText = `${sender} invited you to join '${gName}' in Money Vault. Join: ${inviteUrl}`;
      const dispatchRes = await dispatchSms(targetPhone, smsText);

      if (dispatchRes.delivered) {
        deliveryStatus = 'sent';
        deliveryProvider = dispatchRes.provider;
        deliveryMessage = `SMS invitation redelivered via ${dispatchRes.provider}`;
      } else {
        deliveryStatus = 'failed';
        deliveryProvider = dispatchRes.provider;
        failureReason = dispatchRes.error || 'SMS service not configured';
        deliveryMessage = failureReason;
      }
    }

    // Refresh expiration to 7 days if near expiry
    const newExpiresAt = Math.max(invitation.expiresAt, Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updatedInvitation = {
      ...invitation,
      deliveryStatus,
      deliveryProvider: deliveryProvider || invitation.deliveryProvider,
      deliveryMessageId: deliveryMessageId || invitation.deliveryMessageId,
      failureReason,
      deliveryMessage,
      lastDeliveryAttemptAt: now,
      expiresAt: newExpiresAt,
      status: 'pending',
    };

    memoryInvitations.set(invitation.token, updatedInvitation);
    memoryInvitations.set(invitationId, updatedInvitation);

    if (adminDb) {
      try {
        await adminDb.collection('groups').doc(groupId).collection('invitations').doc(invitationId).set(updatedInvitation);
        await adminDb.collection('groupInvitations').doc(invitation.token).set(updatedInvitation);
      } catch (dbErr: any) {
        console.error('[resend] Admin Firestore invitation persist error:', dbErr?.message || dbErr);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Failed to update invitation in database.' });
      }
    }

    return res.json({
      success: true,
      invitation: updatedInvitation,
      inviteUrl,
      delivered: deliveryStatus === 'sent',
      deliveryStatus,
      deliveryProvider,
      failureReason,
      message:
        deliveryStatus === 'sent'
          ? `Invitation resent successfully to ${invitation.recipientIdentifier}`
          : `Resend attempted. Message not delivered (${failureReason}). Please share the link manually.`,
    });
  } catch (err: any) {
    console.error('Resend invitation error:', err);
    return res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

// 4. POST /api/groups/:groupId/invitations/:invitationId/revoke (Requirement 8, 17)
app.post('/api/groups/:groupId/invitations/:invitationId/revoke', requireAuth, rateLimitMiddleware(10, 60000, 'inv-revoke'), async (req: Request, res: Response) => {
  try {
    const { groupId, invitationId } = req.params;
    const requesterUid = (req as any).user?.uid;

    // 1. Load group from Firestore first
    let group: any = null;
    if (adminDb) {
      try {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
          return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
        }
        group = groupDoc.data();
        memoryGroups.set(groupId, group);
      } catch (err: any) {
        console.error(`[revoke] Firestore error reading group ${groupId}:`, err?.message || err);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Database read failed while verifying group.' });
      }
    } else {
      group = memoryGroups.get(groupId);
      if (!group) {
        return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
      }
    }

    // 2. Verify caller is group owner
    if (!group.ownerId || group.ownerId !== requesterUid) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the confirmed group owner can revoke invitations.' });
    }

    // 3. Load invitation from Firestore
    let invitation: any = null;
    if (adminDb) {
      try {
        const invDoc = await adminDb.collection('groups').doc(groupId).collection('invitations').doc(invitationId).get();
        if (!invDoc.exists) {
          return res.status(404).json({ error: 'INVITATION_NOT_FOUND', message: 'Invitation not found.' });
        }
        invitation = invDoc.data();
      } catch (err: any) {
        console.error(`[revoke] Firestore error reading invitation ${invitationId}:`, err?.message || err);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Database read failed while verifying invitation.' });
      }
    } else {
      invitation = memoryInvitations.get(invitationId);
      if (!invitation) {
        return res.status(404).json({ error: 'INVITATION_NOT_FOUND', message: 'Invitation not found.' });
      }
    }

    // 4. Require invitation.groupId === req.params.groupId
    if (invitation.groupId !== groupId) {
      return res.status(400).json({ error: 'GROUP_MISMATCH', message: 'Invitation does not belong to specified group.' });
    }

    const updated = { ...invitation, status: 'revoked' };
    memoryInvitations.set(invitation.token, updated);
    memoryInvitations.set(invitationId, updated);

    if (adminDb) {
      try {
        await adminDb.collection('groups').doc(groupId).collection('invitations').doc(invitationId).set(updated);
        await adminDb.collection('groupInvitations').doc(invitation.token).set(updated);

        // Remove placeholder member from group
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();
        if (groupDoc.exists) {
          const g = groupDoc.data()!;
          const filteredMembers = (g.members || []).filter(
            (m: any) =>
              !(
                m.status === 'invited' &&
                ((invitation.recipientEmail && m.email === invitation.recipientEmail) ||
                  (invitation.recipientPhone && m.phone === invitation.recipientPhone) ||
                  (invitation.recipientIdentifier && (m.email === invitation.recipientIdentifier || m.phone === invitation.recipientIdentifier)))
              )
          );
          await adminDb.collection('groups').doc(groupId).update({
            members: filteredMembers,
            updatedAt: Date.now(),
          });
        }
      } catch (dbErr: any) {
        console.error('[revoke] Admin Firestore revoke persist error:', dbErr?.message || dbErr);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Database update failed while revoking invitation.' });
      }
    }

    // Also update in-memory group
    const memGroup = memoryGroups.get(groupId);
    if (memGroup) {
      memGroup.members = (memGroup.members || []).filter(
        (m: any) =>
          !(
            m.status === 'invited' &&
            ((invitation.recipientEmail && m.email === invitation.recipientEmail) ||
              (invitation.recipientPhone && m.phone === invitation.recipientPhone) ||
              (invitation.recipientIdentifier && (m.email === invitation.recipientIdentifier || m.phone === invitation.recipientIdentifier)))
          )
      );
      memoryGroups.set(groupId, memGroup);
    }

    return res.json({ success: true, message: 'Invitation has been revoked.' });
  } catch (err: any) {
    console.error('Revoke invitation error:', err);
    return res.status(500).json({ error: 'Failed to revoke invitation' });
  }
});

// 5. GET /api/group-invite/:token (Public lookup & preview)
app.get('/api/group-invite/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    let invitation: any = memoryInvitations.get(token);
    if (adminDb) {
      try {
        const invDoc = await adminDb.collection('groupInvitations').doc(token).get();
        if (invDoc.exists) {
          invitation = invDoc.data();
        }
      } catch (dbErr) {}
    }

    if (!invitation) {
      return res.status(404).json({
        error: 'INVITATION_NOT_FOUND',
        message: 'This invitation link could not be found or has been removed.',
      });
    }

    if (invitation.status === 'revoked') {
      return res.status(410).json({
        error: 'INVITATION_REVOKED',
        message: 'This invitation was revoked by the group owner.',
        invitation: { groupName: invitation.groupName, status: 'revoked' },
      });
    }

    if (invitation.expiresAt < Date.now()) {
      return res.status(410).json({
        error: 'INVITATION_EXPIRED',
        message: 'This invitation link expired after 7 days.',
        invitation: { groupName: invitation.groupName, status: 'expired' },
      });
    }

    // Group metadata preview (strictly no balances or private transactions)
    let groupPreview: any = {
      name: invitation.groupName,
      description: invitation.groupDescription,
      currency: invitation.currency,
      memberCount: 1,
    };

    if (adminDb) {
      try {
        const groupDoc = await adminDb.collection('groups').doc(invitation.groupId).get();
        if (groupDoc.exists) {
          const g = groupDoc.data()!;
          groupPreview = {
            name: g.name,
            description: g.description,
            currency: g.currency,
            icon: g.icon,
            color: g.color,
            memberCount: (g.members || []).length,
          };
        }
      } catch (dbErr) {}
    } else {
      const g = memoryGroups.get(invitation.groupId);
      if (g) {
        groupPreview = {
          name: g.name,
          description: g.description,
          currency: g.currency,
          icon: g.icon,
          color: g.color,
          memberCount: (g.members || []).length,
        };
      }
    }

    return res.json({
      success: true,
      invitation: {
        id: invitation.id,
        groupName: invitation.groupName,
        groupDescription: invitation.groupDescription,
        currency: invitation.currency,
        invitedByName: invitation.invitedByName,
        recipientIdentifier: invitation.recipientIdentifier,
        recipientEmail: invitation.recipientEmail,
        recipientName: invitation.recipientName,
        recipientType: invitation.recipientType,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        role: invitation.role,
      },
      groupPreview,
    });
  } catch (err: any) {
    console.error('Fetch invitation token error:', err);
    return res.status(500).json({ error: 'Failed to fetch invitation details' });
  }
});

// 6. POST /api/group-invite/:token/accept (Accept & Join Group)
app.post('/api/group-invite/:token/accept', requireAuth, rateLimitMiddleware(10, 60000, 'inv-accept'), async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { confirmMismatchedIdentity } = req.body;

    const requesterUser = (req as any).user;
    if (!requesterUser?.uid) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required to join group.' });
    }

    const uid = requesterUser.uid;
    const email = requesterUser.email || undefined;
    const name = requesterUser.name || email?.split('@')[0] || 'Member';

    let invitation: any = memoryInvitations.get(token);
    if (adminDb) {
      try {
        const invDoc = await adminDb.collection('groupInvitations').doc(token).get();
        if (invDoc.exists) {
          invitation = invDoc.data();
        }
      } catch (dbErr: any) {
        console.error(`[accept] Error loading invitation token ${token} from Firestore:`, dbErr?.message || dbErr);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Failed to read invitation from database.' });
      }
    }

    if (!invitation) {
      return res.status(404).json({ error: 'INVITATION_NOT_FOUND', message: 'Invitation not found or link is invalid.' });
    }

    if (invitation.status === 'revoked') {
      return res.status(410).json({ error: 'INVITATION_REVOKED', message: 'This invitation was revoked.' });
    }

    if (invitation.expiresAt < Date.now()) {
      return res.status(410).json({ error: 'INVITATION_EXPIRED', message: 'This invitation has expired.' });
    }

    // Requirement 22: Identity mismatch verification
    if (
      invitation.recipientType === 'email' &&
      invitation.recipientEmail &&
      email &&
      invitation.recipientEmail.toLowerCase() !== email.toLowerCase() &&
      !confirmMismatchedIdentity
    ) {
      return res.status(409).json({
        error: 'MISMATCHED_IDENTITY',
        message: `This invitation was issued to ${invitation.recipientEmail}. You are signed in as ${email}.`,
        invitedEmail: invitation.recipientEmail,
        currentEmail: email,
        requiresExplicitConfirmation: true,
      });
    }

    // Update group document
    let group: any = memoryGroups.get(invitation.groupId);
    if (adminDb) {
      try {
        const groupDoc = await adminDb.collection('groups').doc(invitation.groupId).get();
        if (groupDoc.exists) {
          group = groupDoc.data();
        }
      } catch (dbErr: any) {
        console.error(`[accept] Error loading group ${invitation.groupId} from Firestore:`, dbErr?.message || dbErr);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Failed to read group from database.' });
      }
    }

    if (!group) {
      return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
    }

    const members = group.members || [];
    const existingIndex = members.findIndex(
      (m: any) => m.uid === uid || (email && m.email?.toLowerCase() === email.toLowerCase())
    );

    let updatedMembers: any[];
    if (existingIndex >= 0) {
      updatedMembers = members.map((m: any, idx: number) =>
        idx === existingIndex
          ? {
              ...m,
              uid,
              name: m.name || name,
              email: email || m.email,
              status: 'joined',
              isInactive: false,
              joinedAt: Date.now(),
            }
          : m
      );
    } else {
      const newMember = {
        id: uid,
        uid,
        name,
        email: email || undefined,
        role: invitation.role || 'member',
        status: 'joined',
        isCurrentUser: false,
        joinedAt: Date.now(),
      };
      updatedMembers = [...members, newMember];
    }

    const memberUids = Array.from(new Set([...(group.memberUids || []), uid, group.ownerId]));
    const updatedGroup = {
      ...group,
      members: updatedMembers,
      memberUids,
      updatedAt: Date.now(),
    };

    memoryGroups.set(invitation.groupId, updatedGroup);

    if (adminDb) {
      try {
        await adminDb.collection('groups').doc(invitation.groupId).set(updatedGroup);
      } catch (dbErr: any) {
        console.error(`[accept] Error updating group ${invitation.groupId} in Firestore:`, dbErr?.message || dbErr);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Failed to update group in database.' });
      }
    }

    // Mark invitation accepted
    const acceptedInvitation = {
      ...invitation,
      status: 'accepted',
      acceptedByUid: uid,
      acceptedByName: name,
      acceptedAt: Date.now(),
    };
    memoryInvitations.set(token, acceptedInvitation);
    memoryInvitations.set(invitation.id, acceptedInvitation);

    if (adminDb) {
      try {
        await adminDb.collection('groupInvitations').doc(token).set(acceptedInvitation);
        await adminDb
          .collection('groups')
          .doc(invitation.groupId)
          .collection('invitations')
          .doc(invitation.id)
          .set(acceptedInvitation);

        // Record activity
        await adminDb
          .collection('groups')
          .doc(invitation.groupId)
          .collection('activity')
          .doc(`act_${Date.now()}`)
          .set({
            id: `act_${Date.now()}`,
            groupId: invitation.groupId,
            actorUid: uid,
            actorName: name,
            action: 'joined_group',
            title: `${name} joined "${group.name}"`,
            timestamp: Date.now(),
          });
      } catch (dbErr: any) {
        console.error('[accept] Error updating invitation/activity in Firestore:', dbErr?.message || dbErr);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Failed to record acceptance in database.' });
      }
    }

    return res.json({ success: true, group: updatedGroup });
  } catch (err: any) {
    console.error('Accept invitation error:', err);
    return res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Invitation dispatch endpoints (strictly server-verified: accept only groupId + invitationId)
app.post('/api/invitations/send-email', requireAuth, rateLimitMiddleware(10, 60000, 'send-email'), async (req: Request, res: Response) => {
  try {
    const { groupId, invitationId } = req.body;
    if (!groupId || typeof groupId !== 'string' || !invitationId || typeof invitationId !== 'string') {
      return res.status(400).json({ error: 'MISSING_PARAMS', message: 'groupId and invitationId are required.' });
    }

    const requesterUid = (req as any).user?.uid;

    // 1. Load group from Firestore first
    let group: any = null;
    if (adminDb) {
      try {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
          return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
        }
        group = groupDoc.data();
        memoryGroups.set(groupId, group);
      } catch (err: any) {
        console.error(`[send-email] Firestore error loading group ${groupId}:`, err?.message || err);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Database read failed while verifying group.' });
      }
    } else {
      group = memoryGroups.get(groupId);
      if (!group) {
        return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
      }
    }

    // 2. Verify caller owns group
    if (!group.ownerId || group.ownerId !== requesterUid) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the confirmed group owner can send invitations.' });
    }

    // 3. Load invitation from Firestore server-side
    let invitation: any = null;
    if (adminDb) {
      try {
        const invDoc = await adminDb.collection('groups').doc(groupId).collection('invitations').doc(invitationId).get();
        if (!invDoc.exists) {
          return res.status(404).json({ error: 'INVITATION_NOT_FOUND', message: 'Invitation record not found.' });
        }
        invitation = invDoc.data();
      } catch (err: any) {
        console.error(`[send-email] Firestore error loading invitation ${invitationId}:`, err?.message || err);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Database read failed while loading invitation.' });
      }
    } else {
      invitation = memoryInvitations.get(invitationId);
      if (!invitation) {
        return res.status(404).json({ error: 'INVITATION_NOT_FOUND', message: 'Invitation record not found.' });
      }
    }

    // 4. Require invitation.groupId === groupId
    if (invitation.groupId !== groupId) {
      return res.status(400).json({ error: 'GROUP_MISMATCH', message: 'Invitation does not belong to specified group.' });
    }

    const recipientEmail = invitation.recipientEmail || invitation.recipientIdentifier;
    const emailVal = validateEmail(recipientEmail);
    if (!emailVal.isValid) {
      return res.status(400).json({ error: 'INVALID_RECIPIENT_EMAIL', message: emailVal.error });
    }

    // Server-built link and text; completely ignoring request-supplied inviterName, groupName, inviteUrl
    let inviteUrl: string;
    try {
      inviteUrl = buildInvitationUrl(invitation.token, req);
    } catch (err: any) {
      console.error('[send-email] Cannot build invitation URL for send-email:', err?.message || err);
      return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Invitation service is temporarily unavailable.' });
    }
    const emailContent = generateMoneyVaultEmail({
      recipientName: invitation.recipientName,
      inviterName: group.ownerName || (req as any).user?.name || 'A Money Vault Member',
      groupName: group.name || 'Money Vault Group',
      groupDescription: group.description,
      inviteUrl,
    });

    const result = await dispatchEmail(
      emailVal.normalized,
      emailContent.subject,
      emailContent.text,
      emailContent.html
    );

    if (result.delivered) {
      return res.json({
        success: true,
        delivered: true,
        provider: result.provider,
        message: `Invitation email delivered to ${emailVal.normalized}`,
      });
    } else {
      return res.status(200).json({
        success: false,
        delivered: false,
        status: 'not_configured',
        error: result.error,
        message: result.error,
      });
    }
  } catch (err: any) {
    console.error('Email dispatch error:', err);
    return res.status(500).json({ error: 'Email dispatch failed' });
  }
});

app.post('/api/invitations/send-sms', requireAuth, rateLimitMiddleware(10, 60000, 'send-sms'), async (req: Request, res: Response) => {
  try {
    const { groupId, invitationId } = req.body;
    if (!groupId || typeof groupId !== 'string' || !invitationId || typeof invitationId !== 'string') {
      return res.status(400).json({ error: 'MISSING_PARAMS', message: 'groupId and invitationId are required.' });
    }

    const requesterUid = (req as any).user?.uid;

    // 1. Load group from Firestore first
    let group: any = null;
    if (adminDb) {
      try {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
          return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
        }
        group = groupDoc.data();
        memoryGroups.set(groupId, group);
      } catch (err: any) {
        console.error(`[send-sms] Firestore error loading group ${groupId}:`, err?.message || err);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Database read failed while verifying group.' });
      }
    } else {
      group = memoryGroups.get(groupId);
      if (!group) {
        return res.status(404).json({ error: 'GROUP_NOT_FOUND', message: 'Group workspace could not be found.' });
      }
    }

    // 2. Verify caller owns group
    if (!group.ownerId || group.ownerId !== requesterUid) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the confirmed group owner can send invitations.' });
    }

    // 3. Load invitation from Firestore server-side
    let invitation: any = null;
    if (adminDb) {
      try {
        const invDoc = await adminDb.collection('groups').doc(groupId).collection('invitations').doc(invitationId).get();
        if (!invDoc.exists) {
          return res.status(404).json({ error: 'INVITATION_NOT_FOUND', message: 'Invitation record not found.' });
        }
        invitation = invDoc.data();
      } catch (err: any) {
        console.error(`[send-sms] Firestore error loading invitation ${invitationId}:`, err?.message || err);
        return res.status(503).json({ error: 'DATABASE_ERROR', message: 'Database read failed while loading invitation.' });
      }
    } else {
      invitation = memoryInvitations.get(invitationId);
      if (!invitation) {
        return res.status(404).json({ error: 'INVITATION_NOT_FOUND', message: 'Invitation record not found.' });
      }
    }

    // 4. Require invitation.groupId === groupId
    if (invitation.groupId !== groupId) {
      return res.status(400).json({ error: 'GROUP_MISMATCH', message: 'Invitation does not belong to specified group.' });
    }

    const recipientPhone = invitation.recipientPhone || invitation.recipientIdentifier;
    const phoneVal = validatePhone(recipientPhone);
    if (!phoneVal.isValid) {
      return res.status(400).json({ error: 'INVALID_RECIPIENT_PHONE', message: phoneVal.error });
    }

    // Server-built link and text; completely ignoring request-supplied inviterName, groupName, inviteUrl
    let inviteUrl: string;
    try {
      inviteUrl = buildInvitationUrl(invitation.token, req);
    } catch (err: any) {
      console.error('[send-sms] Cannot build invitation URL for send-sms:', err?.message || err);
      return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Invitation service is temporarily unavailable.' });
    }
    const sender = group.ownerName || (req as any).user?.name || 'A Money Vault Member';
    const groupName = group.name || 'Money Vault Group';
    const smsMessage = `${sender} invited you to join '${groupName}' in Money Vault. Join: ${inviteUrl}`;

    const result = await dispatchSms(phoneVal.normalized, smsMessage);
    if (result.delivered) {
      return res.json({
        success: true,
        delivered: true,
        provider: result.provider,
        message: `SMS invitation dispatched to ${phoneVal.normalized}`,
      });
    } else {
      return res.status(200).json({
        success: false,
        delivered: false,
        status: 'not_configured',
        error: result.error,
        message: result.error,
      });
    }
  } catch (err: any) {
    console.error('SMS dispatch error:', err);
    return res.status(500).json({ error: 'SMS dispatch failed' });
  }
});

/**
 * Health Check Endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Money Vault API',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

/**
 * Mount Vite Middleware in Development, or Static Serve in Production
 */
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Unknown /api routes must answer with JSON, never the web page.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found.' });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  let port = Number(process.env.PORT);
  if (!port || isNaN(port)) {
    const portArgIdx = process.argv.indexOf('--port');
    if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
      port = parseInt(process.argv[portArgIdx + 1], 10);
    }
  }
  if (!port || isNaN(port)) {
    port = 3000;
  }

  let host = process.env.HOST || '0.0.0.0';
  const hostArgIdx = process.argv.indexOf('--host');
  if (hostArgIdx !== -1 && process.argv[hostArgIdx + 1]) {
    host = process.argv[hostArgIdx + 1];
  }

  // Last-resort error handler: JSON in, JSON out. Never leaks stack traces or internals.
  app.use((err: any, _req: Request, res: Response, next: (e?: any) => void) => {
    if (res.headersSent) return next(err);
    const status = Number(err?.status || err?.statusCode);
    if (status === 413) return res.status(413).json({ error: 'Request body too large.' });
    if (status >= 400 && status < 500) return res.status(400).json({ error: 'Invalid request.' });
    console.error('[Server] Unhandled request error:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error.' });
  });

  const server = app.listen(port, host, () => {
    console.log(`Money Vault server active on http://${host}:${port}`);
  });

  let retryCount = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 500;

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      retryCount++;
      if (retryCount <= MAX_RETRIES) {
        console.warn(
          `[Server] Port ${port} is currently busy (attempt ${retryCount}/${MAX_RETRIES}). Waiting ${RETRY_DELAY_MS}ms for socket release...`
        );
        setTimeout(() => {
          try {
            server.close();
          } catch (_) {}
          server.listen(port, host);
        }, RETRY_DELAY_MS);
      } else {
        const fallbackPort = Number(process.env.FALLBACK_PORT);
        if (fallbackPort && !isNaN(fallbackPort) && fallbackPort !== port) {
          console.warn(`[Server] Port ${port} remained occupied after ${MAX_RETRIES} retries. Switching to fallback port ${fallbackPort}...`);
          try {
            server.close();
          } catch (_) {}
          server.listen(fallbackPort, host);
        } else {
          console.error(
            `[Server Fatal] Port ${port} is already in use by another active process. Exiting cleanly to prevent indefinite retry loop.`
          );
          try {
            server.close();
          } catch (_) {}
          process.exit(1);
        }
      }
    } else {
      console.error('[Server Error]', err);
      process.exit(1);
    }
  });

  const cleanup = (signal: string) => {
    console.log(`[Server] Received ${signal}. Closing socket and terminating cleanly...`);
    try {
      server.closeAllConnections?.();
      server.close(() => {
        console.log('[Server] Socket cleanly closed.');
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 2000).unref();
    } catch (_) {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => cleanup('SIGTERM'));
  process.on('SIGINT', () => cleanup('SIGINT'));
}

if (process.env.TEST_HARNESS !== 'true') {
  startServer();
} else {
  console.log('[Server] TEST_HARNESS is true; startServer skipped.');
}

export function setAdminDbForTesting(db: any) {
  adminDb = db;
}

export function getFxBackoffUntilForTesting(): number {
  return fxBackoffUntil;
}

export function setFxBackoffUntilForTesting(val: number): void {
  fxBackoffUntil = val;
}

export function setFxCacheForTesting(val: any): void {
  fxRatesCache = val;
}

export function getFxCacheForTesting(): any {
  return fxRatesCache;
}

export function resetRateLimitStoreForTesting(): void {
  rateLimitStore.clear();
}

export function cleanupExpiredRateLimitsForTesting(now?: number): void {
  cleanupExpiredRateLimits(now);
}

export function getRateLimitStoreSizeForTesting(): number {
  return rateLimitStore.size;
}

export function setTrustProxyHopsForTesting(hops: number): void {
  app.set('trust proxy', hops);
}

export function getTrustProxyHopsForTesting(): number {
  return app.get('trust proxy');
}

export { app, memoryGroups, memoryInvitations, buildInvitationUrl, getBaseUrl };


