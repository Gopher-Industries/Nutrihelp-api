# Week 5 Monitoring Architecture & Audit

## Two-Tier System: Log Collection vs. Alert Evaluation

### Tier 1: Event Capture (Log Collection)
- Real-time events from API endpoints are written directly to Supabase security tables
- Each event type (login, token, error, session, etc.) generates a log entry as it occurs
- These tables act as the source of truth for all alert evaluations

### Tier 2: Alert Evaluation & Notification
- The `securityAlertService.js` queries the security log tables at regular intervals
- Evaluates conditions A1–A12 against recent log data
- Sends Slack/email alerts when thresholds are met
- Deduplicates alerts by fingerprint to avoid alert fatigue

### Data Flow

```
Auth Request
    ↓
loginController / authService (write auth_logs)
    ↓
Supabase: auth_logs table
    ↓
securityAlertService.checkAlerts() (queries)
    ↓
A1–A12 evaluation logic
    ↓
sendAlert() → Slack + Email
```

---

## Log-Writer Audit Results (Week 5)

### ✅ **Already Implemented**

| Log Table | Written By | File | Purpose |
|---|---|---|---|
| `brute_force_logs` | loginController.js | controller/loginController.js | Track failed login attempts per account/IP |
| `auth_logs` | authService.js, authController.js | services/authService.js, controller/authController.js | Track auth events (success, MFA, token claims) |
| `error_logs` | errorLogService.js | services/errorLogService.js | Centralized error logging with categorization |
| `upload_logs` | uploadController.js | controller/uploadController.js | File upload audit trail |
| `rbac_violation_logs` | authorizeRoles.js | middleware/authorizeRoles.js | RBAC policy violation tracking |

### ❌ **Missing – Required for Full A1–A12 Support**

| Log Table | Needed By Alerts | Purpose | Priority |
|---|---|---|---|
| `session_logs` | A6 (geo-impossible sessions) | Track active sessions with geo metadata | High |
| `token_logs` | A7 (token lifecycle anomaly) | Track token refresh, reissue, revoke events | High |
| `integrity_logs` | A9 (file integrity tamper) | Record file hash mismatches, missing files | High |
| `monitoring_heartbeats` | A10 (pipeline failure) | Heartbeat from alert checker / log ingestion | High |
| `crypto_logs` | A12 (crypto anomaly) | Decrypt failure tracking with key info | Medium |

---

## Week 6 Integration Checklist

### For Full A1–A12 Support:

1. **Create missing log-writers** in backend services/controllers for the 5 tables above
2. **Integrate `securityAlertService.checkAlerts()` into the API**:
   - Option A: Add as middleware with configurable interval (e.g., every 60s)
   - Option B: Schedule as a cron job (e.g., Node schedule or Agenda)
   - Option C: Expose as an API endpoint for manual/periodic triggers
3. **Configure alert notifications**:
   - Set up `.env` variables: `SLACK_WEBHOOK_URL`, `SMTP_HOST`, `ALERT_EMAIL_TO`, etc.
   - Test email/Slack integration end-to-end
4. **Validate Supabase schema**:
   - Ensure all 8 log tables exist with expected columns
   - Create indexes on `created_at`, `user_id`, `ip_address` for query performance
5. **Document on-call response runbooks** for each alert type (tie to Alert Response Matrix)

---

## Integration Example (Week 6)

```javascript
// In your Express server.js or cron job:
const { checkAlerts, createAlertCheckerMiddleware } = require('./services/securityAlertService');

// Option 1: Middleware-based checker (runs every 60s on any request)
app.use(createAlertCheckerMiddleware({ intervalMs: 60000 }));

// Option 2: Scheduled job (e.g., with node-schedule)
const schedule = require('node-schedule');
schedule.scheduleJob('*/1 * * * *', async () => {
  const result = await checkAlerts();
  console.log(`[Cron] Alert check completed:`, result.total_alerts, 'alerts generated');
});

// Option 3: Manual API endpoint
app.post('/admin/security/check-alerts', authenticateAdmin, async (req, res) => {
  const result = await checkAlerts();
  res.json(result);
});
```

---

## Environment Configuration (.env)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Email Alerts (Nodemailer)
ALERT_EMAIL_FROM=noreply@nutrihelp.dev
ALERT_EMAIL_TO=security-team@example.com,lead@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Slack Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

## Files Included in Week 5 Package

- **Docs:**
  - `docs/CT-004_Real-Time_Monitoring_Alerting/CT-004_Proposed_Alert_Conditions.md` — All 12 alert definitions with exact triggers
  - `docs/CT-004_Real-Time_Monitoring_Alerting/Alert_Response_Matrix.md` — Severity, SLAs, response actions
  - `docs/CT-004_Real-Time_Monitoring_Alerting/CT-004_Lead_Review_Notes.md` — Team approvals
  
- **Implementation:**
  - `../Nutrihelp-api/services/securityAlertService.js` — A1–A12 evaluators + Slack/email dispatch

---

## Status: Week 5 Complete ✅

Alert definitions, response actions, and alert evaluation service are finalized.  
Next step (Week 6): Implement missing log-writers and schedule alert checks.
