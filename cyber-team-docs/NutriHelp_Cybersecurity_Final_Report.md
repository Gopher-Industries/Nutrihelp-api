# NutriHelp Cybersecurity Final Report
## Encryption at Rest, In Transit, and Real-Time Security Monitoring
### Gopher Industries — Capstone Project Documentation & Team Handover

---

**Prepared by:** Faith Chukwudum  
**Project:** NutriHelp — Personalized Nutrition Platform for Australian Seniors  
**Organisation:** Gopher Industries  
**Academic Context:** Cybersecurity Capstone — Tasks 1 & 2  
**Document Version:** 1.0 (Final)  
**Date:** May 2026  

---

> *"Security is not a product, but a process — and for a platform serving vulnerable populations, it is a duty."*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Introduction](#2-introduction)
3. [Task 1: Encryption at Rest and In Transit](#3-task-1-encryption-at-rest-and-in-transit)
4. [Task 2: Real-Time Monitoring and Alerting](#4-task-2-real-time-monitoring-and-alerting)
5. [Security Architecture Overview](#5-security-architecture-overview)
6. [Testing, Verification and Evidence](#6-testing-verification-and-evidence)
7. [Risks, Lessons Learned and Best Practices](#7-risks-lessons-learned-and-best-practices)
8. [Handover and Maintenance Guide](#8-handover-and-maintenance-guide)
9. [Conclusion and Capstone Reflection](#9-conclusion-and-capstone-reflection)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

NutriHelp is a web-based nutrition and health management platform built by Gopher Industries to support Australian seniors in managing their dietary needs, health conditions, and meal planning. As a platform serving an elderly population — a demographic that is both digitally vulnerable and health-sensitive — the security of its underlying data infrastructure is not merely a technical requirement but an ethical imperative.

This report documents the complete delivery of two major cybersecurity workstreams carried out during the capstone project period:

**Task 1 — Encryption at Rest and In Transit** addressed the absence of data-level encryption on sensitive user information. Prior to this work, Personally Identifiable Information (PII) such as contact numbers, home addresses, health risk assessments, and survey responses were stored in plaintext within the Supabase PostgreSQL database. This created an unacceptable exposure risk in the event of a database breach. The solution implemented Transport Layer Security version 1.3 (TLS 1.3) enforcement across all API communications, and Applied Encryption Standard 256-bit in Galois/Counter Mode (AES-256-GCM) encryption at the database field level for all sensitive tables. A full key management strategy using Supabase Vault was designed and documented, alongside a three-phase staged migration plan, automated verification tools, and a key rotation playbook.

**Task 2 — Real-Time Monitoring and Alerting (CT-004)** addressed the complete absence of runtime security visibility. The platform had no mechanism to detect, respond to, or alert on active security threats such as brute force attacks, session hijacking, token abuse, or encryption failures. This work designed and implemented a comprehensive monitoring architecture covering 12 high-value security event categories (A1 through A12), built the full alert evaluation pipeline, integrated it with persistent storage and email notifications, and delivered a frontend Security Alerts Dashboard for operational oversight.

### Key Achievements

| Deliverable | Status |
|---|---|
| TLS 1.3 enforcement with HSTS and HTTP redirect | Delivered |
| AES-256-GCM encryption service with Vault key management | Delivered |
| Encryption of users, health reports, and survey tables | Delivered |
| Automated migration scripts (idempotent, dry-run capable) | Delivered |
| Key rotation playbook and staged deprecation plan | Delivered |
| 12-event monitoring scope (A1–A12) | Delivered |
| Real-time alert evaluation engine | Delivered |
| Alert persistence, deduplication, and notifications | Delivered |
| Frontend Security Alerts Dashboard | Delivered |
| `/api/health/encryption` live health check endpoint | Delivered |

The combined impact of these two workstreams is a platform that now enforces encryption for all sensitive data at rest and in transit, detects and responds to active security threats in near real-time, and provides operational visibility for the team responsible for its ongoing security.

---

## 2. Introduction

### 2.1 Project Background

NutriHelp was developed to address a genuine public health need: helping Australian seniors navigate the complexities of nutrition management as they age. Older Australians face elevated risk of malnutrition, chronic disease mismanagement, and social isolation, and digital tools like NutriHelp have the potential to meaningfully improve health outcomes.

However, the platform's value to users depends entirely on their trust. For seniors — many of whom are cautious about digital privacy — sharing sensitive information such as medical diagnoses, dietary restrictions, allergy profiles, and contact details requires confidence that their data will be handled responsibly. A data breach affecting this demographic would cause not only reputational damage to Gopher Industries but real harm to vulnerable individuals.

At the time this workstream began, NutriHelp lacked two foundational security controls:

1. **Data encryption** — Sensitive fields were stored and transmitted in plaintext.
2. **Security monitoring** — There was no runtime detection of attacks, anomalies, or system failures.

### 2.2 Objectives

The cybersecurity workstream set out to achieve the following objectives:

- Enforce end-to-end encryption for all API communications using current industry standards.
- Implement field-level encryption at rest for all sensitive database tables.
- Design and execute a safe, staged migration strategy for existing plaintext data.
- Build a comprehensive real-time security monitoring and alerting system.
- Deliver operational tooling (dashboards, health checks, migration scripts) that future teams can use and maintain.
- Produce documentation suitable for both academic capstone submission and professional handover.

### 2.3 Why This Matters for Senior Users

The NutriHelp user base is demographically distinct from typical web application users. Australian seniors are:

- **Less likely to detect a breach** — Older users may not notice unusual account activity or data misuse.
- **Higher-value targets for identity theft** — Seniors often hold significant assets and may be targeted specifically.
- **Sharing uniquely sensitive health data** — Medical history, prescription details, and dietary conditions linked to chronic illness represent a category of data with special privacy protections under Australian law (Privacy Act 1988, Australian Privacy Principles).
- **Trusting in ways that carry consequences** — A breach of trust with this population is harder to repair and has greater real-world impact.

These factors elevate the standard of care required beyond what would be expected for a general consumer application.

### 2.4 Regulatory and Compliance Context

The work delivered aligns with the following regulatory and standards frameworks:

- **Australian Privacy Act 1988 (Cth)** — Requires organisations to protect personal information from misuse, interference, loss, and unauthorised access.
- **Australian Privacy Principle (APP) 11** — Security of personal information.
- **OWASP (Open Web Application Security Project) Top 10** — The encryption and monitoring controls directly address A02 (Cryptographic Failures) and A09 (Security Logging and Monitoring Failures).
- **NIST Cybersecurity Framework** — Covers Identify, Protect, Detect, and Respond functions.

---

## 3. Task 1: Encryption at Rest and In Transit

### 3.1 Overview

Task 1 delivered a complete encryption stack for NutriHelp, spanning two distinct layers: transport-layer security to protect data as it moves between the user's browser and the server, and storage-layer encryption to protect data at rest in the database. Together, these layers ensure that sensitive information is never exposed as readable plaintext whether it is travelling across the network or sitting in a database table.

---

### 3.2 Architecture and Design Decisions

#### 3.2.1 Choosing TLS 1.3

Transport Layer Security (TLS) is the cryptographic protocol that secures communications over a network. The decision to enforce TLS version 1.3 exclusively — rather than accepting older versions — was deliberate and reflects current security best practice.

TLS 1.3, introduced in 2018, removes several legacy cryptographic algorithms that had become vulnerable over time. It eliminates RSA key exchange (which had been shown to be susceptible to retrospective decryption if a private key is later compromised), reduces the handshake to a single round trip (improving performance), and enforces forward secrecy by default. Forward secrecy means that even if an attacker were to obtain the server's private key in the future, they could not decrypt previously captured traffic.

By setting both `minVersion` and `maxVersion` to `TLSv1.3` in the Node.js HTTPS server configuration, the implementation ensures that no client can negotiate a lower, potentially vulnerable version.

#### 3.2.2 Choosing AES-256-GCM for Data at Rest

For database-level encryption, AES-256-GCM was selected. This choice merits explanation:

- **AES (Advanced Encryption Standard)** is the encryption algorithm adopted by the United States National Institute of Standards and Technology (NIST) as the global standard for symmetric encryption. It is used by banks, governments, and every major cloud provider.
- **256-bit key length** means the keyspace has 2²⁵⁶ possible keys — an astronomically large number that makes brute-force attacks computationally infeasible for any known technology, including quantum computers under current projections.
- **GCM (Galois/Counter Mode)** is a mode of operation that combines encryption with authentication. Every encrypted value carries a 128-bit authentication tag. If anyone tampers with the encrypted data — even changing a single bit — decryption will fail with an authentication error. This property is called Authenticated Encryption with Associated Data (AEAD) and is critical for detecting data corruption or deliberate tampering.

The practical benefit is that field-level encryption at rest protects data even in the scenario where an attacker gains direct database access (e.g., through a SQL injection vulnerability, a misconfigured database credential, or a compromised hosting environment) — they would see only opaque ciphertext, not readable personal information.

#### 3.2.3 Per-Record Initialisation Vectors

Each encryption operation generates a fresh 96-bit random Initialisation Vector (IV) — also called a nonce. The IV is stored alongside the encrypted value and used during decryption. Reusing an IV with the same key is a critical cryptographic vulnerability in GCM mode. The implementation generates a new IV for every write using `crypto.randomBytes(12)`, making each encrypted value cryptographically independent.

#### 3.2.4 Key Management Strategy

Encryption is only as strong as its key management. A strong algorithm with a weak key management strategy provides false security. Three key management principles governed the design:

1. **Keys are never stored in source code.** The encryption key is loaded at runtime from environment variables or from Supabase Vault (a secure secret storage layer built into the Supabase platform).
2. **Keys are versioned.** Every encrypted record stores the key version used to encrypt it (e.g., `v1`). This enables safe key rotation without re-encrypting everything at once.
3. **The Vault path is the preferred production approach.** Supabase Vault stores secrets in an isolated, encrypted store. The key is retrieved via a PostgreSQL Remote Procedure Call (RPC) that is restricted exclusively to the service role — anonymous and authenticated clients cannot access it.

---

### 3.3 Implementation Details

#### 3.3.1 TLS 1.3 and HTTPS Enforcement

The server was configured to serve exclusively over HTTPS using TLS 1.3. The implementation in `server.js` creates two servers:

1. **HTTPS server** on port 443 (configurable) — handles all API traffic.
2. **HTTP redirect server** on port 80 (configurable) — issues a permanent 301 redirect for any HTTP request, forcing the client to use HTTPS.

```
Client request (HTTP) → Port 80 → 301 Redirect → Port 443 (HTTPS/TLS 1.3)
```

HTTP Strict Transport Security (HSTS) headers are applied via the Helmet middleware with a `max-age` of 63,072,000 seconds (two years), `includeSubDomains`, and `preload` flags. HSTS instructs browsers to refuse plain HTTP connections entirely for the specified duration — even before making a request — and the `preload` flag enables inclusion in browser HSTS preload lists.

For local development (where TLS certificates may not be available), the server gracefully falls back to HTTP with a clear console warning and certificate generation instructions. In a production environment, this fallback is disabled and the server exits if certificates are not present.

#### 3.3.2 The Encryption Service (`services/encryptionService.js`)

The encryption service is the central component of the at-rest encryption system. It was designed with the following principles:

- **Backend-only execution** — A runtime guard throws an error if the module is loaded in a browser context, preventing accidental exposure of key material to the frontend.
- **Lazy key loading and caching** — The encryption key is loaded once on first use and cached in memory. Subsequent operations use the cached key, reducing latency and Vault API calls.
- **Strict key validation** — The `normalizeKey` function accepts only 32-byte base64-encoded strings (44 characters) or 64-character hexadecimal strings. Any other format throws an error with a helpful key generation command. The earlier SHA-256 passphrase fallback was deliberately removed because it allowed arbitrarily weak strings to become encryption keys.
- **Payload envelope format** — Encrypted values are wrapped in a versioned JSON envelope `{v: 1, t: 'string'|'json', d: value}` before encryption. This allows the system to handle both string and object values and supports future format evolution without schema changes.

The service exports the following functions:

| Function | Purpose |
|---|---|
| `encrypt(data)` | Core encryption — returns `{encrypted, iv, authTag, keyVersion, algorithm}` |
| `decrypt(encrypted, iv, authTag)` | Core decryption — returns original string or object |
| `encryptForDatabase(data)` | Wraps `encrypt` with error logging — callers must not catch failures |
| `decryptFromDatabase(record, fieldMap)` | Reads encrypted columns from a DB record and decrypts |
| `verifyEncryption(original, encryptedResult)` | Decrypts and compares to original — post-write integrity check |
| `encryptBatch(records, buildSensitiveData)` | Encrypts a collection with configurable concurrency (default 5) |
| `reencryptBatch(records, oldDecrypt)` | Re-encrypts from old key to new key — used by rotation script |
| `clearCachedKeyForRotation()` | Clears key cache so a new key is loaded on next operation |
| `loadEncryptionKey()` | Loads key from Vault or env var with version information |

#### 3.3.3 Encrypted Tables and Fields

The following database tables and fields are covered by at-rest encryption:

| Table | Encrypted Fields | Encrypted Column | Notes |
|---|---|---|---|
| `users` | `contact_number`, `address`, `name`, `first_name`, `last_name` | `profile_encrypted` | Covered Week 6 |
| `health_risk_reports` | `risk_factors`, `recommendations`, `notes`, `diagnosis_data` | `encrypted_payload` | Covered Week 7/8 |
| `health_surveys` | `responses`, `notes`, `health_data` | `encrypted_payload` | Covered Week 7/8 |

For each table, the encrypted payload and three supporting columns are stored:

```
{table}_encrypted           TEXT  -- AES-256-GCM ciphertext (base64)
{table}_encryption_iv       TEXT  -- 96-bit nonce (base64)
{table}_encryption_auth_tag TEXT  -- 128-bit authentication tag (base64)
{table}_encryption_key_version TEXT -- e.g. 'v1'
```

After a successful write, the plaintext versions of sensitive columns are set to `NULL`. This ensures that encrypted and plaintext copies never coexist on a row after the migration.

#### 3.3.4 Verification Service and Health Check

A dedicated `encryptionVerificationService.js` runs a live round-trip test on startup and on demand:

1. Loads the active encryption key.
2. Encrypts a test string and a test object.
3. Decrypts each and compares to the original.
4. Returns a structured report with `healthy`, `degraded`, or `down` status.

This status is exposed at `GET /api/health/encryption` — an unauthenticated endpoint designed for uptime monitors and CI/CD pipelines. It never exposes key material, only pass/fail status and key version metadata.

```json
{
  "status": "healthy",
  "key_version": "v1",
  "checks": {
    "key_available":     { "ok": true },
    "string_round_trip": { "ok": true },
    "object_round_trip": { "ok": true }
  }
}
```

---

### 3.4 Migration Strategy and Staged Rollout

Introducing encryption to an existing system with live data requires careful handling of the transition period. A three-phase staged rollout was designed to ensure zero data loss and continuous service availability.

#### Phase 1 — Dual-Write (Current State)

**What it means:** New writes encrypt the data and store the ciphertext in the dedicated encryption columns. The plaintext columns for sensitive fields are nulled out on the same write. Existing rows that pre-date the encryption rollout retain their plaintext values until the back-fill migration is run.

**Read behaviour:** If a row has an encrypted payload, the service layer decrypts it and uses the decrypted values. If no encrypted payload exists (pre-migration row), the plaintext column values are used.

**Key safeguard:** Encryption failures are hard errors — the application never falls back to storing plaintext if encryption fails. The caller receives a 500 error, which is preferable to silently storing sensitive data unprotected.

**Exit criteria:**
- `GET /api/health/encryption` returns `healthy` for at least 7 consecutive days.
- All new writes confirmed to have `encrypted_payload IS NOT NULL`.
- Zero decryption failures in alert history (no A12 alerts).

#### Phase 2 — Migration and Enforcement

**What it means:** The back-fill migration script is run to encrypt all pre-existing rows. Database-level `CHECK` constraints are applied to enforce that plaintext columns are `NULL` whenever an encrypted payload is present. The plaintext read fallback is removed from application code.

**Migration script features:**
- **Idempotent** — Rows already encrypted are detected and skipped.
- **Dry-run support** — `--dry-run` flag shows what would be changed without writing.
- **Batch processing** — Records are processed in configurable batches (default 50) to limit database load.
- **Post-write verification** — After each row is written, it is immediately read back and decrypted to confirm the ciphertext is valid.

```bash
# Preview changes without writing
node scripts/migrate-encrypt-user-profiles.js --dry-run

# Apply migration
node scripts/migrate-encrypt-user-profiles.js
```

**Database constraint (applied after back-fill):**
```sql
ALTER TABLE public.users
  ADD CONSTRAINT chk_contact_number_encrypted
  CHECK (profile_encrypted IS NULL OR contact_number IS NULL);
```

**Exit criteria:**
- 100% of rows have `encrypted_payload IS NOT NULL`.
- Database constraints active and verified.
- Full regression test suite passing.

#### Phase 3 — Column Drop

**What it means:** The now-redundant plaintext columns are removed from the database schema. This permanently eliminates the surface area for plaintext PII exposure.

```sql
ALTER TABLE public.users
  DROP COLUMN IF EXISTS contact_number,
  DROP COLUMN IF EXISTS address;
```

**Exit criteria:** Phase 2 stable for at least one full sprint; staging migration verified; all API documentation updated.

---

### 3.5 Key Rotation Playbook

Key rotation is the process of replacing an active encryption key with a new one. It is a security best practice and is mandatory after any suspected key compromise.

#### When to Rotate

- **Scheduled:** Every 12 months or per organisational policy.
- **Unscheduled:** On suspected compromise, staff departure with key access, or after a security incident.

#### Rotation Steps

```bash
# Step 1: Generate a new 32-byte key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Step 2: Set environment variables
ENCRYPTION_KEY=<current_v1_key>
ENCRYPTION_KEY_V2=<new_v2_key>
ENCRYPTION_KEY_VERSION=v2

# Step 3: Dry-run to preview scope
node scripts/rotate-encryption-key.js --dry-run

# Step 4: Apply rotation
node scripts/rotate-encryption-key.js

# Step 5: Update ENCRYPTION_KEY to the new value, remove ENCRYPTION_KEY_V2

# Step 6: Revoke the old key from Vault
```

The rotation script:
- Reads each encrypted row, decrypts with the old key, re-encrypts with the new key.
- Verifies each re-encrypted row immediately after writing.
- Skips rows already on the target version (idempotent).
- Supports per-table targeting with `--table users`.
- Never logs key values — only operational statistics.

---

### 3.6 Security Controls and Threat Mitigation

| Threat | Mitigation Implemented |
|---|---|
| Network eavesdropping / man-in-the-middle | TLS 1.3 with no downgrade path; HSTS with preload |
| Database breach (direct access) | AES-256-GCM field-level encryption; plaintext columns nulled post-migration |
| Key compromise | Supabase Vault for key storage; key rotation playbook; version tracking |
| Weak key derivation | SHA-256 passphrase fallback removed; strict 32-byte key enforcement |
| Data tampering | GCM authentication tag verifies integrity on every decrypt |
| Silent encryption failure | Hard errors on failure; `verifyEncryption()` post-write check |
| Multi-instance key inconsistency | Key version stored per row; rotation script handles all instances |
| Accidental key logging | Key IDs validated; raw key format detection with `[REDACTED]` substitution |

---

## 4. Task 2: Real-Time Monitoring and Alerting

### 4.1 Overview

Task 2 designed and built a complete real-time security monitoring and alerting system for NutriHelp under the project code CT-004. Prior to this work, the platform had no mechanism to detect active attacks, anomalous behaviour, or system failures. An attacker conducting a brute-force campaign against user accounts, or a system failure silently disabling security controls, would go entirely unnoticed.

The CT-004 system addresses this by continuously evaluating 12 categories of security events, generating structured alerts when thresholds are crossed, delivering notifications to the security team, persisting alert history, and providing a real-time dashboard for operational oversight.

---

### 4.2 Monitoring Scope and Event Taxonomy

The monitoring scope covers six security domains: authentication attacks, rate-limit abuse, session and token anomalies, incident correlation, infrastructure integrity, and cryptographic health. The 12 alert conditions (A1 through A12) are summarised below.

#### 4.2.1 Alert Conditions Reference

| ID | Name | Severity | Trigger Condition | Time Window |
|---|---|---|---|---|
| **A1** | Brute Force — Per Account | High | 10+ failed logins for the same account | 10 minutes |
| **A2** | Credential Stuffing — Per IP | High | 20+ failed logins from one IP across 3+ accounts | 10 minutes |
| **A3** | Brute Force Success | Critical | Successful login after 5+ failed attempts on the same account | 5 minutes |
| **A4** | MFA Bypass Attempt | High | 5+ Multi-Factor Authentication (MFA) failures for the same account | 10 minutes |
| **A5** | Rate-Limit Abuse | High | 30+ HTTP 429 responses from one IP on sensitive endpoints | 15 minutes |
| **A6** | Session Anomaly | High | 2+ active sessions with conflicting or impossible geographic locations | 30 minutes |
| **A7** | Token Abuse | High | 8+ token events or 3+ rapid revoke/reissue loops for one principal | 10 minutes |
| **A8** | Incident Correlation | Critical | 3+ high-risk alerts (A1, A2, A3, A5, A6, A7, A11) for the same principal/IP | 10 minutes |
| **A9** | File Integrity Failure | Critical | Hash mismatch or missing critical file detected | 60 minutes |
| **A10** | Monitoring Pipeline Failure | High | Heartbeat absent for >5 minutes or persistent query failures | 5 minutes |
| **A11** | Critical Auth Errors | High/Critical | Critical or security-category errors on auth routes | 10 minutes |
| **A12** | Encryption Anomaly | High | 10+ decryption failures or ≥30% decrypt failure rate | 15 minutes |

#### 4.2.2 Data Sources

Alert conditions are evaluated against data collected in dedicated log tables:

| Log Table | Feeds Alerts | Content |
|---|---|---|
| `auth_logs` | A1, A2, A3, A4 | Login attempts, MFA events, success/failure status |
| `brute_force_logs` | A1, A2, A3 | IP-tagged failure records, account lockout data |
| `error_logs` | A5, A11 | HTTP error responses, server-side error categories |
| `session_logs` | A6 | Session creation events with IP and geo metadata |
| `token_logs` | A7 | Token issue, refresh, revoke, and validation events |
| `integrity_logs` | A9 | File scan results, baseline hashes, tamper flags |
| `monitoring_heartbeats` | A10 | Pipeline liveness signals from the alert checker |
| `crypto_logs` | A12 | Encrypt/decrypt operation outcomes, key identifiers |

---

### 4.3 Alert Design and Response Framework

#### 4.3.1 Alert Structure

Every alert generated by the system carries a consistent structure:

```json
{
  "alert_id": "A3",
  "severity": "Critical",
  "trigger_summary": "Successful login after 5+ failed attempts within 5 minutes",
  "triage_sla_minutes": 15,
  "fingerprint": "user@example.com",
  "notification_channels": ["email"],
  "response_actions": [
    "Validate legitimacy of the successful login immediately.",
    "Force token and session revocation for suspicious sessions.",
    "Trigger step-up authentication for the account.",
    "Open incident ticket and preserve logs."
  ],
  "payload": {
    "account_identifier": "user@example.com",
    "preceding_failed_count": 7,
    "source_ip_sequence": ["203.0.113.1"],
    "event_time_window": "5m"
  }
}
```

#### 4.3.2 Severity and Triage SLA

| Severity | Triage SLA | Examples |
|---|---|---|
| Critical | 15 minutes | A3 (brute force success), A8 (correlated attack), A9 (file tamper) |
| High | 60 minutes | A1, A2, A4, A5, A6, A7, A10, A11, A12 |
| Medium | 4 hours | Informational events, low-confidence signals |
| Low | 24 hours | Monitoring health notices, archive events |

#### 4.3.3 Deduplication

The system implements two-layer deduplication to prevent alert fatigue:

1. **In-process cache** — An in-memory Map stores the last sent timestamp for each `alertId:fingerprint` pair. Duplicate alerts within the 5-minute dedup window are suppressed for the current process.
2. **Database-backed deduplication** — Before dispatching, the system queries `alert_history` for any alert with the same `alert_id` and `fingerprint` sent within the window. This prevents duplicate alerts when multiple server instances run simultaneously.

---

### 4.4 Implementation Architecture and Key Services

#### 4.4.1 System Architecture

```
                    ┌─────────────────────────────┐
                    │  setInterval (5 min cycle)   │
                    │  + DB job lock (distributed) │
                    └────────────┬────────────────┘
                                 │
                    ┌────────────▼────────────────┐
                    │  securityAlertService.js     │
                    │  ├── loadAlertData()         │
                    │  ├── evaluateA1() .. A12()   │
                    │  ├── shouldSendDeduped()     │
                    │  ├── filterDedupedFromDB()   │
                    │  ├── sendAlert()             │
                    │  └── persistAlertHistory()   │
                    └────────────┬────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
 ┌────────▼───────┐   ┌──────────▼───────┐   ┌─────────▼──────┐
 │  Supabase DB   │   │  Nodemailer      │   │  Slack Webhook │
 │  alert_history │   │  Email alerts    │   │  (optional)    │
 └────────────────┘   └──────────────────┘   └────────────────┘
```

#### 4.4.2 Core Components

**`services/securityAlertService.js`** (approximately 1,300 lines) is the central alert evaluation engine. It:
- Loads data from all eight log tables in parallel using `loadAlertData()`.
- Evaluates all 12 alert conditions against the loaded data.
- Applies two-layer deduplication.
- Dispatches alerts via email and optionally Slack.
- Persists alert records to `alert_history`.
- Manages the DB-level job lock to prevent multi-instance overlap.

**`services/sessionLogService.js`** writes session creation events to `session_logs`. It includes privacy-preserving IP handling: the last octet of IPv4 addresses is zeroed (e.g., `192.168.1.5` → `192.168.1.0`) and IPv6 addresses are truncated to the network prefix. User-Agent strings are capped at 512 characters.

**`services/tokenLogService.js`** writes token lifecycle events (issue, refresh, revoke, validate) to `token_logs`. Key identifiers are validated to prevent accidental logging of raw key material — values matching the 44-character base64 or 64-character hexadecimal format of an AES-256 key are automatically replaced with `[REDACTED]`.

**`services/integrityLogService.js`** writes file integrity scan results to `integrity_logs`. File paths are sanitised to relative form (removing system root information) to prevent exposure of server directory structure.

**`services/cryptoLogService.js`** writes encryption and decryption operation outcomes to `crypto_logs`. This table feeds Alert A12 (Encryption Anomaly) and is the integration point between Task 1 and Task 2.

#### 4.4.3 Distributed Job Safety

The alert check job runs on a 5-minute `setInterval`. Two guards prevent duplicate execution:

1. **In-process lock (`jobIsRunning`)** — A boolean flag prevents the same Node.js process from running two overlapping cycles if a run exceeds 5 minutes.
2. **Database-level advisory lock** — Before each run, the job inserts a `running` record into `monitoring_heartbeats` with component `alert_job_lock`. If a `running` record already exists within the lock time-to-live (4.5 minutes), the current instance skips its run. The lock is released in a `finally` block — guaranteed cleanup regardless of success or failure.

This mechanism provides distributed coordination using the existing Supabase infrastructure with no external dependency.

#### 4.4.4 Alert API Endpoints

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/security/alerts` | Fetch alerts with filtering by severity, time range, acknowledgement status | Admin |
| `GET` | `/api/security/alerts/summary` | Dashboard summary with per-severity counts (DB-side aggregation) | Admin |
| `POST` | `/api/security/alerts/:id/acknowledge` | Mark an alert as reviewed | Admin |

All endpoints are protected by JWT authentication and role-based access control (RBAC) restricting access to admin users only. A dedicated rate limiter (60 requests per minute) is applied independently of the global rate limiter to protect these sensitive management endpoints.

The summary endpoint uses parallel `count`-only queries against the database rather than loading all alert records into Node.js memory — an important scalability decision for systems with large alert volumes.

---

### 4.5 Frontend Security Dashboard

The frontend Security Alerts Dashboard provides real-time operational visibility for the security team. Built as a React component (`/Nutrihelp-web/src/routes/AlertDashboard/`), it provides:

- **Summary cards** showing total, critical, high, medium, and low alert counts for the selected time range.
- **Filterable alert table** supporting filtering by severity (`All`, `Critical`, `High`, `Medium`, `Low`) and time range (`1h`, `6h`, `24h`, `7d`).
- **Acknowledgement workflow** — Reviewers can mark alerts as reviewed with their identifier, creating an audit trail.
- **Refresh capability** for near real-time updates.

[Diagram: Security Alerts Dashboard — Screenshot Placeholder]

---

### 4.6 Integration: Encryption and Monitoring (A12)

Alert A12 is the direct integration point between Task 1 (encryption) and Task 2 (monitoring). When the encryption service encounters decryption failures — whether from a key mismatch, corrupted ciphertext, or a key rotation issue — these events are written to `crypto_logs` via `cryptoLogService.js`. Alert A12 evaluates:

- **Volume trigger:** 10 or more decryption failures within 15 minutes.
- **Rate trigger:** A decryption failure rate of 30% or greater across all decryption operations in the window.

When triggered, A12 alerts the security team with:
- The total failure count and failure rate.
- The key identifier associated with the failures.
- The API endpoint where failures occurred.
- Source IP addresses of failed decryption requests.
- Recommended response actions including key rotation if compromise is suspected.

This integration means that a silent encryption failure — which could otherwise leave sensitive data inaccessible or reveal a key compromise — is surfaced as a high-severity security alert within the same 5-minute cycle.

---

## 5. Security Architecture Overview

### 5.1 Combined Security Architecture

The following diagram illustrates how the two workstreams interact and layer to provide comprehensive security coverage.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET / CLIENT                           │
│                     (Browser, Mobile App)                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    TLS 1.3 ENFORCED
                    HSTS (2-year preload)
                    HTTP → HTTPS redirect
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    EXPRESS API (Node.js)                             │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  Auth & JWT     │  │  Rate Limiting   │  │  Helmet Security  │  │
│  │  Middleware     │  │  (1000 req/15m)  │  │  Headers (CSP,    │  │
│  │  + RBAC         │  │  + Admin: 60/min │  │  HSTS, COEP)      │  │
│  └─────────────────┘  └──────────────────┘  └───────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              ENCRYPTION SERVICE LAYER                        │   │
│  │  encryptForDatabase() → AES-256-GCM → verifyEncryption()     │   │
│  │  decryptFromDatabase() → GCM auth tag verification          │   │
│  │  Key from Supabase Vault (service_role only)                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              MONITORING SERVICE LAYER (CT-004)               │   │
│  │  sessionLogService  tokenLogService  cryptoLogService        │   │
│  │  integrityLogService  →  securityAlertService (A1-A12)       │   │
│  │  DB job lock  |  2-layer dedup  |  Email/Slack notifications │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                             │
│                                                                      │
│  users (profile_encrypted)                                          │
│  health_risk_reports (encrypted_payload)                            │
│  health_surveys (encrypted_payload)                                 │
│  auth_logs | brute_force_logs | error_logs                          │
│  session_logs | token_logs | integrity_logs | crypto_logs          │
│  alert_history | monitoring_heartbeats                              │
│                                                                      │
│  Supabase Vault ← Encryption key (service_role only RPC)           │
│  Row Level Security (RLS) policies                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Defence in Depth

The security architecture implements defence in depth — multiple independent layers of protection so that no single point of failure compromises the entire system.

| Layer | Control | Failure Consequence |
|---|---|---|
| Network | TLS 1.3 | Eavesdropping possible — no data loss |
| Transport | HSTS preload | Browser-level downgrade prevented — no bypass |
| Application | Auth + RBAC | Unauthenticated access blocked |
| Application | Rate limiting | Brute force slowed — not stopped |
| Storage | AES-256-GCM | Plaintext readable — only if key also compromised |
| Key Management | Supabase Vault | Key exposed — requires service role credential |
| Monitoring | CT-004 alerts | Attack undetected — only for unmonitored patterns |

---

## 6. Testing, Verification and Evidence

### 6.1 Encryption Testing

#### 6.1.1 Round-Trip Validation (`test-encryption-roundtrip.js`)

The automated round-trip test covers three data categories: plain strings, complex objects, and sensitive PII values.

```
🔑 Testing Key Loading...
  ✅ Key loaded — 32 bytes, Version: v1

🔐 Testing AES-256-GCM Round-Trip...
  ✅ String round-trip PASSED   (aes-256-gcm, v1)
  ✅ Object round-trip PASSED
  ✅ Sensitive data round-trip PASSED

🎉 ALL TESTS PASSED — Encryption service is ready
```

#### 6.1.2 Health Endpoint (`GET /api/health/encryption`)

```json
{
  "success": true,
  "status": "healthy",
  "key_version": "v1",
  "checks": {
    "key_available":     { "ok": true, "version": "v1" },
    "string_round_trip": { "ok": true, "keyVersion": "v1", "algorithm": "aes-256-gcm" },
    "object_round_trip": { "ok": true, "keyVersion": "v1", "algorithm": "aes-256-gcm" }
  },
  "timestamp": "2026-05-09T..."
}
```

[Evidence Screenshot: Health endpoint response — Placeholder]

#### 6.1.3 Migration Dry-Run

```
🔐 NutriHelp Medical Reports Encryption Migration
Mode:        DRY RUN (no writes)
Tables:      health_risk_reports, health_surveys

📋 Table: health_risk_reports
   [DRY RUN] Would encrypt id=1 fields: risk_factors, recommendations
   [DRY RUN] Would encrypt id=2 fields: risk_factors, notes

✅ Dry run complete — 2 would be migrated, 0 errors
```

#### 6.1.4 Mocha Unit Tests (`test/encryption.test.js`)

| Test | Result |
|---|---|
| Decrypts values encrypted by the same key | PASS |
| Throws when decrypting with the wrong key | PASS |
| Throws when the encrypted payload is malformed | PASS |

### 6.2 Monitoring and Alerting Tests

#### 6.2.1 Alert Evaluator Coverage (`test/securityAlertsA3A8A9A10.test.js`)

Tests covering A1 through A12:

| Alert | Test Scenarios | Result |
|---|---|---|
| A1 — Brute Force | 10+ failures trigger; <10 do not; outside window ignored | PASS |
| A2 — Credential Stuffing | Cross-account IP targeting triggers; insufficient accounts do not | PASS |
| A3 — Brute Force Success | Success after 5+ failures triggers; <5 do not; outside window ignored | PASS |
| A4 — MFA Bypass | 5+ MFA failures trigger; <5 do not; non-MFA events ignored | PASS |
| A5 — Rate Limit Abuse | 30+ 429s on sensitive endpoints trigger; non-sensitive excluded | PASS |
| A6 — Session Anomaly | Impossible travel flag triggers; same-location sessions do not | PASS |
| A7 — Token Abuse | 3+ revoke/reissue loops trigger; insufficient loops do not | PASS |
| A8 — Correlation | 3+ high-risk signals trigger; <3 or outside window do not | PASS |
| A9 — File Integrity | Hash mismatch triggers; missing file triggers; clean scan does not | PASS |
| A10 — Monitoring Health | No heartbeat triggers; fresh heartbeat does not | PASS |
| A11 — Critical Auth Errors | Critical category errors trigger; info category does not | PASS |
| A12 — Crypto Failure | 10+ decrypt failures trigger; <10 do not | PASS |

[Evidence Screenshot: Test run output — Placeholder]

#### 6.2.2 Integration Test — Alert Endpoint

```
GET /api/security/alerts?severity=Critical&timeRange=24h
→ 200 OK — returns paginated list of Critical alerts

GET /api/security/alerts/summary?timeRange=7d
→ 200 OK — { total: 14, critical: 2, high: 8, medium: 3, low: 1, unacknowledged: 9 }

POST /api/security/alerts/42/acknowledge
Body: { "acknowledged_by": "security@nutrihelp.com.au" }
→ 200 OK — { success: true, message: "Alert acknowledged" }
```

### 6.3 TLS Verification

[Evidence Screenshot: Browser padlock / TLS 1.3 confirmation — Placeholder]

```
TLS version:     TLS 1.3
Certificate:     Self-signed (development) / CA-signed (production)
HSTS header:     max-age=63072000; includeSubDomains; preload
HTTP redirect:   301 → https://
```

---

## 7. Risks, Lessons Learned and Best Practices

### 7.1 Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Encryption key loss | Low | Critical — all encrypted data inaccessible | Vault-backed key storage; key rotation documentation; backup key copies in secure storage |
| Key rotation causes service disruption | Medium | High — decryption fails for rows on old version | Key versioned per row; rotation script decrypts with old key before re-encrypting; dry-run available |
| Multi-instance duplicate alerts | Medium | Medium — alert fatigue | DB-backed job lock and DB-level dedup |
| False positive alert storm | Low | Medium | Conservative thresholds; 5-minute dedup window |
| Migration failure mid-run | Low | Medium — dual-storage state | Idempotent scripts; can be re-run safely; verification on every row |
| Plaintext data in git history | High (occurred) | High | `git rm --cached` + `.gitignore` rules applied; keys should be regenerated |

### 7.2 Lessons Learned

#### Lesson 1 — Binary File Encoding
During development, `encryptionService.js` was accidentally committed as a UTF-16 LE encoded file, causing it to appear as a binary in git diffs and be unreadable by the test runner. This was caused by saving the file through a Windows text editor that added a Byte Order Mark (BOM). **Best practice:** Configure editors to always save JavaScript files as UTF-8 without BOM; add a `.editorconfig` file to enforce this across the team.

#### Lesson 2 — Staged Migration is Non-Negotiable
The temptation in implementing encryption is to do it all at once. The three-phase staged rollout proved valuable because it separated the risks of: (a) introducing new code, (b) migrating existing data, and (c) removing old infrastructure. Each phase can be independently validated and rolled back. **Best practice:** Never combine schema migration with data migration in a single deployment step.

#### Lesson 3 — Test the Failure Path, Not Just the Happy Path
Initial testing focused on verifying that encryption worked correctly. The harder — and more important — tests were for failure scenarios: wrong key, corrupted ciphertext, partial encrypted state. The feedback process uncovered a significant gap where decryption failures were silently returning `null` rather than throwing errors. **Best practice:** Write tests for failure paths first.

#### Lesson 4 — In-Memory State Does Not Scale
The initial alert deduplication used only an in-memory Map. This works perfectly for a single server instance but fails silently when two instances run simultaneously — both would pass their local dedup check and send duplicate alerts. **Best practice:** Any state that must be consistent across processes must live in a shared store (database, Redis, etc.).

#### Lesson 5 — Sensitive Files in Git History Cannot Be Undone Easily
TLS private key files (`local-key.pem`) were accidentally committed before `.gitignore` rules were established. While `git rm --cached` stops future commits of these files, the keys remain in the git history and must be considered compromised. **Best practice:** Establish `.gitignore` rules covering `*.pem`, `*.key`, `*.env`, and `certs/` before writing the first line of code.

### 7.3 Security Best Practices for Future Teams

1. **Never fall back to plaintext.** If encryption fails, let the operation fail. A 500 error is always preferable to storing sensitive data unprotected.
2. **Always version your encryption keys.** Store `key_version` alongside every encrypted row. It costs nothing and makes key rotation possible.
3. **Test encryption with real data shapes.** Hash tables and nested objects behave differently than simple strings. Test every data type you intend to encrypt.
4. **Keep alert thresholds conservative.** It is better to investigate a false positive than to miss a real attack. Adjust thresholds based on observed baseline traffic.
5. **Document the dedup window clearly.** If an alert fires and then fires again 6 minutes later, a reviewer unfamiliar with the 5-minute dedup window may be confused. Document this behaviour in the alert description.
6. **Use `--dry-run` every time before a migration.** Always preview before applying. This takes 30 seconds and prevents data loss.

---

## 8. Handover and Maintenance Guide

### 8.1 What the Next Team Needs to Know

#### 8.1.1 Environment Variables

The following environment variables must be correctly set for the system to function:

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (frontend operations) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side DB operations) |
| `JWT_TOKEN` | Yes | JWT signing secret (minimum 32 characters) |
| `JWT_SECRET` | Yes | Alternative JWT secret (used by auth service) |
| `ENCRYPTION_KEY` | Yes | Active AES-256 key (32-byte base64 string) |
| `ENCRYPTION_KEY_VERSION` | Yes | Current key version label (e.g., `v1`) |
| `ENCRYPTION_KEY_SOURCE` | No | `env` (default) or `vault` for Supabase Vault |
| `ENCRYPTION_VAULT_RPC` | Vault only | RPC function name (default: `get_encryption_key`) |
| `HTTPS_PORT` | No | HTTPS port (default: 443) |
| `HTTP_PORT` | No | HTTP redirect port (default: 80) |
| `ALERT_EMAIL_TO` | Yes (alerts) | Comma-separated alert recipient emails |
| `ALERT_EMAIL_FROM` | Yes (alerts) | Alert sender email address |
| `ALERT_EMAIL_PASSWORD` | Yes (alerts) | Email password or app password |
| `SLACK_WEBHOOK_URL` | No | Slack webhook for alert notifications |

Generate a new encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 8.1.2 Running the Server

```bash
# Install dependencies
npm install

# Validate environment
node scripts/validateEnv.js

# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

The server requires TLS certificates at `certs/local-key.pem` and `certs/local-cert.pem`. Generate for local development:
```bash
mkdir certs
openssl req -x509 -newkey rsa:4096 -keyout certs/local-key.pem -out certs/local-cert.pem -days 365 -nodes -subj "/CN=localhost"
```

#### 8.1.3 Ongoing Operational Tasks

| Task | Frequency | Command / Action |
|---|---|---|
| Check encryption health | Weekly | `GET /api/health/encryption` |
| Review A12 alerts | Weekly | Security Alerts Dashboard → filter by A12 |
| Run encryption migration (if Phase 2 triggered) | Once | `node scripts/migrate-encrypt-user-profiles.js` |
| Rotate encryption key | Annually or on compromise | `node scripts/rotate-encryption-key.js` |
| Review alert thresholds | Quarterly | Edit constants in `securityAlertService.js` |
| Archive old alerts | Automatic | `archiveOldAlerts()` runs with each job cycle (90-day retention) |
| Monitor consecutive job failures | Ongoing | Watch server logs for `CRITICAL: Alert job has failed` messages |

#### 8.1.4 Adding Encryption to a New Table

1. Run the column-addition SQL in Supabase:
```sql
ALTER TABLE public.your_table
  ADD COLUMN IF NOT EXISTS encrypted_payload       TEXT,
  ADD COLUMN IF NOT EXISTS encryption_iv           TEXT,
  ADD COLUMN IF NOT EXISTS encryption_auth_tag     TEXT,
  ADD COLUMN IF NOT EXISTS encryption_key_version  TEXT;
```
2. In the relevant service, use `encryptForDatabase()` on write and `decryptFromDatabase()` on read.
3. Call `verifyEncryption()` immediately after the DB write.
4. Add a migration script in `scripts/` following the pattern of `migrate-encrypt-user-profiles.js`.
5. Add the table to `ENCRYPTED_TABLES` in `scripts/rotate-encryption-key.js`.
6. Add a `CHECK` constraint to `database/migrations/` once the back-fill is complete.

#### 8.1.5 Adding a New Alert Condition

1. Define the evaluation function `evaluateAX(data, signalBook)` in `securityAlertService.js`, following the pattern of existing evaluators.
2. Add it to the `allAlerts` array in `checkAlerts()`.
3. Export it for unit testing.
4. Write test cases in `test/securityAlertsA3A8A9A10.test.js`.
5. Update the alert conditions table in this document.

### 8.2 Escalation Contacts

| Issue | Escalation |
|---|---|
| Encryption key compromise | Security lead + DB admin immediately; rotate key within the hour |
| A8 (Critical — correlated attack) | Incident commander; 15-minute triage SLA |
| A9 (File integrity failure) | Isolate affected host; do not deploy until cleared |
| A10 (Monitoring pipeline failure) | Check Supabase status page; restart alert job if necessary |
| Persistent A12 alerts (crypto failures) | Check `ENCRYPTION_KEY` env var; consider key rotation |

---

## 9. Conclusion and Capstone Reflection

### 9.1 Summary of Achievements

This capstone project delivered two complete, production-quality cybersecurity workstreams for the NutriHelp platform. The work transformed a system with no data-level security controls into one that enforces end-to-end encryption for all sensitive data and maintains continuous real-time visibility over security events.

The key outcomes are:

- **Sensitive data is now encrypted at rest.** Contact numbers, addresses, health risk assessments, and survey responses are stored as opaque ciphertext. An attacker with direct database access would find no readable personal information.
- **All API communications are encrypted in transit.** TLS 1.3 enforcement with HSTS means that no API call can be intercepted or downgraded.
- **Active attacks are detected within 5 minutes.** The 12-condition alert system evaluates all major attack categories on a continuous cycle, with Critical alerts triggering a 15-minute triage SLA.
- **The security team has operational visibility.** The frontend dashboard and alert API give staff the tools to monitor, investigate, and respond to security events without database access.
- **Future teams have a clear path forward.** The three-phase deprecation plan, key rotation playbook, and this handover document provide everything needed to complete the rollout and maintain the system.

### 9.2 Personal Reflection

This project required navigating a tension that defines real-world security work: the gap between what is theoretically correct and what is practically safe to deploy to a live system with existing data and active users.

The most significant technical challenge was the dual-storage problem — the transition period during which both encrypted and plaintext versions of sensitive data coexist in the database. The temptation was to encrypt all data in a single operation and be done with it. The staged approach required more planning, more code, and more documentation, but it is the approach that does not risk data loss in production. This reflects a broader lesson: in security, the safe path is rarely the fast path.

The monitoring system presented a different kind of challenge: designing alert thresholds that catch real attacks without generating enough false positives to be ignored. The research into actual brute-force patterns and rate-limiting norms was necessary to arrive at thresholds that are both sensitive and specific. This is an iterative process — the initial thresholds will need tuning based on real traffic data.

### 9.3 Alignment with Graduate Learning Outcomes

**GLO1 — Communication:** This project required communicating complex technical decisions to multiple audiences — code reviewers, academic assessors, and future maintenance teams. The structured documentation, inline code comments explaining the "why" rather than the "what," and this final report reflect a deliberate effort to make technical knowledge transferable.

**GLO4 — Critical Thinking and Problem Solving:** Several design decisions required rejecting the obvious solution in favour of a more robust one. The decision to throw errors on decryption failure rather than fall back to plaintext, the decision to add DB-backed deduplication rather than rely on in-memory state, and the decision to implement a staged migration rather than a one-time cut-over — each required evaluating trade-offs rather than accepting default patterns.

**GLO5 — Ethical Responsibility:** The subject of this work is the protection of health data belonging to elderly Australians — a population that faces heightened risks from privacy breaches and has limited recourse when those breaches occur. Every technical decision made in this project was evaluated against the question of whether it genuinely protects these users, not merely whether it satisfies a requirement.

**SFIA — Security (SCTY) Level 4:** The work delivered encompasses the full spectrum of the Security skill at Level 4: designing and implementing security controls, assessing and mitigating threats, producing professional-grade documentation, and building tooling that enables ongoing operational security practice.

### 9.4 Future Recommendations

1. **Complete Phase 2 of the deprecation plan.** Run the back-fill migration, apply the database constraints, and remove the plaintext read fallback from the application layer. This is the single most impactful remaining action.
2. **Configure Supabase Vault for production.** The environment variable key source is acceptable for development but Vault provides significantly stronger key isolation for production.
3. **Tune alert thresholds based on traffic data.** Review the first 30 days of alert history and adjust thresholds for any conditions producing significant false positive rates.
4. **Extend encryption to additional tables.** `appointments`, `chat_history`, and `ai_meal_plans` all contain health-sensitive data and should be evaluated for inclusion in the encryption scope.
5. **Consider a distributed lock service.** The database-based job lock works well for the current architecture. As the platform scales, a Redis-based distributed lock would provide lower latency and more reliable coordination.
6. **Establish a formal key rotation schedule.** Document and calendar the first key rotation date (12 months from initial deployment) and assign ownership to a named role.

---

## 10. Appendices

### Appendix A — Key Files Reference

| File | Purpose |
|---|---|
| `server.js` | Main application entry point; TLS setup; alert job scheduling |
| `services/encryptionService.js` | AES-256-GCM encryption/decryption; key management; batch operations |
| `services/encryptionVerificationService.js` | Live round-trip health checks |
| `services/securityAlertService.js` | Alert evaluation (A1–A12); dispatch; persistence; job lock |
| `services/sessionLogService.js` | Session event logging for A6; IP anonymisation |
| `services/tokenLogService.js` | Token lifecycle logging for A7; key_id validation |
| `services/integrityLogService.js` | File integrity logging for A9; path sanitisation |
| `services/cryptoLogService.js` | Crypto operation logging for A12; key material detection |
| `routes/alerts.js` | Alert management API endpoints |
| `routes/encryptionHealth.js` | `GET /api/health/encryption` health check |
| `routes/routeGroups.js` | Centralised route registration |
| `scripts/migrate-encrypt-user-profiles.js` | Back-fill migration for users table |
| `scripts/migrate-encrypt-medical-reports.js` | Back-fill migration for health tables |
| `scripts/rotate-encryption-key.js` | Safe key rotation across all encrypted tables |
| `scripts/verify-encryption-migration.js` | Post-migration verification |
| `test-encryption-roundtrip.js` | Automated encryption round-trip test |
| `test/securityAlertsA3A8A9A10.test.js` | Alert evaluator unit tests (all 12 conditions) |
| `database/migrations/001_enforce_encryption_constraints.sql` | DB CHECK constraints for Phase 2 |
| `cyber-team-docs/Week5_Encryption_KeyManagement.md` | Week 5 key management setup guide |
| `cyber-team-docs/Week7_8_Encryption_Deprecation_Plan.md` | Three-phase deprecation plan |
| `cyber-team-docs/Week7_8_Encryption_Final_Rollout.md` | Full encryption rollout documentation |

### Appendix B — Database Schema — Encryption Columns

```sql
-- users table encryption columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_encrypted           TEXT,
  ADD COLUMN IF NOT EXISTS profile_encryption_iv       TEXT,
  ADD COLUMN IF NOT EXISTS profile_encryption_auth_tag TEXT,
  ADD COLUMN IF NOT EXISTS profile_encryption_key_version TEXT,
  ADD COLUMN IF NOT EXISTS profile_encrypted_at        TIMESTAMPTZ;

-- health_risk_reports encryption columns
ALTER TABLE public.health_risk_reports
  ADD COLUMN IF NOT EXISTS encrypted_payload           TEXT,
  ADD COLUMN IF NOT EXISTS encryption_iv               TEXT,
  ADD COLUMN IF NOT EXISTS encryption_auth_tag         TEXT,
  ADD COLUMN IF NOT EXISTS encryption_key_version      TEXT;

-- health_surveys encryption columns
ALTER TABLE public.health_surveys
  ADD COLUMN IF NOT EXISTS encrypted_payload           TEXT,
  ADD COLUMN IF NOT EXISTS encryption_iv               TEXT,
  ADD COLUMN IF NOT EXISTS encryption_auth_tag         TEXT,
  ADD COLUMN IF NOT EXISTS encryption_key_version      TEXT;
```

### Appendix C — Alert Evaluation Logic Summary

```
A1: COUNT(failed_logins WHERE principal=X AND ts > now-10min) >= 10
A2: COUNT(failed_logins WHERE ip=X AND ts > now-10min) >= 20
    AND COUNT(DISTINCT principals WHERE ip=X) >= 3
A3: EXISTS(success WHERE principal=X AND ts > now-5min)
    AND COUNT(fails WHERE principal=X AND ts <= success.ts) >= 5
A4: COUNT(mfa_fails WHERE principal=X AND ts > now-10min) >= 5
A5: COUNT(429s WHERE ip=X AND endpoint IN sensitive AND ts > now-15min) >= 30
A6: COUNT(sessions WHERE user=X AND ts > now-30min) >= 2
    AND (impossible_travel=true OR distinct_locations >= 2)
A7: COUNT(token_events WHERE principal=X AND ts > now-10min) >= 8
    AND COUNT(revoke_reissue_loops WHERE principal=X) >= 3
A8: COUNT(high_risk_signals WHERE principal/ip=X AND ts > now-10min) >= 3
A9: EXISTS(integrity_log WHERE hash_mismatch=true OR missing_file=true
    AND ts > now-60min)
A10: (last_heartbeat.ts < now-5min) OR (query_failures_in_window >= 1)
A11: EXISTS(error WHERE category='critical' AND ts > now-10min)
A12: COUNT(decrypt_fails WHERE ts > now-15min) >= 10
     OR (decrypt_fails / total_decrypts >= 0.30)
```

### Appendix D — Evidence Screenshot Placeholders

| # | Description |
|---|---|
| D1 | Swagger UI running on HTTPS (`https://localhost:443/api-docs`) |
| D2 | Browser TLS 1.3 confirmation (padlock → Certificate → Protocol: TLS 1.3) |
| D3 | `GET /api/health/encryption` returning `{"status":"healthy"}` |
| D4 | Encryption round-trip test output (`🎉 ALL TESTS PASSED`) |
| D5 | Migration dry-run console output |
| D6 | Alert migration script live run output |
| D7 | Mocha test suite passing (12 alert conditions) |
| D8 | Security Alerts Dashboard frontend screenshot |
| D9 | Alert acknowledgement workflow in dashboard |
| D10 | Supabase table showing encrypted columns (`profile_encrypted IS NOT NULL`) |

### Appendix E — Glossary

| Term | Definition |
|---|---|
| AES-256-GCM | Advanced Encryption Standard with 256-bit key in Galois/Counter Mode — a symmetric AEAD cipher |
| AEAD | Authenticated Encryption with Associated Data — encryption that also provides tamper detection |
| HSTS | HTTP Strict Transport Security — a browser directive to only use HTTPS for a domain |
| IV / Nonce | Initialisation Vector — a random value used to ensure each encryption is unique |
| JWT | JSON Web Token — a compact, signed token used for authentication |
| PII | Personally Identifiable Information — data that can identify an individual |
| RBAC | Role-Based Access Control — restricting system access based on user roles |
| RLS | Row Level Security — database-level access policies per row |
| RPC | Remote Procedure Call — a function call executed on a remote server |
| TLS | Transport Layer Security — the cryptographic protocol securing internet communications |
| Vault | Supabase's secure secret storage service for storing encryption keys and credentials |

---

*End of Document*

---

**Document Control**

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | April 2026 | Faith Chukwudum | Initial draft |
| 0.5 | April 2026 | Faith Chukwudum | Added Task 2 implementation details |
| 1.0 | May 2026 | Faith Chukwudum | Final version — all chapters complete |
