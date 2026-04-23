-- Create brute_force_logs table
CREATE TABLE IF NOT EXISTS public.brute_force_logs (
  id BIGSERIAL PRIMARY KEY,
  email TEXT,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create security_events table
CREATE TABLE IF NOT EXISTS public.security_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  user_id UUID,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  resource TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basic indexes for performance
CREATE INDEX IF NOT EXISTS brute_force_logs_created_at_idx ON public.brute_force_logs (created_at);
CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON public.security_events (created_at);