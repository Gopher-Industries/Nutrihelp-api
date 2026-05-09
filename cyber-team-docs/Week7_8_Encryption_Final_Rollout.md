# Week 7 & 8 — AES-256 Encryption at Rest: Final Rollout & Hardening
## CT Task 1 | NutriHelp Capstone Project

---

## Architecture Overview

NutriHelp's encryption-at-rest system uses **AES-256-GCM** (Authenticated Encryption with Associated Data) to protect sensitive personal and health data stored in Supabase (PostgreSQL).

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / TLS 1.3 (enforced)
┌────────────────────────────▼────────────────────────────────────┐
│                       EXPRESS API (Node.js)                     │
│                                                                 │
│  Route → Controller → Service Layer                             │
│                           │                                     │
│              ┌────────────▼────────────┐                        │
│              │   encryptionService.js   │                        │
│              │  AES-256-GCM + GCM auth  │                        │
│              │  Key loaded from Vault   │                        │
│              └────────────┬────────────┘                        │
│                           │                                     │
│              ┌────────────▼────────────┐                        │
│              │  encryptForDatabase()    │ ← encrypt on write     │
│              │  decryptFromDatabase()   │ ← decrypt on read      │
│              │  verifyEncryption()      │ ← post-write check     │
│              │  encryptBatch()          │ ← migration helper     │
│              └────────────┬────────────┘                        │
└───────────────────────────│─────────────────────────────────────┘
                             │ service-role key only
┌────────────────────────────▼────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                         │
│                                                                 │
│  users                   health_risk_reports   health_surveys   │
│  ├── profile_encrypted   ├── encrypted_payload ├── encrypted_.. │
│  ├── profile_enc_iv      ├── encryption_iv      │               │
│  └── profile_enc_tag     └── encryption_tag     │               │
│                                                 │               │
│  vault.decrypted_secrets ← AES key stored here  │               │
└─────────────────────────────────────────────────────────────────┘
```

### Key design decisions

| Decision | Rationale |
|---|---|
| AES-256-GCM | Provides both confidentiality and integrity (auth tag detects tampering) |
| Per-record IV | A fresh 96-bit random nonce per encrypt call prevents IV reuse attacks |
| Envelope payload `{v,t,d}` | Versioned wrapper allows future format changes without schema changes |
| Supabase Vault RPC | Key never touches environment variables in production; service-role-only RPC |
| Backend-only decrypt | `assertBackendRuntime()` throws if called from a browser context |
| Post-write verification | `verifyEncryption()` decrypts immediately after encrypt to catch key mismatches early |

---

## Security Controls Summary

### Transport Security (TLS 1.3)
- HTTPS enforced on all API endpoints via Node.js `https.createServer`
- `minVersion` and `maxVersion` both set to `TLSv1.3` — no downgrade path
- HTTP requests permanently redirected (301) to HTTPS
- HSTS header: `max-age=63072000; includeSubDomains; preload`

### Encryption at Rest (AES-256-GCM)
- Algorithm: `aes-256-gcm`, IV: 96-bit random, Auth tag: 128-bit
- Key source: Supabase Vault RPC (preferred) or `ENCRYPTION_KEY` env var (fallback)
- Key versioning via `ENCRYPTION_KEY_VERSION` persisted alongside each encrypted row
- Key rotation supported via `scripts/rotate-encryption-key.js`

### Access Controls
- Service-role key required for all encryption key retrieval and bulk migration operations
- Anon/authenticated roles cannot execute the `get_encryption_key` Vault RPC
- All decryption logic is server-side only

### Audit & Observability
- `logEncryptionFailure()` writes structured JSON to stderr on any crypto error
- Feeds Alert A12 (crypto failure pattern detection) in the CT-004 monitoring system
- `/api/health/encryption` provides real-time round-trip health verification

---

## Tables Covered by Encryption

| Table | Sensitive Fields | Encrypted Column | Status |
|---|---|---|---|
| `users` | `contact_number`, `address`, `name`, `first_name`, `last_name` | `profile_encrypted` | ✅ Week 6 |
| `health_risk_reports` | `risk_factors`, `recommendations`, `notes`, `diagnosis_data` | `encrypted_payload` | ✅ Week 7/8 |
| `health_surveys` | `responses`, `notes`, `health_data` | `encrypted_payload` | ✅ Week 7/8 |

---

## Required Database Schema Changes

Run the following in Supabase SQL editor before deploying Week 7/8 migration scripts:

```sql
-- health_risk_reports: add encryption columns
ALTER TABLE health_risk_reports
  ADD COLUMN IF NOT EXISTS encrypted_payload        TEXT,
  ADD COLUMN IF NOT EXISTS encryption_iv            TEXT,
  ADD COLUMN IF NOT EXISTS encryption_auth_tag      TEXT,
  ADD COLUMN IF NOT EXISTS encryption_key_version   TEXT;

CREATE INDEX IF NOT EXISTS idx_hrr_encrypted
  ON health_risk_reports(encryption_key_version)
  WHERE encrypted_payload IS NOT NULL;

-- health_surveys: add encryption columns
ALTER TABLE health_surveys
  ADD COLUMN IF NOT EXISTS encrypted_payload        TEXT,
  ADD COLUMN IF NOT EXISTS encryption_iv            TEXT,
  ADD COLUMN IF NOT EXISTS encryption_auth_tag      TEXT,
  ADD COLUMN IF NOT EXISTS encryption_key_version   TEXT;

CREATE INDEX IF NOT EXISTS idx_hs_encrypted
  ON health_surveys(encryption_key_version)
  WHERE encrypted_payload IS NOT NULL;
```

---

## Migration Guide

### Step 1 — Verify environment
```bash
node scripts/validateEnv.js
# Confirms SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY are set
```

### Step 2 — Dry-run migration
```bash
node scripts/migrate-encrypt-medical-reports.js --dry-run
# Shows which rows would be encrypted without writing anything
```

### Step 3 — Apply migration
```bash
node scripts/migrate-encrypt-medical-reports.js
# Encrypts all unencrypted rows, verifies each write, skips already-encrypted rows
```

### Step 4 — Verify encryption health
```bash
curl https://localhost:<PORT>/api/health/encryption
# Expected: {"status":"healthy","checks":{"key_available":{"ok":true},...}}
```

### Step 5 — Quick round-trip test
```bash
node -e "
require('dotenv').config();
const { encrypt, decrypt } = require('./services/encryptionService');
(async () => {
  const original = { test: 'NutriHelp Week 7/8', sensitive: '+61400000000' };
  const enc = await encrypt(original);
  const dec = await decrypt(enc.encrypted, enc.iv, enc.authTag);
  console.log(JSON.stringify(dec) === JSON.stringify(original) ? '✅ PASS' : '❌ FAIL');
})();
"
```

---

## Key Rotation Procedure

### When to rotate
- Scheduled: every 12 months or per organisational policy
- Unscheduled: on suspected key compromise, staff departure, or security incident

### Step-by-step

```bash
# 1. Generate the new key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Save output as NEW_KEY

# 2. Store in Supabase Vault under a versioned secret name
#    (or set ENCRYPTION_KEY_V2=<NEW_KEY> in .env for env-based setups)

# 3. Dry-run rotation to preview scope
ENCRYPTION_KEY=<OLD_KEY> \
ENCRYPTION_KEY_V2=<NEW_KEY> \
ENCRYPTION_KEY_VERSION=v2 \
  node scripts/rotate-encryption-key.js --dry-run

# 4. Apply rotation
ENCRYPTION_KEY=<OLD_KEY> \
ENCRYPTION_KEY_V2=<NEW_KEY> \
ENCRYPTION_KEY_VERSION=v2 \
  node scripts/rotate-encryption-key.js

# 5. Update .env — swap ENCRYPTION_KEY to the new value, remove ENCRYPTION_KEY_V2
#    Update Vault RPC to return the new key version

# 6. Verify health endpoint
curl https://localhost:<PORT>/api/health/encryption

# 7. Revoke old key from Vault
```

---

## Staged Deprecation Plan Summary

See `Week7_8_Encryption_Deprecation_Plan.md` for full detail.

| Phase | Description | Trigger |
|---|---|---|
| 1 — Dual-Write | New writes go to encrypted columns; plaintext columns nulled on write; legacy rows use plaintext fallback on read | Current (active) |
| 2 — Enforcement | Back-fill migration complete; DB check constraints added; plaintext fallback removed from code | Phase 1 exit criteria met |
| 3 — Column Drop | Plaintext columns removed from schema; API contracts updated | Phase 2 stable for 1 sprint |

---

## Maintenance Guide — Next Trimester Team

### Ongoing tasks

| Task | Frequency | Owner |
|---|---|---|
| Check `/api/health/encryption` status | Weekly | Cyber team |
| Review A12 alert history for crypto failures | Weekly | Cyber team |
| Key rotation | Annually or on compromise | Cyber lead + DB admin |
| Phase 2 migration (back-fill) | Once Phase 1 criteria met | Backend + Cyber |
| Phase 3 column drop | Once Phase 2 criteria met | Backend + DB admin |

### Adding encryption to a new table

1. Add `encrypted_payload`, `encryption_iv`, `encryption_auth_tag`, `encryption_key_version` columns via Supabase migration SQL.
2. Add a table config block to `scripts/migrate-encrypt-medical-reports.js` (or create a new migration script).
3. Add the table to `ENCRYPTED_TABLES` in `scripts/rotate-encryption-key.js`.
4. Use `encryptForDatabase()` on write and `decryptFromDatabase()` on read in the relevant service.
5. Call `verifyEncryption()` immediately after the DB write.
6. Never catch encryption errors silently — let them propagate so the caller returns a 500 rather than storing plaintext.

### Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `ENCRYPTION_KEY` | Yes | Active AES-256 key (base64 or hex, 32 bytes) |
| `ENCRYPTION_KEY_V2` | Rotation only | New key during rotation window |
| `ENCRYPTION_KEY_VERSION` | Yes | Current key version tag (e.g. `v1`) |
| `ENCRYPTION_KEY_SOURCE` | No | `env` (default) or `vault` |
| `ENCRYPTION_KEY_ENV_NAME` | No | Override env var name for the key |
| `ENCRYPTION_VAULT_RPC` | Vault only | Supabase RPC name (default: `get_encryption_key`) |

---

## Success Criteria Checklist — Full Task 1

### Foundation (Week 5)
- [x] `encryptionService.js` implemented with AES-256-GCM
- [x] Supabase Vault RPC integration documented and tested
- [x] Round-trip test suite passing

### Core Tables (Week 6)
- [x] `users` table: `contact_number` and `address` encrypted at rest
- [x] Encryption mandatory on write — no plaintext fallback on failure
- [x] Decryption throws on failure — no silent plaintext serve
- [x] `userProfileService.js` integrated with `encryptForDatabase`/`decryptFromDatabase`

### Final Rollout (Week 7/8)
- [x] `health_risk_reports` migration script created (idempotent, dry-run, verified)
- [x] `health_surveys` migration script created
- [x] `encryptionService.js` enhanced: batch helpers, post-write verification, failure logging
- [x] `encryptionVerificationService.js` created
- [x] `/api/health/encryption` endpoint live
- [x] `rotate-encryption-key.js` script created (idempotent, dry-run, per-table support)
- [x] Staged deprecation plan documented (3 phases)
- [x] All documentation moved to `cyber-team-docs/`

---

## Capstone Reflection

### GLO1 — Communication
The encryption system was designed with clear contracts between layers (service, model, route) and all sensitive operations are documented with JSDoc. The deprecation plan is written for a handover audience — a team with no prior context can follow it.

### GLO4 — Critical Thinking
The decision to **throw on decryption failure** rather than fall back to plaintext required pushing back on the existing "safe" fallback pattern. Serving stale plaintext on a key mismatch is a worse outcome than a 500 error — it silently masks a real security failure.

### GLO5 — Ethical Responsibility
Encrypting health data (medical reports, surveys) directly fulfils obligations under the Australian Privacy Act and aligns with health-data sensitivity classifications. The staged deprecation plan ensures no plaintext is lost during transition.

### SFIA — Security (SCTY) Level 4
Implemented and documented a full encryption-at-rest system covering: key management, algorithm selection, key rotation, migration tooling, health monitoring, and a multi-phase deprecation strategy — all within a production Node.js/Supabase stack.
