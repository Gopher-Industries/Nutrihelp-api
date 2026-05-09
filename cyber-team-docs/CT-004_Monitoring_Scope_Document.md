# CT-004 Monitoring Scope Document

## Purpose

This document defines the comprehensive monitoring scope for the NutriHelp API to provide real-time visibility into security events, authentication anomalies, and infrastructure health. The scope identifies 12 high-value security events (A1–A12) that form the foundation for threat detection and incident response.

## Monitoring Objectives

1. **Real-Time Threat Detection** - Identify malicious authentication patterns, brute-force attempts, and session anomalies within minutes.
2. **Incident Correlation** - Link related security events to detect coordinated attacks.
3. **Compliance and Audit** - Maintain comprehensive logs of security events for regulatory requirements and post-incident analysis.
4. **Operational Health** - Monitor infrastructure and monitoring pipeline health to prevent blind spots.
5. **Data Protection** - Track encryption/decryption anomalies to detect potential data breach attempts.

## Scope Boundaries

**Included:**
- Authentication and authorization events (login, MFA, token lifecycle)
- Session management anomalies (concurrent sessions, geo-impossible travel)
- Rate limiting and abuse detection
- Infrastructure and data integrity
- AI endpoint security events
- Encryption and key management anomalies
- Monitoring system health

**Out of Scope (for this phase):**
- Network-level DDoS detection (handled by infrastructure/CDN)
- Binary vulnerability scanning (handled by SAST/dependency tools)
- Frontend-only client-side events (no sensitive data)
- Non-security operational metrics (performance, availability)

## Monitoring Perimeter

### Authentication and Authorization Layer
- Login attempts (success, failure, MFA challenges)
- Token issuance, refresh, and revocation
- Session creation and termination
- Device fingerprinting and trusted device tracking
- Access control enforcement (RBAC violations)

### API Gateway and Rate Limiting
- HTTP 429 (Too Many Requests) events on sensitive endpoints
- Endpoint access patterns by source IP and principal
- Request rate anomalies

### Session and Device Management
- Concurrent session detection
- Geo-location anomalies (impossible travel)
- Device/user agent consistency checks
- Session lifecycle anomalies

### Encryption and Key Management
- Encryption/decryption operation failures
- Key usage and version tracking
- Vault access patterns
- Payload integrity validation

### Infrastructure and Integrity
- File integrity monitoring results (hash mismatches)
- Configuration validation
- Log ingestion and monitoring pipeline health
- Critical error rates on sensitive endpoints

### AI Endpoints (Tagging and Correlation)
- AI-specific endpoint access patterns
- Correlation of AI endpoint events with security incidents
- Encryption anomalies on AI data paths

## 12 Key Security Events (A1–A12)

### A1. Brute-Force by Account
**Trigger:** 10+ failed login attempts for the same account within 10 minutes.  
**Severity:** High  
**Purpose:** Detect targeted password-guessing attacks against specific user accounts.  
**Response:** Account lock, user notification, IP watchlist.

### A2. Brute-Force by Source IP
**Trigger:** 20+ failed login attempts from a single IP across 3+ distinct accounts within 10 minutes.  
**Severity:** High  
**Purpose:** Detect distributed reconnaissance attacks scanning for valid accounts.  
**Response:** IP blocking/throttling, IOC capture, account inspection.

### A3. Successful Login After Failure Burst
**Trigger:** Successful login within 5 minutes after 5+ failed attempts on the same account.  
**Severity:** Critical  
**Purpose:** Detect successful compromise after initial brute-force resistance.  
**Response:** Token/session revocation, step-up authentication, incident escalation.

### A4. MFA Failure Burst
**Trigger:** 5+ MFA verification failures for the same account within 10 minutes.  
**Severity:** High  
**Purpose:** Detect attacks on second-factor authentication or account enumeration via MFA probing.  
**Response:** MFA retry suspension, user verification, source IP investigation.

### A5. Rate-Limit Abuse on Sensitive Endpoints
**Trigger:** 30+ HTTP 429 events from the same IP within 15 minutes on auth/login/signup/AI endpoints.  
**Severity:** High  
**Purpose:** Detect API abuse, bot activity, or reconnaissance on critical functions.  
**Response:** Stricter IP throttling, service verification, AI Lead notification if applicable.

### A6. Session Anomaly (Geo-Impossible Concurrent Sessions)
**Trigger:** 2+ active sessions for the same account within 30 minutes with conflicting location data or impossible travel.  
**Severity:** High  
**Purpose:** Detect account takeover or unauthorized access from compromised devices.  
**Response:** Session revocation, re-authentication, user notification.

### A7. Token Lifecycle Anomaly
**Trigger:** 8+ token refresh/reissue/revoke events within 10 minutes, or 3+ rapid revoke/reissue loops.  
**Severity:** High  
**Purpose:** Detect token replay attacks, refresh token abuse, or automated attack scripts.  
**Response:** Refresh token revocation, client validation, automation pattern analysis.

### A8. Correlated Security Incident
**Trigger:** Correlation confidence >= 0.80, or 3+ high-risk signals (A1/A2/A3/A5/A6/A7/A11) within 10 minutes.  
**Severity:** Critical  
**Purpose:** Identify coordinated multi-stage attacks combining multiple attack vectors.  
**Response:** P1 incident escalation, attack containment, forensic preservation.

### A9. Integrity Tamper Event
**Trigger:** File hash mismatch or missing critical file in integrity scan results.  
**Severity:** Critical  
**Purpose:** Detect unauthorized code modification, supply-chain compromise, or system break-in.  
**Response:** Host isolation, rollback to known-good version, compromise investigation.

### A10. Monitoring Pipeline Failure
**Trigger:** Log ingestion or alert heartbeat absent for 5+ minutes.  
**Severity:** High  
**Purpose:** Detect blind spots in security monitoring to prevent undetected attacks during outages.  
**Response:** Component restart, backlog ingestion, blind-spot duration recording.

### A11. Critical Security Error Category Event
**Trigger:** Single critical error on auth/session routes (High), or 3+ such errors in 10 minutes (Critical escalation).  
**Severity:** High (single) / Critical (burst)  
**Purpose:** Detect authentication/authorization system failures that may indicate exploits or configuration issues.  
**Response:** Endpoint failure analysis, hotfix deployment, incident assessment.

### A12. Encryption/Decryption Anomaly
**Trigger:** 10+ decrypt failures in 15 minutes, or decrypt failure rate >= 30% over 15-minute window.  
**Severity:** High  
**Purpose:** Detect encryption key compromise, payload tampering, or malicious decryption attempts.  
**Response:** Key rotation, payload validation, consumer endpoint inspection.

## Event Categories Summary

| Category | Events | Purpose |
|----------|--------|---------|
| **Authentication Attack** | A1, A2, A3, A4 | Detect brute-force, MFA bypass, and account takeover attempts |
| **API Abuse** | A5 | Detect rate-limit abuse and bot activity |
| **Session/Device Attack** | A6, A7 | Detect unauthorized access and token replay |
| **Incident Correlation** | A8 | Link multi-stage attacks for coordinated response |
| **Infrastructure/Integrity** | A9, A10, A11 | Detect code tampering, monitoring failures, and system errors |
| **Data Protection** | A12 | Detect encryption key compromise and payload tampering |

## Notification Policy

### Critical Severity Alerts (A3, A8, A9)
- **Channel:** Email urgent distribution list
- **Recipients:** Cyber Security Lead, Backend Lead, AI Lead (if applicable)
- **Triage SLA:** 15 minutes
- **Escalation:** P1 incident

### High Severity Alerts (A1, A2, A4, A5, A6, A7, A10, A11, A12)
- **Channel:** Email security operations distribution list
- **Recipients:** Cyber Security Lead, Backend Lead (+ AI Lead for A5/A12 if AI endpoints involved)
- **Triage SLA:** 60 minutes
- **Escalation:** P1 incident or P2 if correlated with other alerts

## Baseline Tuning

Alert thresholds are tuned for typical small-to-medium NutriHelp authentication traffic:

- **Login traffic:** 5–30 attempts per minute during peak windows
- **Failed login rate:** Below 3% under normal conditions
- **MFA failure rate:** Below 5% under normal conditions
- **Rate-limit 429 responses:** Near zero for legitimate users

### Tuning Methodology
- Keep volume thresholds >= 3x normal baseline
- Increase threshold only after two consecutive weeks of false positives
- Decrease immediately if confirmed malicious activity bypasses detection
- Review baselines weekly using rolling 7-day median and peak values

## Alert Deduplication

- **Dedup window:** 5 minutes per unique alert fingerprint (Alert ID + principal + IP)
- **Purpose:** Suppress duplicate alerts from the same attack within a short window
- **Exception:** Escalation from High to Critical resets dedup window

## AI Endpoint Tagging

For AI-related alerts (A5, A8, A11, A12), include endpoint tagging:

| Endpoint Pattern | Tag | Operation Type |
|---|---|---|
| `/api/chatbot/*` | `AI_CHAT` | Chat interaction |
| `/api/plan/generate` | `AI_PLAN_GENERATION` | Meal plan generation |
| `/api/image/*` | `AI_IMAGE` | Image classification |

**Required fields** in alert payload for AI events:
- `ai_endpoint_tag`
- `ai_operation_type`
- `source_ip`
- `request_id` (for end-to-end tracing)

## Week 4 Task 2 Deliverables

- ✅ Monitoring scope defined with clear objectives and boundaries
- ✅ 12 key security events identified with trigger conditions and response actions
- ✅ Event categorization by type (authentication, API abuse, session, correlation, infrastructure, data protection)
- ✅ Notification policy with SLA-driven triage expectations
- ✅ Alert deduplication and baseline tuning guidance
- ✅ AI endpoint tagging for correlated analysis

## Next Steps (Week 5+)

1. Implement alert evaluation logic (trigger condition checks)
2. Deploy alert notification service with email integration
3. Build alert dashboard for real-time visibility
4. Establish incident correlation engine (for A8)
5. Configure monitoring pipeline health checks (A10)
6. Extend A12 monitoring for encryption key rotation events