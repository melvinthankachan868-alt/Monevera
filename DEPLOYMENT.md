# Money Vault — Production Deployment Guide

## 1. Required Environment Variables

Set these environment variables in your production container / hosting platform (e.g. Google Cloud Run, App Engine, or Docker environment):

| Variable | Required? | Purpose & Impact If Missing |
| :--- | :---: | :--- |
| `NODE_ENV` | **Yes** | Set to `production`. Serves compiled static assets from `/dist` and enforces production security guards. If missing, dev-mode behaviors and headers may remain active. |
| `APP_URL` | **Yes** | Canonical public HTTPS base URL (e.g. `https://moneyvault.app` or Cloud Run URL). Must be non-localhost in production. If missing or set to localhost, all invitation creation (`POST /api/groups/:groupId/invitations`), resend, and dispatch endpoints return HTTP `503 SERVICE_UNAVAILABLE`. |
| `GEMINI_API_KEY` | **Yes** (for AI) | Google Gemini API key used exclusively server-side. If missing, Mike AI assistant (`POST /api/gemini/chat`), receipt OCR (`POST /api/ocr/receipt`), and qualitative equity research (`POST /api/research/ask-mike`) return HTTP `503 SERVICE_UNAVAILABLE`. |

### Optional / Integration Environment Variables

| Variable | Type | Behavior When Missing |
| :--- | :--- | :--- |
| `GEMINI_MODELS` | Comma-separated strings | Fallback chain for Gemini models. Defaults to `gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash`. |
| `PORT` | Integer | Network port to listen on. Defaults to `3000` (or host-provided Cloud Run port). |
| `HOST` | IP string | Network interface binding. Defaults to `0.0.0.0`. |
| `FALLBACK_PORT` | Integer | Alternative port if primary `PORT` is occupied. |
| `RESEND_API_KEY` | Secret token | Enables automatic email dispatch via Resend. If missing, checks SendGrid/SMTP. If no email service is configured, users share links via clipboard. |
| `SENDGRID_API_KEY` | Secret token | Enables email dispatch via SendGrid if Resend is unset. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | SMTP Config | Enables custom SMTP mail dispatch if Resend/SendGrid are unset. |
| `EMAIL_FROM` | Email address | Sender address header (defaults to `Money Vault <invitations@moneyvault.app>`). |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Twilio credentials | Enables SMS dispatch. If unset, SMS dispatch is disabled and clipboard invite links are used. |
| `TRUST_PROXY_HOPS` | Integer (`0`–`5`) | Sets the number of reverse proxy hops trusted for client IP resolution (`app.set('trust proxy', hops)`). Defaults to `1` when `NODE_ENV === 'production'` and `0` otherwise. Any invalid value (negative, >5, or non-integer) logs a warning and falls back to default. |
| `TEST_HARNESS` | Boolean string (`true`/`false`) | Test environment flag only. Suppresses automatic background listener when running offline unit/integration test suites. |

---

### Configuring and Verifying Reverse Proxy Hops (`TRUST_PROXY_HOPS`)

Money Vault keys rate limit counters (for public research endpoints, AI chat, and group invitations) on client IP addresses.

- **Google Cloud Run / AWS ALB / Nginx (Single Proxy Layer)**:
  - Default: `TRUST_PROXY_HOPS=1` in production.
  - The proxy appends the true connecting IP to the end of `X-Forwarded-For`. Express with 1 hop reads the last entry added by the proxy and disregards client-injected spoofing headers.
- **Direct Internet Facing / Dev Servers (Zero Proxies)**:
  - Default: `TRUST_PROXY_HOPS=0` in non-production.
  - Express directly inspects `req.socket.remoteAddress` and completely ignores `X-Forwarded-For`.
- **Multi-layer CDNs (e.g. Cloudflare -> Cloud Run)**:
  - Set `TRUST_PROXY_HOPS=2` if requests pass through two trusted proxy hops before reaching Node.js.

#### How to Check the Right Value With Fake `X-Forwarded-For`:
To verify that your deployment is not vulnerable to client-side IP spoofing:
1. Issue a request containing a fake `X-Forwarded-For` address:
   ```bash
   curl -i -H "X-Forwarded-For: 203.0.113.195" https://your-domain.com/api/research/glossary
   ```
2. Repeat the request from the same client with a different fake IP:
   ```bash
   curl -i -H "X-Forwarded-For: 198.51.100.42" https://your-domain.com/api/research/glossary
   ```
3. Exceed the rate limit threshold (120 requests/min).
   - If `TRUST_PROXY_HOPS` is configured correctly for your proxy topology, the limiter will block the client on the 121st request despite changing fake IP headers.
   - If changing fake headers bypasses the rate limiter, your `TRUST_PROXY_HOPS` setting is trusting too many hops. Decrement it until client-injected headers are ignored.

---

## 2. Route Error Behavior When Configurations Are Missing

- **`POST /api/groups/:groupId/invitations`**, **`POST /api/groups/:groupId/invitations/:id/resend`**, **`POST /api/invitations/send-email`**, **`POST /api/invitations/send-sms`**:
  - If `APP_URL` is missing or set to `localhost` when `NODE_ENV === 'production'`:
    - Returns HTTP `503 SERVICE_UNAVAILABLE`
    - Response payload: `{"error": "SERVICE_UNAVAILABLE", "message": "Invitation service is temporarily unavailable in production. Please try again later."}`
    - Server logs a descriptive warning without exposing internal tokens.
- **`POST /api/gemini/chat`**, **`POST /api/ocr/receipt`**, **`POST /api/research/ask-mike`**:
  - If `GEMINI_API_KEY` is not set:
    - Returns HTTP `503 SERVICE_UNAVAILABLE`
    - Response payload: `{"error": "... service is currently configuring its API credentials. Please check back shortly."}`
- **`GET /api/fx/rates`**:
  - If external rates upstream providers fail and no cache exists:
    - Returns HTTP `503 UPSTREAM_UNAVAILABLE`
    - If prior cached rates exist, returns HTTP 200 with `stale: true` and 15-minute failure back-off.

---

## 3. How to Confirm Production Mode

1. **Verify Health Endpoint**:
   - Query `GET /api/health`.
   - Response must return `status: "ok"` and `service: "Money Vault API"`.
2. **Inspect HTML Source**:
   - Fetch the web root (`GET /`) in a browser or curl:
   - Ensure the HTML page source **does not** contain `/@vite/client` or `/@fs/`.
   - Production builds serve statically compiled assets located in `/assets/index-*.js` and `/assets/index-*.css`.

---

## 4. Firestore Security Rules Deployment & Automated CI

### Publishing Rules to Firebase
Deploy `firestore.rules` using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```
Or use the Firebase Console -> Firestore Database -> Rules tab to paste and publish `firestore.rules`.

### Running Rules Emulator Tests on GitHub Actions
The repository includes automated CI in `.github/workflows/main.yml`:
1. Navigates to **Actions** tab on GitHub -> select **Firestore rules tests** workflow.
2. Click **Run workflow** (or trigger on pull request modifying `firestore.rules` or `tests/rules.emulator.test.mjs`).
3. Executes:
   ```bash
   npx firebase emulators:exec --only firestore --project mv-rules-test "node tests/rules.emulator.test.mjs"
   ```
   (Requires Java 21+ and Node 22, configured automatically in the GitHub Actions runner).

---

## 5. Manual Release Verification Checklist

Perform these end-to-end checks before promoting a release to live users:

- [ ] **Authentication**: Sign in using Google OAuth popup; verify authenticated avatar and session state populate.
- [ ] **Mike Assistant**: Open AI Chat screen and ask a financial question (e.g. "What is my emergency fund target?"). Confirm grounded response without hallucinatory numbers.
- [ ] **Receipt OCR**: Upload or take a receipt photo in Add Expense modal. Confirm extracted vendor, date, category, and total amount.
- [ ] **Group Management**:
  - [ ] Create a shared Split Group.
  - [ ] Invite a second account by email; verify generated link structure (`/group-invite/<token>`).
  - [ ] Accept invitation from second account and join group.
  - [ ] Leave group from second account; verify member deletion occurs cleanly in Firestore without permission errors.
- [ ] **Data Export & Restoration**:
  - [ ] Export JSON Backup from Settings.
  - [ ] Delete or modify a test transaction, then restore from the JSON file. Confirm 100% data fidelity.
  - [ ] Export PDF report and verify summary figures match the dashboard.
- [ ] **Budget Overview**:
  - [ ] Verify category circular progress rings reflect spending vs monthly cap.
  - [ ] Verify "Your limits" vs "Guideline" labels.
  - [ ] Verify 99% cap logic when spent < cap.
- [ ] **Multi-Currency Display**:
  - [ ] In Settings, select secondary currencies (e.g. USD, EUR, KWD).
  - [ ] Verify Dashboard shows converted net worth estimates (`Net worth ≈ $... USD`).
  - [ ] Toggle Light and Dark themes to verify contrast and readability.

---

## 6. Known System Limitations

1. **In-Memory Volatility & Per-Instance State**:
   - The IP rate limit store (`rateLimitStore`) and foreign exchange cache (`fxRatesCache`) are maintained in server memory.
   - If running behind multiple horizontal Cloud Run instances, each instance maintains its own rate limit counter and FX cache.
2. **Fallback Provider Currency Availability**:
   - The primary exchange rate provider (`open.er-api.com`) supplies all 9 supported currencies (`USD`, `EUR`, `GBP`, `AED`, `SGD`, `CAD`, `AUD`, `SAR`, `KWD`).
   - If the primary provider fails, the European Central Bank fallback (`frankfurter.dev`) does not publish rates for `AED`, `SAR`, or `KWD`. For those currencies, the UI shows a graceful unavailable placeholder without disrupting the other currencies.
3. **Currency Conversion Isolation**:
   - Converted currency amounts are real-time visual estimates computed client-side. Foreign amounts and exchange rates are strictly never stored in Firestore transactions, backups, or group balances, preserving INR financial ledger purity.
