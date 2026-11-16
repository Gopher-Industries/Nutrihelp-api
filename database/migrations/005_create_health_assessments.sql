-- =============================================================================
-- Migration 005: AI Health Assessment storage (FE-04)
--
-- Stores one row per completed assessment. The answers and full result are
-- sensitive health information, so in line with CS-17 they are stored only as
-- an AES-256-GCM encrypted payload (services/encryptionService.js). Plaintext
-- columns are limited to what the history list and trend chart need and hold
-- no raw measurements or answers.
--
-- The API reads and writes with the service-role key and always scopes queries
-- by user_id. RLS is enabled with no anon/authenticated policies, so the table
-- cannot be read directly with the public anon key.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.health_assessments (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 BIGINT        NOT NULL,
  overall_score           SMALLINT      NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  wellness_band           TEXT          NOT NULL
                            CHECK (wellness_band IN ('excellent', 'good', 'fair', 'attention', 'priority')),
  risk_level              TEXT          NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high')),
  ai_model_used           BOOLEAN       NOT NULL DEFAULT FALSE,
  engine_version          TEXT          NOT NULL,
  encrypted_payload       TEXT          NOT NULL,
  encryption_iv           TEXT          NOT NULL,
  encryption_auth_tag     TEXT          NOT NULL,
  encryption_key_version  TEXT          NOT NULL,
  encrypted_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- History and "latest" queries: newest first for one user.
CREATE INDEX IF NOT EXISTS idx_health_assessments_user_created
  ON public.health_assessments (user_id, created_at DESC);

-- Remove a user's assessments when the account is deleted.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_health_assessments_user'
  ) THEN
    ALTER TABLE public.health_assessments
      ADD CONSTRAINT fk_health_assessments_user
      FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.health_assessments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.health_assessments IS
  'FE-04 AI Health Assessment results. Answers and results are encrypted at rest (CS-17).';
