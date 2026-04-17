# CT-004 Proposed Alert Conditions (Week 5 Final)

## Baseline Tuning Notes
These thresholds are tuned for typical small to medium Nutri-Help authentication traffic and should be re-validated weekly using rolling 7-day median and peak values.

- Baseline assumptions:
  - Login traffic: 5 to 30 attempts per minute during peak windows.
  - Failed login rate under normal conditions: below 3%.
  - MFA failure rate under normal conditions: below 5%.
  - 429 rate-limit responses should remain near zero for legitimate users.
- Tuning method:
  - Keep configured trigger threshold >= 3x normal baseline for volume rules.
  - Increase threshold only after two consecutive weeks of false positives.
  - Decrease threshold immediately if confirmed malicious activity bypasses detection.
- Alert deduplication:
  - Dedup window: 5 minutes per unique alert fingerprint (Alert ID + principal + IP).
- AI endpoint tagging:
  - For AI-related alerts, include `ai_endpoint_tag` and `ai_operation_type` in payload.
  - Current AI endpoint tags:
    - `/api/chatbot/*` -> `AI_CHAT`
    - `/api/plan/generate` -> `AI_PLAN_GENERATION`
    - `/api/image/*` -> `AI_IMAGE`

## Alert Definitions (A1 to A12)

### A1. Brute-Force by Account
- Trigger condition:
  - 10 or more failed login attempts for the same account (email or user_id) within 10 minutes.
- Severity: High
- Notification channels:
  - Email: Cyber Security Lead, Backend Lead
- Response actions:
  1. Confirm account attack pattern from auth history.
  2. Force temporary account lock (10 to 30 minutes) if not already applied.
  3. Notify affected user with account protection guidance.
  4. Add source IPs to watchlist for 24 hours.
- Auto-context payload:
  - `alert_id`, `event_time_window`, `account_identifier`, `failed_count`, `source_ips`, `top_user_agents`, `endpoint_paths`, `request_ids`

### A2. Brute-Force by Source IP
- Trigger condition:
  - 20 or more failed login attempts from a single source IP across at least 3 distinct accounts within 10 minutes.
- Severity: High
- Notification channels:
  - Email: Cyber Security Lead, Backend Lead
- Response actions:
  1. Validate whether source is malicious scanner/bot.
  2. Apply temporary IP block or strict rate limit.
  3. Inspect targeted accounts for unusual follow-up activity.
  4. Capture IOC details for incident record.
- Auto-context payload:
  - `alert_id`, `source_ip`, `failed_count`, `targeted_account_count`, `targeted_accounts_sample`, `geo_hint`, `endpoint_paths`, `first_seen`, `last_seen`

### A3. Successful Login After Failure Burst
- Trigger condition:
  - A successful login occurs for an account within 5 minutes after 5 or more failed login attempts for that same account.
- Severity: Critical
- Notification channels:
  - Email (urgent): Cyber Security Lead, Backend Lead
- Response actions:
  1. Immediately validate legitimacy of successful login.
  2. Force token/session revocation for suspicious sessions.
  3. Trigger step-up authentication for the account.
  4. Open incident ticket and preserve logs.
- Auto-context payload:
  - `alert_id`, `account_identifier`, `success_event_id`, `preceding_failed_count`, `source_ip_sequence`, `device_fingerprint_summary`, `session_ids`, `token_ids`

### A4. MFA Failure Burst
- Trigger condition:
  - 5 or more MFA verification failures for the same account within 10 minutes.
- Severity: High
- Notification channels:
  - Email: Cyber Security Lead, Backend Lead
- Response actions:
  1. Check whether password phase was successful before MFA failures.
  2. Temporarily suspend MFA retries for the account.
  3. Prompt user for account verification and password reset.
  4. Investigate source IP/device consistency.
- Auto-context payload:
  - `alert_id`, `account_identifier`, `mfa_failure_count`, `source_ips`, `related_login_outcomes`, `user_agents`, `time_buckets`

### A5. Rate-Limit Abuse on Sensitive Endpoints
- Trigger condition:
  - 30 or more HTTP 429 events from the same IP within 15 minutes on sensitive endpoints (`/api/login`, `/api/auth/*`, `/api/signup`, `/api/chatbot/*`, `/api/plan/generate`).
- Severity: High
- Notification channels:
  - Email: Backend Lead, Cyber Security Lead
- Response actions:
  1. Confirm abusive request burst pattern.
  2. Enforce stricter IP-based throttle or temporary ban.
  3. Verify no service degradation is occurring.
  4. If AI endpoint involved, notify AI Lead.
- Auto-context payload:
  - `alert_id`, `source_ip`, `rate_limit_hit_count`, `endpoint_distribution`, `peak_rps_estimate`, `status_code`, `ai_endpoint_tag` (when applicable)
- AI endpoint tagging:
  - Required when endpoint path matches AI routes.

### A6. Session Anomaly (Geo-Impossible Concurrent Sessions)
- Trigger condition:
  - 2 or more active sessions for same account within 30 minutes with conflicting location metadata (country/region mismatch) or impossible travel pattern.
- Severity: High
- Notification channels:
  - Email: Cyber Security Lead
- Response actions:
  1. Validate if sessions are legitimate multi-device use.
  2. Revoke suspicious sessions and force re-authentication.
  3. Flag account for enhanced monitoring.
  4. Notify user of suspicious session activity.
- Auto-context payload:
  - `alert_id`, `account_identifier`, `active_session_count`, `session_ids`, `location_markers`, `ip_addresses`, `user_agents`, `created_at_list`

### A7. Token Lifecycle Anomaly
- Trigger condition:
  - 8 or more token refresh/reissue/revoke events for same principal within 10 minutes, or
  - 3 or more rapid revoke and reissue loops within 10 minutes.
- Severity: High
- Notification channels:
  - Email: Backend Lead, Cyber Security Lead
- Response actions:
  1. Inspect token service for replay or automation behavior.
  2. Revoke suspect refresh tokens.
  3. Validate client/device legitimacy.
  4. Check for abuse of refresh endpoint.
- Auto-context payload:
  - `alert_id`, `principal_id`, `token_event_count`, `revoke_reissue_loops`, `refresh_endpoint_hits`, `ip_addresses`, `device_info`

### A8. Correlated Security Incident
- Trigger condition:
  - Correlation engine confidence score >= 0.80, or
  - 3 or more high-risk signals (A1/A2/A3/A5/A6/A7/A11) for same principal or IP within 10 minutes.
- Severity: Critical
- Notification channels:
  - Email (urgent): Cyber Security Lead, Backend Lead, AI Lead (if AI endpoints involved)
- Response actions:
  1. Open P1 incident bridge and assign incident commander.
  2. Contain attack path (IP/account/session controls).
  3. Preserve forensic evidence and timeline.
  4. Communicate impact status every 30 minutes.
- Auto-context payload:
  - `alert_id`, `correlation_confidence`, `incident_fingerprint`, `contributing_alerts`, `timeline`, `impacted_accounts`, `impacted_ips`, `ai_endpoint_tag` (when applicable)
- AI endpoint tagging:
  - Required when correlated events involve AI routes.

### A9. Integrity Tamper Event
- Trigger condition:
  - Any monitored file integrity mismatch (`hash_mismatch`) or missing critical file (`missing_file`) in integrity results.
- Severity: Critical
- Notification channels:
  - Email (urgent): Cyber Security Lead, Backend Lead
- Response actions:
  1. Isolate affected host/process from deployment pipeline.
  2. Compare artifact against trusted baseline.
  3. Roll back to known-good release if tampering confirmed.
  4. Start compromise investigation.
- Auto-context payload:
  - `alert_id`, `host_id`, `file_path`, `baseline_hash`, `observed_hash`, `tamper_type`, `integrity_scan_id`, `last_known_good_build`

### A10. Monitoring Pipeline Failure
- Trigger condition:
  - Log ingestion or alert checker heartbeat absent for more than 5 minutes, or
  - Monitoring component emits persistent ingestion/query failure in last 5 minutes.
- Severity: High
- Notification channels:
  - Email: Backend Lead, Cyber Security Lead
- Response actions:
  1. Confirm whether outage is partial or full monitoring blind spot.
  2. Restart failed monitoring component.
  3. Verify backlog ingestion recovery.
  4. Record blind-spot duration and risk impact.
- Auto-context payload:
  - `alert_id`, `failing_component`, `first_failure_time`, `last_healthy_time`, `error_samples`, `affected_tables`, `backlog_estimate`

### A11. Critical Security Error Category Event
- Trigger condition:
  - Any `critical` category error on auth/session/security routes (High), or
  - 3 or more such critical errors in 10 minutes (Critical escalation).
- Severity:
  - High (single event)
  - Critical (burst of 3 or more in 10 minutes)
- Notification channels:
  - Email: Cyber Security Lead, Backend Lead
- Response actions:
  1. Identify failing endpoint and blast radius.
  2. Verify if error indicates exploit attempt vs service bug.
  3. Apply hotfix or temporary route guard if needed.
  4. Escalate to incident if repeat burst is detected.
- Auto-context payload:
  - `alert_id`, `error_category`, `error_type`, `error_message_class`, `endpoint`, `method`, `ip_address`, `trace_id`, `repeat_count`, `ai_endpoint_tag` (when applicable)
- AI endpoint tagging:
  - Required when endpoint belongs to AI routes.

### A12. Encryption/Decryption Anomaly (Week 5+)
- Trigger condition:
  - 10 or more decrypt failures within 15 minutes, or
  - Decrypt failure rate >= 30% over rolling 15-minute window.
- Severity: High
- Notification channels:
  - Email: Cyber Security Lead, AI Lead, Backend Lead
- Response actions:
  1. Validate key usage and key version alignment.
  2. Verify no malformed payload replay pattern exists.
  3. Inspect AI and API consumers for misuse.
  4. Rotate affected keys if compromise suspected.
- Auto-context payload:
  - `alert_id`, `crypto_operation`, `failure_count`, `failure_rate`, `key_identifier`, `key_version`, `endpoint`, `source_ips`, `ai_endpoint_tag`, `ai_operation_type`
- AI endpoint tagging:
  - Required for AI encryption/decryption paths.

## Notification Policy
- Critical alerts:
  - Channel: Email urgent distribution list
  - Triage SLA: 15 minutes
- High alerts:
  - Channel: Email security operations distribution list
  - Triage SLA: 60 minutes

## Week 5 Review Confirmation
This document now includes:
1. Exact trigger conditions with threshold values for A1 to A12.
2. Severity mapping limited to Critical and High.
3. Email notification channels for all High and Critical alerts.
4. Clear on-call response actions and payload context requirements.
5. AI endpoint tagging guidance for relevant alert types.
