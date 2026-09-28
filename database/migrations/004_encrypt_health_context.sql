-- =============================================================================
-- Migration 004: Add encrypted storage for sensitive health context
-- CS-17 – Sensitive Health Record Encryption Expansion
--
-- user_preference_states.health_context contains sensitive health information,
-- including allergies, chronic conditions and medications.
--
-- Existing plaintext rows remain readable until the back-fill migration runs.
-- New encrypted rows must not retain the plaintext health_context alongside
-- the encrypted payload.
-- =============================================================================

ALTER TABLE public.user_preference_states
  ADD COLUMN IF NOT EXISTS health_context_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS health_context_encryption_iv TEXT,
  ADD COLUMN IF NOT EXISTS health_context_encryption_auth_tag TEXT,
  ADD COLUMN IF NOT EXISTS health_context_encryption_key_version TEXT,
  ADD COLUMN IF NOT EXISTS health_context_encrypted_at TIMESTAMPTZ;

-- Encrypted rows deliberately clear the legacy plaintext column.
ALTER TABLE public.user_preference_states
  ALTER COLUMN health_context DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_preference_states_health_context_encrypted
  ON public.user_preference_states (health_context_encrypted)
  WHERE health_context_encrypted IS NOT NULL;

-- Recreate the constraint so rerunning this migration also applies the current,
-- stricter definition.
ALTER TABLE public.user_preference_states
  DROP CONSTRAINT IF EXISTS chk_health_context_encrypted;

ALTER TABLE public.user_preference_states
  ADD CONSTRAINT chk_health_context_encrypted
  CHECK (
    (
      health_context_encrypted IS NULL
      AND health_context_encryption_iv IS NULL
      AND health_context_encryption_auth_tag IS NULL
      AND health_context_encryption_key_version IS NULL
      AND health_context_encrypted_at IS NULL
    )
    OR
    (
      health_context_encrypted IS NOT NULL
      AND health_context_encryption_iv IS NOT NULL
      AND health_context_encryption_auth_tag IS NOT NULL
      AND health_context_encryption_key_version IS NOT NULL
      AND health_context_encrypted_at IS NOT NULL
      AND health_context IS NULL
    )
  );
