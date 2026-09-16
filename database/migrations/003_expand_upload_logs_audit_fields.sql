-- CS-12: Improve Upload Audit Logging
-- Expands upload_logs from a bare (id, created_at, user_id) table into a real
-- audit trail: what was uploaded, whether it succeeded, and why it failed if not.

ALTER TABLE public.upload_logs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS stored_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS error_reason TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Constrain status to a known set of outcomes so the audit trail stays queryable.
ALTER TABLE public.upload_logs
  DROP CONSTRAINT IF EXISTS upload_logs_status_check;
ALTER TABLE public.upload_logs
  ADD CONSTRAINT upload_logs_status_check
  CHECK (status IN ('success', 'rejected_type', 'rejected_size', 'unauthenticated', 'error'));

-- Speed up "show me this user's recent upload activity" and "show me recent failures" queries.
CREATE INDEX IF NOT EXISTS idx_upload_logs_user_id_created_at
  ON public.upload_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_logs_status
  ON public.upload_logs (status)
  WHERE status <> 'success';