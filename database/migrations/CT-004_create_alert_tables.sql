-- CT-004 Week 6: Real-Time Monitoring and Alerting Implementation
-- SQL Migration for Alert Tables and Logging Infrastructure
-- Run this migration once in Supabase to set up the required tables

-- ========================================
-- 1. SESSION LOGS TABLE (for Alert A6)
-- ========================================
CREATE TABLE IF NOT EXISTS session_logs (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  ip_address TEXT,
  country TEXT,
  region TEXT,
  user_agent TEXT,
  impossible_travel BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_logs_user_created
  ON session_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_session_id
  ON session_logs(session_id);

-- ========================================
-- 2. TOKEN LOGS TABLE (for Alert A7)
-- ========================================
CREATE TABLE IF NOT EXISTS token_logs (
  id BIGSERIAL PRIMARY KEY,
  token_id TEXT,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  key_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_logs_user_created
  ON token_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_logs_event_type
  ON token_logs(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_logs_token_id
  ON token_logs(token_id);

-- ========================================
-- 3. INTEGRITY LOGS TABLE (for Alert A9)
-- ========================================
CREATE TABLE IF NOT EXISTS integrity_logs (
  id BIGSERIAL PRIMARY KEY,
  host_id TEXT,
  file_path TEXT NOT NULL,
  baseline_hash TEXT,
  observed_hash TEXT,
  hash_mismatch BOOLEAN DEFAULT false,
  missing_file BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_logs_host_created
  ON integrity_logs(host_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_logs_file_path
  ON integrity_logs(file_path, created_at DESC);

-- ========================================
-- 4. CRYPTO LOGS TABLE (for Alert A12)
-- ========================================
CREATE TABLE IF NOT EXISTS crypto_logs (
  id BIGSERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  key_id TEXT,
  key_version TEXT,
  success BOOLEAN NOT NULL,
  error_type TEXT,
  endpoint TEXT,
  ip_address TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_logs_user_created
  ON crypto_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crypto_logs_operation_success
  ON crypto_logs(operation, success, created_at DESC);

-- ========================================
-- 5. ALERT HISTORY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS alert_history (
  id BIGSERIAL PRIMARY KEY,
  alert_id TEXT NOT NULL,
  alert_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  trigger_summary TEXT,
  affected_principal TEXT,
  source_ip TEXT,
  notification_channels TEXT[],
  response_actions TEXT[],
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_principal_created
  ON alert_history(affected_principal, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_history_severity_created
  ON alert_history(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id
  ON alert_history(alert_id);

-- ========================================
-- 6. MONITORING HEARTBEATS TABLE (for Alert A10)
-- ========================================
CREATE TABLE IF NOT EXISTS monitoring_heartbeats (
  id BIGSERIAL PRIMARY KEY,
  checker_name TEXT NOT NULL,
  last_successful_check TIMESTAMPTZ,
  check_status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_heartbeats_checker_updated
  ON monitoring_heartbeats(checker_name, updated_at DESC);

-- ========================================
-- 7. RETENTION POLICY
-- ========================================
-- Tables are set to archive logs older than 90 days via the
-- archiveOldAlerts() function in services/securityAlertService.js
-- This migration does not set up automatic deletion; manual archival
-- is performed when alerts are checked (every 5 minutes).

-- ========================================
-- 8. ENABLE ROW LEVEL SECURITY (Optional)
-- ========================================
-- For enhanced security, enable RLS on alert tables:
-- ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE token_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE integrity_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE crypto_logs ENABLE ROW LEVEL SECURITY;

-- Create policies as needed for your authentication setup
