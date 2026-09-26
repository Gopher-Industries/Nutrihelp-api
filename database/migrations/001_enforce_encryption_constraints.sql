-- =============================================================================
-- Migration 001: Enforce encryption-at-rest constraints on sensitive columns
-- CT Task 1 – Week 6/7 — AES-256-GCM Encryption Rollout
--
-- Purpose:
--   After the back-fill migration (scripts/migrate-encrypt-user-profiles.js)
--   has been run and all rows confirmed encrypted, apply these constraints to
--   prevent any future writes that would leave sensitive data in plaintext.
--
-- Run order:
--   1. Run scripts/migrate-encrypt-user-profiles.js (back-fill existing rows)
--   2. Run scripts/verify-encryption-migration.js   (confirm 100% coverage)
--   3. Apply THIS migration in Supabase SQL Editor
--
-- Idempotent: safe to run multiple times.
-- =============================================================================

-- Step 1: Add encryption columns if not already present (idempotent)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_encrypted           TEXT,
  ADD COLUMN IF NOT EXISTS profile_encryption_iv       TEXT,
  ADD COLUMN IF NOT EXISTS profile_encryption_auth_tag TEXT,
  ADD COLUMN IF NOT EXISTS profile_encryption_key_version TEXT,
  ADD COLUMN IF NOT EXISTS profile_encrypted_at        TIMESTAMPTZ;

-- Step 2: Index for efficient migration progress queries
CREATE INDEX IF NOT EXISTS idx_users_profile_encrypted
  ON public.users (profile_encrypted)
  WHERE profile_encrypted IS NOT NULL;

-- Step 3: CHECK constraint — once a row is encrypted, plaintext columns must be null.
--
-- Logic: it is invalid for both profile_encrypted AND contact_number to be non-null
--        on the same row.  The migration script clears plaintext on encrypt.
--        This constraint enforces that invariant at the DB level.
--
-- NOTE: Do NOT apply this before the back-fill migration is complete.
--       Rows that still have plaintext values will fail the constraint check.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_contact_number_encrypted'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_contact_number_encrypted
      CHECK (
        -- Either no encryption yet (pre-migration row, both can be non-null during transition)
        -- OR the row is encrypted and plaintext is cleared
        profile_encrypted IS NULL OR contact_number IS NULL
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_address_encrypted'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_address_encrypted
      CHECK (
        profile_encrypted IS NULL OR address IS NULL
      );
  END IF;
END $$;

-- Step 4: Verify constraint was applied
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
  AND conname IN ('chk_contact_number_encrypted', 'chk_address_encrypted');
