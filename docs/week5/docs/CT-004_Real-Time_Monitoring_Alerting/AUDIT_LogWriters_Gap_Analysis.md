# Log-Writer Audit & Gap Analysis (Week 5)

**Date:** 2026-04-02  
**Scope:** Backend Nutrihelp-api codebase  
**Context:** Supporting CT-004 Real-Time Monitoring and Alert system

---

## Executive Summary

### Status:
- ✅ **5 out of 8** required security log tables have active writers
- ❌ **3 critical + 2 medium-priority** log tables are missing writers

### Impact:
- Alerts A1, A2, A3, A4, A5, A11 are **fully functional** (use existing logs)
- Alerts A6, A7, A9, A10, A12 are **degraded** (missing log sources)

---

## Detailed Audit

### ✅ IMPLEMENTED

#### 1. `brute_force_logs`
- **Writer:** [controller/loginController.js](../../Nutrihelp-api/controller/loginController.js)
- **Trigger:** Failed login attempt or successful login
- **Write Points:**
  - Line 41: Count failed attempts per 10 minutes
  - Line 60, 75, 93: Insert failed login record
  - Line 99: Clear failures on success
- **Status:** Production-ready
- **Alerts Using:** A1, A2, A3

#### 2. `auth_logs`
- **Writer:** 
  - [services/authService.js](../../Nutrihelp-api/services/authService.js)
  - [controller/authController.js](../../Nutrihelp-api/controller/authController.js)
- **Trigger:** Login success, MFA verification, signup, password reset
- **Write Points:**
  - authService.js line 310–311: Auth success
  - authController.js line 202: Auth event
- **Status:** Production-ready
- **Alerts Using:** A1, A2, A3, A4, A5

#### 3. `error_logs`
- **Writer:** [services/errorLogService.js](../../Nutrihelp-api/services/errorLogService.js)
- **Trigger:** Error categorized as "critical", "warning", "info", or "minor"
- **Write Points:**
  - Line 170–171: Insert to `error_logs` with category tag
- **Status:** Production-ready
- **Alerts Using:** A5, A11

#### 4. `upload_logs`
- **Writer:** [controller/uploadController.js](../../Nutrihelp-api/controller/uploadController.js)
- **Trigger:** File upload or deletion
- **Write Points:**
  - Line 66: Log upload event
- **Status:** Production-ready
- **Alerts Using:** None (future use)

#### 5. `rbac_violation_logs`
- **Writer:** [middleware/authorizeRoles.js](../../Nutrihelp-api/middleware/authorizeRoles.js)
- **Trigger:** Role-based access control violation
- **Write Points:**
  - Line 52: Log RBAC violation
- **Status:** Production-ready
- **Alerts Using:** None (future use)

---

### ❌ MISSING

#### 6. `session_logs` — **HIGH PRIORITY**
- **Required By:** Alert A6 (Geo-Impossible Concurrent Sessions)
- **Data Needed:**
  - `session_id` (unique session identifier)
  - `user_id` or `account_identifier`
  - `ip_address`
  - `country` / `region` (geolocation from IP)
  - `user_agent`
  - `created_at` / `session_start_time`
  - `last_activity` (optional, for session age)
  - `impossible_travel` (bool, optional)
- **Where to Implement:**
  - Middleware: wrap session creation/refresh logic
  - File: Create `services/sessionService.js` or extend existing session handlers
  - Trigger: Every login success, every token refresh, every API call with valid session
- **Estimate:** ~100–150 lines

#### 7. `token_logs` — **HIGH PRIORITY**
- **Required By:** Alert A7 (Token Lifecycle Anomaly)
- **Data Needed:**
  - `principal_id` (user ID or OAuth subject)
  - `token_type` (access, refresh, id, api_key)
  - `event_type` (refresh, reissue, revoke, issue)
  - `ip_address`
  - `user_agent`
  - `device_id` (optional)
  - `created_at`
- **Where to Implement:**
  - File: Create `services/tokenLogService.js`
  - Trigger: JWT generation, refresh endpoint, token revocation
  - Existing Related Code: authService.js (token generation), loginController.js (MFA token handling)
- **Estimate:** ~80–120 lines

#### 8. `integrity_logs` — **HIGH PRIORITY**
- **Required By:** Alert A9 (Integrity Tamper Event)
- **Data Needed:**
  - `host_id` (server/node identifier)
  - `file_path` (path to monitored file)
  - `baseline_hash` (known-good SHA256)
  - `observed_hash` (current computed hash)
  - `tamper_type` (hash_mismatch, missing_file)
  - `scan_id` (from integrity scan job)
  - `last_known_good_build` (version string, optional)
  - `created_at`
- **Where to Implement:**
  - File: Create `scripts/integrityCheckJob.js` or `services/integrityService.js`
  - Trigger: Scheduled job (e.g., cron every 6 hours)
  - Related: security/runAssessment.js (line 88 writes to assessments; could extend for integrity)
- **Estimate:** ~150–200 lines

#### 9. `monitoring_heartbeats` — **HIGH PRIORITY**
- **Required By:** Alert A10 (Monitoring Pipeline Failure)
- **Data Needed:**
  - `component_name` (e.g., "alert_checker", "log_ingestion", "crypto_monitor")
  - `status` (healthy, degraded, failed)
  - `message` (optional error detail)
  - `created_at`
- **Where to Implement:**
  - File: Extend `services/securityAlertService.js`
  - Trigger: Every time `checkAlerts()` completes successfully, write a heartbeat record
  - Logic: If heartbeat is missing for >5 minutes, A10 triggers
- **Estimate:** ~30–50 lines (minimal)

#### 10. `crypto_logs` — **MEDIUM PRIORITY**
- **Required By:** Alert A12 (Encryption/Decryption Anomaly)
- **Data Needed:**
  - `crypto_operation` (encrypt, decrypt, sign, verify)
  - `event_type` (encrypt, decrypt, failure, success)
  - `key_identifier` (kid, key_id, or key name)
  - `key_version` (optional version number)
  - `endpoint` (which route/service called this)
  - `source_ip` (client IP if applicable)
  - `created_at`
  - `failure_reason` (if failure)
- **Where to Implement:**
  - File: Create `services/cryptoLogService.js` or extend encryption handlers
  - Trigger: Every encrypt/decrypt operation in your crypto layer
  - Related: May not have explicit crypto layers yet; check for `bcrypt`, OpenSSH key operations, or external encryption libs
- **Estimate:** ~100–150 lines

---

## Implementation Priority (Week 6)

### Must-Have (blockers for A6, A7, A9, A10):
1. **`session_logs`** — Start session tracking immediately
2. **`token_logs`** — Extend auth service to log token lifecycle
3. **`monitoring_heartbeats`** — Add 1-line write to securityAlertService.checkAlerts()
4. **`integrity_logs`** — Add scheduled file integrity check

### Should-Have (extends to A12):
5. **`crypto_logs`** — If your app uses encryption payloads heavily

---

## Code Examples (Starting Points)

### Example: Add `monitoring_heartbeats` writer to securityAlertService.js

```javascript
async function checkAlerts(options = {}) {
  // ... existing evaluation code ...
  
  // Write heartbeat after successful check
  try {
    if (supabaseService) {
      await supabaseService.from('monitoring_heartbeats').insert([{
        component_name: 'alert_checker',
        status: alerts.length > 0 ? 'degraded' : 'healthy',
        message: `Check completed: ${alerts.length} alerts generated`,
        created_at: new Date().toISOString()
      }]);
    }
  } catch (error) {
    console.warn('[securityAlertService] Heartbeat write failed:', error.message);
  }
  
  return { /* ... result ... */ };
}
```

### Example: Create sessionLogService.js

```javascript
const { supabaseService } = require('./supabaseClient');

async function logSessionEvent(sessionData) {
  if (!supabaseService) return;
  
  const { data, error } = await supabaseService.from('session_logs').insert([{
    session_id: sessionData.sessionId,
    user_id: sessionData.userId,
    ip_address: sessionData.ip,
    country: sessionData.country,
    region: sessionData.region,
    user_agent: sessionData.userAgent,
    created_at: new Date().toISOString()
  }]);
  
  if (error) {
    console.error('[sessionLogService] Insert failed:', error);
  }
  return { data, error };
}

module.exports = { logSessionEvent };
```

---

## Conclusion

**Week 5 Deliverables:** Alert definitions and evaluator service are complete.  
**Week 6 Deliverables:** Implement missing log-writers to enable full A1–A12 alerting.

All 5 missing log-writers are straightforward to implement (averaging ~100–150 lines each).
