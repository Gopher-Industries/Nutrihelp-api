# NutriHelp – Week 7 Log Inventory Table
Sprint 2 – Log Inventory and Analysis (SOC Perspective)  
Prepared by: Himanshi – Junior SOC Analyst, Cybersecurity Team  
Date: Week 7

---

| File/Folder | Log Type | Event Captured | Data Fields Logged | Contains PII? | Storage Location | Observations / Recommendations |
|--------------|-----------|----------------|--------------------|----------------|-------------------|--------------------------------|
| services/authService.js | Authentication Log | User login success/failure | user_id, email, ip_address, success | Yes | Supabase table `auth_logs` | Persistent audit trail implemented |
| services/authService.js | Token Generation Log | Access/refresh token created | token payload, expiry | Yes | Console only | Add persistent DB log (`token_activity_logs`) |
| services/authService.js | Token Verification Log | JWT verification success/failure | token payload, error message | Yes | Console only | Needs Supabase logging for visibility |
| services/authService.js | Token Refresh Log | Refresh token validation (success/failure) | user_id, refresh_token, ip | Yes | Console only | Add persistent logging for refresh attempts |
| services/authService.js | Session Log | Logout / session cleanup | user_id | Yes | None | Not logged – add DB entry for session lifecycle |
| Monitor_&_Logging/loginLogger.js | Authentication Log | Login event | user_id, ip_address, user_agent | Yes | Supabase table `audit_logs` | Properly persisted and structured |
| middleware/authorizeRoles.js | Access Control Log | Unauthorized role access attempt | user_id, role, endpoint | Yes | Supabase `rbac_violation_logs` | Review role access periodically |
| middleware/errorLogger.js | Error Log | API and system exceptions | endpoint, status, message | Partial | Console / Supabase via `errorLogService` | Ensure centralized logging call per route |
| services/errorLogService.js | Unified System Log | API, system, and token/auth errors | user_id, ip, endpoint, stack_trace | Yes (masked) | Supabase `error_logs`, `/logs/error_log.jsonl`, console | Excellent coverage; includes redaction and alerts |
| middleware/authenticateToken.js | Security Log (Indirect) | Invalid/expired token validation | token, endpoint | Yes | Logged via `errorLogService` | Token failures indirectly logged; explicit call recommended |
| server.js | System Startup Log | Server start / DB connection | port, timestamp | No | Console | Add structured `startup.log` entry for auditing |

---

### Summary

| Area | Current Status | Next Sprint Improvement (Week 8–9) |
|-------|----------------|------------------------------------|
| Authentication | Good | Maintain retention policy |
| Token Lifecycle | Partial | Add DB-based `token_activity_logs` |
| Session Management | Missing | Add session logs |
| Error Logging | Excellent | Integrate alert hooks |
| Retention Policy | Missing | Implement 90-day archival script |
| Schema Consistency | Partial | Create unified `log_schema.md` |

---

### Insights
This log inventory reveals that NutriHelp’s backend maintains robust authentication and error logging through Supabase and centralized services. However, key improvements are needed in token lifecycle tracking, session event logging, and automated retention. Implementing these changes in the next sprint will align the system with SOC-level visibility and ISO 27001 audit standards.
