-- Alert history persistence table for Security Alerts dashboard
-- Run in Supabase SQL Editor once

CREATE TABLE IF NOT EXISTS public.alert_history (
  id BIGSERIAL PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  count INTEGER DEFAULT 1,
  fingerprint TEXT,
  source TEXT,
  status TEXT DEFAULT 'open',
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_deduped BOOLEAN DEFAULT FALSE,
  notification_channels JSONB DEFAULT '[]'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_created_at
  ON public.alert_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_history_alert_type
  ON public.alert_history (alert_type);

CREATE INDEX IF NOT EXISTS idx_alert_history_severity
  ON public.alert_history (severity);

CREATE INDEX IF NOT EXISTS idx_alert_history_status
  ON public.alert_history (status);
