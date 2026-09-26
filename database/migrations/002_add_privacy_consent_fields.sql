-- CS-1: Privacy Policy & Consent Flow
-- Adds an auditable record of privacy-policy consent to each user.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT;