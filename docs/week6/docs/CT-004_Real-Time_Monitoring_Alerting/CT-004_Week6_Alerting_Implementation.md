

# CT-004 Week 6 – Alerting Implementation

## Project: Nutri-Help (Gopher Industries)
**Sprint:** Sprint 1 | **Week:** 6 | **Task:** CT-004 Real-Time Monitoring and Alerting  
**Date:** 2026-04-02 | **Updated:** 2026-04-03 | **Status:** ✅ COMPLETE

---

## 1. Overview

Week 6 implements the full two-tier alert pipeline defined in Week 5:

```
Tier 1 (Event Capture):          Tier 2 (Alert Evaluation):
─────────────────────────         ─────────────────────────────────────
Auth Request                      checkAlerts() runs every 60s (cron)
     ↓                                   ↓
loginController.js           →    loadAlertData()
authService.js               →    queries 8 Supabase tables
sessionLogService.js         →    evaluateA1() … evaluateA12()
tokenLogService.js           →    signalBook (correlated incidents)
integrityLogService.js       →    evaluateA8()
cryptoLogService.js          →         ↓
                                  sendAlert()
Supabase log tables:              console.log + Email + Slack webhook
  auth_logs                            ↓
  brute_force_logs             dispatch_results returned to caller
  error_logs
  session_logs       ←── now implemented (Week 6)
  token_logs         ←── now implemented (Week 6)
  integrity_logs     ←── now implemented (Week 6)
  monitoring_heartbeats ←── now implemented (Week 6)
  crypto_logs        ←── now implemented (Week 6)
```

---

## 2. Files Delivered (Week 6)

### New Backend Services

| File | Purpose | Alert |
|---|---|---|
| `services/sessionLogService.js` | Session event writer + geo metadata | A6 |
| `services/tokenLogService.js` | Token lifecycle event writer | A7 |
| `services/integrityLogService.js` | File hash scanner + tamper logger | A9 |
| `services/cryptoLogService.js` | Encryption/decryption event logger | A12 |

### Updated Backend Services

| File | Change |
|---|---|
| `services/securityAlertService.js` | Added monitoring heartbeat write + `persistAlertHistory()` + `archiveOldAlerts()` (90d retention) |
| `routes/loginDashboard.js` | Added `PATCH /alerts/:id/status`, `POST /alerts/archive`, filter support, body parser middleware |

### Frontend Components (New)

| File | Purpose |
|---|---|
| `src/routes/AlertDashboard/AlertDashboard.jsx` | Main dashboard with time-range & status filters, stat cards, live auto-refresh |
| `src/routes/AlertDashboard/AlertCard.jsx` | Alert card with expandable details, status badge, acknowledge/resolve actions |
| `src/routes/AlertDashboard/AlertSummary.jsx` | 24h alert summary by type with bar charts |
| `src/routes/AlertDashboard/AlertDashboard.css` | Dashboard styling with dark mode support |
| `src/routes/AlertDashboard/AlertCard.css` | Card styling + action button styles + fixed detail code overlay |

### Database Schema

| File | Purpose |
|---|---|
| `scripts/create_alert_history.sql` | Persistence table: `alert_history` with status, resolved_at, indexes |

### Infrastructure

| File | Purpose |
|---|---|
| `scripts/alertCheckerCron.js` | Standalone cron runner + Express integration helpers |

### Tests

| File | Coverage |
|---|---|
| `test/securityAlertsA3A8A9A10.test.js` | 17 Jest tests — A3, A8, A9, A10 |

---

## 3. Setup Instructions

### 3.1 Environment Variables (`.env`)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Alerts (Nodemailer — use Gmail or SMTP)
ALERT_EMAIL_FROM=noreply@nutrihelp.dev
ALERT_EMAIL_TO=security@example.com,lead@example.com
GMAIL_USER=your-alert-sender@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# Or SMTP:
# SMTP_HOST=smtp.mailgun.org
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=postmaster@yourdomain.com
# SMTP_PASS=your-smtp-password

# Slack Alerts (Incoming Webhooks)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Alert checker interval (default 60s)
ALERT_CHECK_INTERVAL_MS=60000
ALERT_CHECK_ENABLED=true

# Integrity scanner host label
HOST_ID=api-server-1
```

### 3.2 Supabase Schema (run once)

```sql
-- Session events (A6)
CREATE TABLE IF NOT EXISTS session_logs (
  id                BIGSERIAL PRIMARY KEY,
  session_id        TEXT,
  user_id           TEXT,
  ip_address        TEXT,
  country           TEXT,
  region            TEXT,
  user_agent        TEXT,
  impossible_travel BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_logs_user_created
  ON session_logs(user_id, created_at DESC);

-- Token lifecycle events (A7)
CREATE TABLE IF NOT EXISTS token_logs (
  id             BIGSERIAL PRIMARY KEY,
  principal_id   TEXT NOT NULL,
  token_type     TEXT,
  event_type     TEXT NOT NULL,
  ip_address     TEXT,
  user_agent     TEXT,
  device_id      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_token_logs_principal_created
  ON token_logs(principal_id, created_at DESC);

-- File integrity scan results (A9)
CREATE TABLE IF NOT EXISTS integrity_logs (
  id                    BIGSERIAL PRIMARY KEY,
  scan_id               TEXT,
  host_id               TEXT,
  file_path             TEXT,
  baseline_hash         TEXT,
  observed_hash         TEXT,
  hash_mismatch         BOOLEAN DEFAULT false,
  missing_file          BOOLEAN DEFAULT false,
  tamper_type           TEXT,
  last_known_good_build TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_integrity_logs_created
  ON integrity_logs(created_at DESC);

-- Monitoring pipeline heartbeats (A10)
CREATE TABLE IF NOT EXISTS monitoring_heartbeats (
  id             BIGSERIAL PRIMARY KEY,
  component_name TEXT,
  status         TEXT,
  message        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_heartbeats_created
  ON monitoring_heartbeats(created_at DESC);

-- Crypto operation events (A12)
CREATE TABLE IF NOT EXISTS crypto_logs (
  id               BIGSERIAL PRIMARY KEY,
  crypto_operation TEXT NOT NULL,
  event_type       TEXT NOT NULL,
  key_identifier   TEXT,
  key_version      TEXT,
  endpoint         TEXT,
  source_ip        TEXT,
  failure_reason   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crypto_logs_created
  ON crypto_logs(created_at DESC);
```

---

## 4. Enabling the Alert Checker

### Option A: Standalone Cron (recommended for production)

```javascript
// In server.js — add before app.listen():
require('./scripts/alertCheckerCron').start();
```

This starts `checkAlerts()` immediately and then every `ALERT_CHECK_INTERVAL_MS` milliseconds.

### Option B: Per-Request Middleware (throttled)

```javascript
const { createAlertCheckerMiddleware } = require('./services/securityAlertService');
// Runs at most once per 60s, triggered by any incoming request
app.use(createAlertCheckerMiddleware({ intervalMs: 60000 }));
```

### Option C: Manual REST Endpoint (admin-gated)

```javascript
const { checkAlerts } = require('./services/securityAlertService');

app.post('/admin/security/check-alerts', authenticateAdmin, async (req, res) => {
  const result = await checkAlerts({ send: true, source: 'manual' });
  res.json(result);
});
```

---

## 5. Integrating Log Writers in Existing Controllers

### loginController.js — session and token logging

```javascript
const { sessionHookOnLoginSuccess } = require('../services/sessionLogService');
const { tokenHookOnIssue, tokenHookOnRevoke, TOKEN_TYPES } = require('../services/tokenLogService');

// Inside the login success block (after jwt.sign):
await sessionHookOnLoginSuccess(req, user);
await tokenHookOnIssue(req, user.user_id, TOKEN_TYPES.ACCESS);

// On logout / forced invalidation:
await tokenHookOnRevoke(req, user.user_id, TOKEN_TYPES.ACCESS);
```

### Crypto operations — wrap with cryptoLogService

```javascript
const { withCryptoLogging, CRYPTO_OPERATIONS } = require('../services/cryptoLogService');

// Replace direct decrypt call:
const plaintext = await withCryptoLogging(
  {
    operation: CRYPTO_OPERATIONS.DECRYPT,
    keyIdentifier: 'data-key-v1',
    endpoint: req.originalUrl,
    sourceIp: req.ip
  },
  () => myDecryptFn(ciphertext)
);
```

### Integrity scanner — add to server startup

```javascript
const { scheduleIntegrityScan, generateBaselineFile } = require('./services/integrityLogService');
const path = require('path');

const MONITORED_FILES = [
  path.join(__dirname, 'server.js'),
  path.join(__dirname, 'middleware/authenticate.js'),
  path.join(__dirname, 'services/authService.js'),
  path.join(__dirname, 'controller/loginController.js')
];
const BASELINE_PATH = path.join(__dirname, 'security/integrity_baseline.json');

// Generate baseline once (run manually before first deploy):
// generateBaselineFile(MONITORED_FILES, BASELINE_PATH);

// Then schedule ongoing scans (every 6 hours):
scheduleIntegrityScan({ baselineFilePath: BASELINE_PATH, intervalMs: 6 * 60 * 60 * 1000 });
```

---

## 6. Alert Threshold Configuration

All thresholds are defined in `services/securityAlertService.js`. Key constants:

| Constant | Default | Purpose |
|---|---|---|
| `ALERT_DEDUP_WINDOW_MS` | `5 * 60 * 1000` (5 min) | Minimum time between repeated identical alerts |
| `HEARTBEAT_WINDOW_MS` | `5 * 60 * 1000` (5 min) | Pipeline blind spot detection window |

Per-alert thresholds (from CT-004_Proposed_Alert_Conditions.md):

| Alert | Threshold | Window |
|---|---|---|
| A1 | 10+ failed logins, same account | 10 min |
| A2 | 20+ failed logins from 1 IP, 3+ accounts | 10 min |
| A3 | Success after 5+ failures, same account | 5 min |
| A4 | 5+ MFA failures, same account | 10 min |
| A5 | 30+ HTTP 429 from 1 IP on sensitive endpoints | 15 min |
| A6 | 2+ concurrent sessions with geo/location conflict | 30 min |
| A7 | 8+ token events OR 3+ revoke-reissue loops | 10 min |
| A8 | 3+ high-risk signals (A1/A2/A3/A5/A6/A7/A11) same principal/IP | 10 min |
| A9 | Any hash_mismatch or missing_file in integrity_logs | Immediate |
| A10 | No heartbeat in monitoring_heartbeats for >5 min | 5 min |
| A11 | Critical error on auth/security routes; escalates at 3+ | 10 min |
| A12 | 10+ decrypt failures OR ≥30% decrypt failure rate | 15 min |

### 6.1 How to Trigger Each Alert (A1-A12)

Use this section for repeatable validation in local/staging environments.

1. A1 - Brute force by account
  - Trigger: Perform 10 or more failed login attempts for one account within 10 minutes.
  - Quick method: Send repeated bad credentials to the login endpoint for the same email.

2. A2 - Brute force by source IP across accounts
  - Trigger: From one IP, generate 20 or more failed logins across 3 or more accounts in 10 minutes.
  - Quick method: Script failed logins from one host against multiple emails.

3. A3 - Success after failure burst
  - Trigger: For one account, generate 5 or more failures in 5 minutes, then one successful login.
  - Quick method: 5 failed attempts followed by one valid credential login.

4. A4 - MFA failures
  - Trigger: Record 5 or more MFA failures for one account inside 10 minutes.
  - Notes: Requires MFA failure logging into auth logs.

5. A5 - Rate-limit abuse
  - Trigger: Generate 30 or more HTTP 429 responses from one IP on sensitive endpoints in 15 minutes.
  - Quick method: Repeatedly hit protected endpoints until rate limiter responds 429.

6. A6 - Geo-impossible sessions
  - Trigger: Create concurrent sessions for the same user with conflicting geo/location markers inside 30 minutes.
  - Quick method: Simulate two session records with different country/region for same user_id.

7. A7 - Token lifecycle anomaly
  - Trigger option A: 8 or more token events in 10 minutes for one principal.
  - Trigger option B: 3 or more revoke and reissue loops in 10 minutes.
  - Quick method: Issue/revoke access tokens rapidly for the same principal_id.

8. A8 - Correlated incident
  - Trigger: Generate at least 3 distinct high-risk signals among A1, A2, A3, A5, A6, A7, A11 for same principal or IP within 10 minutes.
  - Quick method: Trigger A1 + A3 + A7 against same account fingerprint.

9. A9 - Integrity tamper
  - Trigger option A: Write integrity log row with hash_mismatch = true.
  - Trigger option B: Write integrity log row with missing_file = true.
  - Quick method: Modify monitored file or inject mismatch row in integrity_logs.

10. A10 - Monitoring pipeline failure
  - Trigger: Ensure no recent heartbeat in monitoring_heartbeats for over 5 minutes.
  - Quick method: Stop alert checker job or clear heartbeats and wait past threshold.

11. A11 - Security-route critical errors
  - Trigger: Produce critical error logs on auth/security routes, escalates on 3 or more in 10 minutes.
  - Quick method: Force repeated server errors on login/auth endpoints.

12. A12 - Crypto anomaly
  - Trigger option A: 10 or more decrypt failures in 15 minutes.
  - Trigger option B: Decrypt failure rate of 30 percent or higher in 15 minutes.
  - Quick method: Send malformed ciphertext repeatedly through decrypt path.

Recommended validation sequence:

1. Trigger alert condition.
2. Wait for next checker run (default 60s).
3. Confirm alert appears in dashboard with status Open.
4. Confirm row written to alert_history.
5. Acknowledge then resolve in UI and confirm status/resolved_at persisted.

---

## 7. Full Response Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NUTRI-HELP ALERT PIPELINE                        │
│                                                                     │
│  TIER 1: EVENT CAPTURE                                              │
│  ─────────────────────────────────────────────────                  │
│  Login attempt → loginController.js                                 │
│       │                                                             │
│       ├─ Failed → brute_force_logs (INSERT)                         │
│       ├─ Success → auth_logs (INSERT) + session_logs (INSERT)       │
│       └─ Token issued → token_logs (INSERT)                         │
│                                                                     │
│  Crypto op → cryptoLogService.js → crypto_logs (INSERT)            │
│  File scan → integrityLogService.js → integrity_logs (INSERT)       │
│                                                                     │
│  TIER 2: ALERT EVALUATION (every 60s)                               │
│  ─────────────────────────────────────────────────                  │
│  alertCheckerCron.js                                                │
│       │                                                             │
│       └─► securityAlertService.checkAlerts()                        │
│               │                                                     │
│               ├─ loadAlertData() ─► Supabase (8 tables, 30min)      │
│               │                                                     │
│               ├─ evaluateA1()  brute_force_logs ≥10 failures/acct   │
│               ├─ evaluateA2()  brute_force_logs ≥20 from 1 IP       │
│               ├─ evaluateA3()  success after ≥5 failures (CRIT)     │
│               ├─ evaluateA4()  auth_logs MFA failures               │
│               ├─ evaluateA5()  auth_logs 429 rate-limit abuse       │
│               ├─ evaluateA6()  session_logs geo-conflict            │
│               ├─ evaluateA7()  token_logs lifecycle anomaly         │
│               ├─ evaluateA9()  integrity_logs tamper (CRIT)         │
│               ├─ evaluateA10() monitoring_heartbeats absent (HIGH)  │
│               ├─ evaluateA11() error_logs critical security route   │
│               ├─ evaluateA12() crypto_logs decrypt anomaly          │
│               └─ evaluateA8()  signalBook correlation (CRIT)        │
│                                                                     │
│               ↓ for each alert:                                     │
│               sendAlert()                                           │
│               │                                                     │
│               ├─ console.log (always)                               │
│               ├─ sendEmailNotification() ─► nodemailer              │
│               └─ sendSlackNotification() ─► webhook POST            │
│                                                                     │
│               ↓                                                     │
│               monitoring_heartbeats (INSERT heartbeat)              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Test Evidence Summary

**Test file:** `test/securityAlertsA3A8A9A10.test.js`  
**Framework:** Jest with Supabase mocked via `jest.mock('@supabase/supabase-js')`  
**Run:** `npx jest test/securityAlertsA3A8A9A10.test.js --no-coverage`

### Results (2026-04-02)

```
Tests:  17 passed, 17 total
Suites: 1 passed, 1 total
Time:   ~3s
```

### Test Coverage by Alert

| Group | Tests | Pass | Notes |
|---|---|---|---|
| A3 – Success After Failure Burst | 4 | ✅ 4 | Trigger, 2× no-trigger, full flow |
| A8 – Correlated Incident | 3 | ✅ 3 | Trigger, no-trigger, payload shape |
| A9 – Integrity Tamper | 4 | ✅ 4 | hash_mismatch, missing_file, no-trigger, full flow |
| A10 – Pipeline Failure | 4 | ✅ 4 | Trigger, no-trigger, payload fields, full flow |
| Return Shape | 2 | ✅ 2 | Top-level keys, per-alert required fields |

### Key Assertions Per Alert

**A3 Trigger test confirms:**
- `alert_id === 'A3'`
- `severity === 'Critical'`
- `payload.preceding_failed_count >= 5`
- `payload.account_identifier` set correctly

**A8 Trigger test confirms:**
- 3+ distinct contributing alert IDs in `payload.contributing_alerts`
- `payload.correlation_confidence > 0`
- `payload.incident_fingerprint` is defined

**A9 Trigger tests confirm:**
- `tamper_type === 'hash_mismatch'` (hash mismatch case)
- `tamper_type === 'missing_file'` (missing file case)
- `payload.file_path`, `baseline_hash`, `observed_hash` all populated

**A10 Trigger tests confirm:**
- `payload.failing_component === 'monitoring_heartbeats'`
- `triage_sla_minutes === 60` (High severity SLA)
- `notification_channels` includes `'email'`

**Full flow tests confirm:**
- When `send: true`, `dispatch_results` contains an entry for the alert with `sent: true`

---

---

## 9. Security Alert Dashboard (New)

### 9.1 Frontend Architecture

**Location:** `Nutrihelp-web/src/routes/AlertDashboard/`

**Components:**

1. **AlertDashboard.jsx** — Main container
   - Manages state: `timeRange`, `statusFilter`, `autoRefresh`, `alerts`, `summary`
   - Fetches from `/api/login-dashboard/alerts` + `/alerts/summary`
   - Time range filter: Today | 7 Days | 30 Days | All Time
   - Status filter: All | Open (●) | Acknowledged (◐) | Resolved (✓)
   - Auto-refresh every 30s (toggle)
   - 4 stat cards: Total | Open | Critical | Acknowledged
   - Live badge with pulse animation

2. **AlertCard.jsx** — Individual alert row
   - Expandable alert details (click to expand)
   - Severity badge (Critical | High | Medium | Low)
   - Status badge (● Open | ◐ Acknowledged | ✓ Resolved)
   - Action buttons when expanded (in history mode with alert.id):
     - Open state: Acknowledge + Resolve
     - Acknowledged state: Resolve + Reopen
     - Resolved state: Reopen
   - Buttons call `handleStatusChange(id, status)` → PATCH endpoint
   - Optimistic local state update

3. **AlertSummary.jsx** — 24h rollup sidebar
   - Groups alerts by `alert_type`
   - Bar chart per alert type
   - Color-coded by alert (A1, A2, ... A12)
   - Severity legend

**Dark Mode:** Full dark-mode support via CSS variables + `useDarkMode` context

### 9.2 Alert Details Overlay (Fixed Issue)

**Problem (from user):** Alert card details were hard to read with gray background on gray card.

**Solution:** `.detail-code` now uses dark editor theme:
- Background: `#0f172a` (dark navy)
- Text: `#7dd3fc` (cyan monospace)
- Max-height: 240px with auto-scroll
- Context JSONB displayed with proper formatting

**Screenshot placeholder:**
```
[ INSERT: AlertCard detail overlay with expanded A1 alert ]
[ Image should show: context JSON, fingerprint, created_at, acknowledge button ]
```

### 9.3 Dashboard Screenshots (Placeholders)

```
[ INSERT: Main dashboard view ]
[ Image should show: header, stat cards, time-range buttons, status filters, alert list ]

[ INSERT: Dark mode dashboard ]
[ Image should show: same layout in dark theme ]

[ INSERT: Alert acknowledged workflow ]
[ Image should show: alert card with status changed to "◐ Acknowledged", opacity reduced ]

[ INSERT: Alert resolved workflow ]
[ Image should show: alert card with status changed to "✓ Resolved", opacity at 65%, resolved_at timestamp visible ]

[ INSERT: Time range filter in action ]
[ Image should show: clicking "7 Days" to filter alerts from past week only ]

[ INSERT: Status filter in action ]
[ Image should show: clicking "Open" to show only unresolved alerts ]
```

---

## 10. Alert Persistence & Retention Policy (New)

### 10.1 Persistence Implementation

**File:** `services/securityAlertService.js`  
**Function:** `persistAlertHistory(alert, dispatchResult, options)`

**Flow:**
1. When `checkAlerts({ send: true })` dispatches an alert via `sendAlert()`
2. Immediately calls `persistAlertHistory()` with alert data
3. Writes single row to `alert_history` Supabase table:
   ```
   {
     alert_type: "A1",
     severity: "high",
     message: "10 or more failed login attempts...",
     context: { source_ips, failed_count, account_identifier, ... },
     count: 1,
     fingerprint: "pranadot@outlook.com",
     source: "check-alerts",
     status: "open",
     notification_sent: true,
     notification_deduped: false,
     notification_channels: [ { channel: "email", attempted: true, ... } ],
     resolved_at: null,
     created_at: NOW()
   }
   ```
4. Non-blocking: errors (table missing, permission denied) are logged but don't crash
5. If `alert_history` table doesn't exist, logs warning once and skips

**Result:** Resolved alerts stay in history and can be acknowledged/resolved via dashboard.

### 10.2 Retention Policy (90 Days)

**File:** `services/securityAlertService.js`  
**Function:** `archiveOldAlerts()`

**Auto-cleanup:**
- Runs at most **twice per day** (throttle: 12 hours minimum between runs)
- Deletes rows from `alert_history` where `created_at < NOW() - 90 days`
- Non-blocking: logs completion or errors without affecting alert pipeline
- Algorithm: Supabase `.delete().lt('created_at', cutoff).select('id')`

**Manual trigger endpoint:**
```
POST /api/login-dashboard/alerts/archive
Content-Type: application/json

{ "days": 90 }  // optional, defaults to 90

Response:
{
  "ok": true,
  "deleted": 1247,
  "cutoff": "2026-01-03T11:02:45Z",
  "days_kept": 90
}
```

**Integration:** Auto-cleanup runs silently on each `checkAlerts()` cycle.

---

## 11. Alert Status Workflow (New)

### 11.1 API Endpoint

**PATCH /api/login-dashboard/alerts/:id/status**

**Request:**
```
Content-Type: application/json

{ "status": "acknowledged" | "resolved" | "open" }
```

**Response (200):**
```json
{
  "ok": true,
  "alert": {
    "id": 1,
    "alert_type": "A1",
    "status": "acknowledged",
    "resolved_at": null,
    ...
  }
}
```

**Response (400):** Invalid ID or status
```json
{ "error": "status must be one of: open, acknowledged, resolved" }
```

**Response (404):** Alert not found
```json
{ "error": "Alert not found" }
```

**Business Logic:**
- Valid statuses: `"open"`, `"acknowledged"`, `"resolved"`
- When status = `"resolved"`: set `resolved_at = NOW()`
- When status = `"open"`: set `resolved_at = NULL`
- When status = `"acknowledged"`: leave `resolved_at` unchanged

### 11.2 Frontend Action Flow

**User clicks "Acknowledge" in AlertCard:**
1. `handleStatusAction(e, "acknowledged")` → stops click propagation
2. `handleStatusChange(alert.id, "acknowledged")` → PATCH request
3. On success: Supabase updates row
4. Optimistic UI update: `setAlerts(prev => prev.map(a => a.id === id ? {...a, status: "acknowledged"} : a))`
5. Card opacity reduces to 0.9
6. Button set changes to [Resolve, Reopen]

**User clicks "Resolve" in acknowledged alert:**
1. Same flow, status="resolved"
2. Card opacity reduces to 0.65
3. `resolved_at` timestamp appears in expanded details
4. Button set changes to [Reopen]

**User clicks "Reopen" in resolved alert:**
1. Status changed back to "open"
2. Opacity restored to 1
3. `resolved_at` cleared
4. Button set resets to [Acknowledge, Resolve]

**Screenshot placeholders:**
```
[ INSERT: Before action — A1 alert with status "● Open" ]
[ Image shows: default opacity, [Acknowledge] [Resolve] buttons ]

[ INSERT: After acknowledge — same alert with status "◐ Acknowledged" ]
[ Image shows: reduced opacity 0.9, [Resolve] [Reopen] buttons ]

[ INSERT: After resolve — same alert with status "✓ Resolved" ]
[ Image shows: opacity 0.65, resolved_at: 2026-04-03 11:15:23, [Reopen] button ]
```

---

## 12. Complete Reproduction Guide

### Step 1: Clone or Update Codebase

```bash
cd ~/Desktop/CyberSemesterFiles/CyberTeam
# Assuming code is already checked out
```

### Step 2: Install Dependencies

**Backend:**
```bash
cd Nutrihelp-api
npm install
```

**Frontend:**
```bash
cd ../Nutrihelp-web
npm install
```

### Step 3: Configure Environment Variables

**Backend (.env):**
```bash
cd ../Nutrihelp-api
cat > .env << 'EOF'
SUPABASE_URL=https://mdauzoueyzgtqsojttkp.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ALERT_EMAIL_FROM=noreply@nutrihelp.dev
ALERT_EMAIL_TO=security@example.com
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_CHECK_INTERVAL_MS=60000
ALERT_CHECK_ENABLED=true
HOST_ID=api-server-1
EOF
```

**Frontend (.env):**
```bash
cd ../Nutrihelp-web
cat > .env << 'EOF'
REACT_APP_API_BASE_URL=https://localhost:443/api
REACT_APP_FRONTEND_URL=http://localhost:3000
EOF
```

### Step 4: Create Supabase Tables

1. Go to https://app.supabase.com → project `mdauzoueyzgtqsojttkp` → **SQL Editor**
2. Run each script:
   - `Nutrihelp-api/scripts/create_alert_history.sql`
   - (Session, token, integrity, heartbeat, crypto tables already exist from Week 5)

### Step 5: Start Backend Server

```bash
cd Nutrihelp-api
npm start
```

**Expected output:**
```
🟢 Loaded AuthService from: ...
[alertCheckerCron] Starting — checking every 60s
🎉 NutriHelp API launched successfully!
🔒 HTTPS server running on port 443 (TLS 1.3 enforced)
🔁 HTTP redirect server running on port 8081
```

### Step 6: Start Frontend Server

**In a new terminal:**
```bash
cd Nutrihelp-web
npm start
```

**Browser will auto-open to:** `http://localhost:3000`

### Step 7: Access Security Alerts Dashboard

1. Navigate to **Main Navbar** → **🛡️ Security Alerts**
2. Dashboard loads with time-range selector (Today, 7d, 30d, All Time)
3. Status filter buttons (All, Open, Ack, Resolved)
4. Live badge shows "Live" with pulsing dot
5. Auto-refreshes every 30s

### Step 8: Trigger an Alert (A1 Brute Force)

```bash
# In another terminal, trigger 10 failed logins for same account
for i in {1..10}; do
  curl -k -X POST https://localhost:443/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  sleep 0.5
done

# Then 1 success
curl -k -X POST https://localhost:443/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"correct-password"}'
```

**Result:** 
- Within 60 seconds, A1 alert appears in dashboard
- Status = "● Open"
- Can click "Acknowledge" button
- Card dims, status changes to "◐ Acknowledged"
- Click "Resolve" → resolves, status = "✓ Resolved", opacity 0.65

### Step 9: Test Alert Persistence

**Check alert was saved:**
```bash
node -e "const sup = require('@supabase/supabase-js'); 
const client = sup.createClient(
  'https://mdauzoueyzgtqsojttkp.supabase.co',
  'your-service-role-key'
);
(async () => {
  const {data} = await client.from('alert_history').select('*').limit(1);
  console.log(JSON.stringify(data, null, 2));
})();"
```

**Expected:** Alert row appears in `alert_history` with `status: \"acknowledged\"` or `\"resolved\"`

### Step 10: Run Jest Tests

```bash
cd Nutrihelp-api
npx jest test/securityAlertsA3A8A9A10.test.js --no-coverage
```

**Expected output:**
```
 Tests:       17 passed, 17 total
 Suites:      1 passed, 1 total
 Time:        ~2.8s
```

### Step 11: Test Archive Endpoint

```bash
node -e "const https=require('https');
const body=JSON.stringify({days:90});
const req=https.request({
  hostname:'localhost',port:443,
  path:'/api/login-dashboard/alerts/archive',
  method:'POST',
  headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)},
  rejectUnauthorized:false
},(r)=>{
  let d='';r.on('data',c=>d+=c);
  r.on('end',()=>console.log(JSON.parse(d)));
});
req.write(body);req.end();"
```

**Expected response:**
```json
{ "ok": true, "deleted": 0, "cutoff": "2026-01-03T...", "days_kept": 90 }
```

---

## 13. Deployment Checklist

- [ ] All `.env` variables configured (Supabase keys, email, Slack)
- [ ] Supabase tables created (all 6 from Section 3.2)
- [ ] Backend starts without errors: `npm start` in Nutrihelp-api
- [ ] Frontend builds without errors: `npm start` in Nutrihelp-web
- [ ] Dashboard accessible at http://localhost:3000 → **Security Alerts**
- [ ] At least 1 A1 alert triggered and visible in dashboard
- [ ] Alert acknowledged/resolved and status updated in Supabase
- [ ] All 17 Jest tests pass: `npx jest test/securityAlertsA3A8A9A10.test.js`
- [ ] Email alerts working (check Gmail or SMTP inbox)
- [ ] Slack alerts working (verify webhook URL) *(optional)*
- [ ] Archive endpoint returns success: `POST /alerts/archive`
- [ ] Dark mode toggle works in dashboard *(optional)*
- [ ] Auto-refresh toggle works: disables 30s refresh when unchecked *(optional)*

---

## 14. Known Limitations & Future Work

| Item | Status | Notes |
|---|---|---|
| A4 MFA failure detection | Not triggered | Requires MFA endpoint implementation |
| A5 Rate-limit abuse (HTTP 429) | Not triggered | Requires rate-limit escalation logging |
| A6 Geo-impossible travel | Limited | Needs IP geo-resolution (MaxMind GeoLite2) |
| A11 Critical error routing | Implemented | Works for tracked routes; add more as needed |
| Slack integration | Opt-in | Requires SLACK_WEBHOOK_URL in .env |
| Email alerts | Configured | Uses nodemailer; test with SMTP or Gmail |
| Alert rule engine tuning | Manual | Thresholds in `securityAlertService.js` can be adjusted |

---

## 15. Remaining Week 6 / Week 7 Items

| Item | Status | Notes |
|---|---|---|
| Connect Slack webhook URL | Optional | Set `SLACK_WEBHOOK_URL` in `.env` and test live |
| Connect email sender | Optional | Configure SMTP or Gmail app-password |
| Baseline file for integrity scanner | Pending | Run `generateBaselineFile()` pre-deploy |
| Add A6-specific geo-resolution middleware | Pending | Map IP → country/region (e.g., MaxMind GeoLite2) |
| Add more test suites (A1, A2, A4, A5, A6, A7, A11, A12) | Pending | Jest coverage expansion |
| API gateway or log aggregation | Pending | Optional: centralized alert webhooks |
| Long-term alert archive (cold storage) | Pending | Optional: move 90d+ alerts to S3 or backup DB |
