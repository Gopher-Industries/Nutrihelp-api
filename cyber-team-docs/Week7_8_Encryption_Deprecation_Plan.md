# Staged Plaintext Deprecation Plan
## CT Task 1 – AES-256 Encryption at Rest

---

## Purpose

This document defines the three-phase strategy for safely retiring plaintext (and legacy-encrypted) sensitive columns from the NutriHelp database while maintaining zero downtime and full data integrity throughout.

---

## Phase 1 — Dual-Write (Current State)

**Status:** Active on `feature/task1-encryption-core-tables`

### What happens
- All **writes** produce an AES-256-GCM encrypted blob stored in the `*_encrypted`, `*_encryption_iv`, `*_encryption_auth_tag`, and `*_encryption_key_version` columns.
- Plaintext (or legacy-encrypted) columns (`contact_number`, `address`, etc.) are **nulled out** on every successful write so that new rows never hold dual copies.
- All **reads** use `decryptFromDatabase()` exclusively when an encrypted payload exists. If no payload exists (pre-migration rows), the legacy column value is returned as a fallback.

### Goal
Validate that the encryption pipeline is stable in production before removing the legacy columns from the schema.

### Exit criteria
- [ ] `/api/health/encryption` returns `healthy` for ≥ 7 consecutive days.
- [ ] All new writes confirmed to have `encrypted_payload IS NOT NULL` in affected tables.
- [ ] No decryption failures in application logs (grep A12 alert history).

---

## Phase 2 — Migration & Enforcement

**Trigger:** Exit criteria of Phase 1 met.

### What happens
1. Run `scripts/migrate-encrypt-medical-reports.js` (and equivalent for any remaining tables) to back-fill encryption on all pre-Phase-1 rows.
2. Run `scripts/validate-encryption-coverage.js` (to be created by maintenance team) to confirm 100% coverage.
3. Add a **DB-level check constraint** to prevent `encrypted_payload IS NULL` on rows where sensitive fields would otherwise be stored:
   ```sql
   ALTER TABLE health_risk_reports
     ADD CONSTRAINT chk_payload_encrypted
     CHECK (encrypted_payload IS NOT NULL);
   ```
4. Remove the plaintext-fallback read path from `userProfileService.js` and any other service that still contains it.

### Goal
Enforce encryption at both application and database levels. All reads must go through `decryptFromDatabase()` with no plaintext fallback.

### Exit criteria
- [ ] 100% of rows in sensitive tables have `encrypted_payload IS NOT NULL`.
- [ ] DB check constraints active on all sensitive tables.
- [ ] Plaintext fallback code removed and PR reviewed.
- [ ] No regression in `/api/health/encryption` or auth flows.

---

## Phase 3 — Column Drop

**Trigger:** Exit criteria of Phase 2 met AND at least one full sprint of stable operation.

### What happens
1. Create a Supabase migration to drop the now-unused plaintext columns:
   ```sql
   -- users table
   ALTER TABLE users
     DROP COLUMN IF EXISTS contact_number,
     DROP COLUMN IF EXISTS address;

   -- health_risk_reports
   ALTER TABLE health_risk_reports
     DROP COLUMN IF EXISTS risk_factors,
     DROP COLUMN IF EXISTS recommendations,
     DROP COLUMN IF EXISTS notes,
     DROP COLUMN IF EXISTS diagnosis_data;

   -- health_surveys
   ALTER TABLE health_surveys
     DROP COLUMN IF EXISTS responses,
     DROP COLUMN IF EXISTS notes,
     DROP COLUMN IF EXISTS health_data;
   ```
2. Remove any remaining references to dropped columns from ORM queries, `SELECT *` shapes, and API contracts.
3. Update API documentation (Swagger) to reflect the new schema.
4. Archive this document in the project wiki as a completed deliverable.

### Goal
Eliminate any residual surface area for plaintext PII exposure. The database schema at this point only contains opaque ciphertext for sensitive fields.

### Exit criteria
- [ ] Migration applied to staging and verified.
- [ ] All automated tests pass after column removal.
- [ ] Migration applied to production.
- [ ] API documentation updated.

---

## Rollback Procedure (All Phases)

If any phase introduces a regression:

1. **Do not re-add plaintext data to dropped columns** — this would be a new incident.
2. Revert the application code to the previous commit.
3. If a DB migration was applied, use Supabase's point-in-time recovery or a pre-migration snapshot.
4. File an incident report before re-attempting the phase.

---

## Responsible Team

| Role | Responsibility |
|---|---|
| Cyber Security Lead | Approve phase transitions, review check constraints |
| Backend Lead | Code review for fallback removal and column drop migration |
| QA | Run full regression suite before each phase transition |
| DevOps / DB Admin | Apply Supabase migrations, validate backups |
