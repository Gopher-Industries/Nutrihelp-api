-- MIGRATION: Create logging tables for Week 9 audit trail implementation
-- Author: Himanshi - Junior SOC Analyst, Cybersecurity Team
-- Date: Week 9, Trimester 2 2026
-- Purpose: Enable persistent logging for token activities, session events, RBAC violations, and system events

-- MIGRATION 1: Create token_activity_logs table
-- Tracks token generation, refresh, verification, and failures
CREATE TABLE IF NOT EXISTS token_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    event_type VARCHAR(50) NOT NULL,
    token_type VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_token_activity_logs_user_id ON token_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_token_activity_logs_event_type ON token_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_token_activity_logs_created_at ON token_activity_logs(created_at);

-- MIGRATION 2: Create session_logs table
-- Tracks user session activities like logout and session cleanup
CREATE TABLE IF NOT EXISTS session_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    event VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_session_logs_user_id ON session_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_event ON session_logs(event);
CREATE INDEX IF NOT EXISTS idx_session_logs_timestamp ON session_logs(timestamp);

-- MIGRATION 3: Create system_logs table
-- Records backend startup or system events
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    event VARCHAR(100) NOT NULL,
    port INTEGER,
    environment VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_system_logs_event ON system_logs(event);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);

-- Enable RLS (Row Level Security) for audit trail integrity
ALTER TABLE token_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for read-only audit access (optional, adjust based on your needs)
CREATE POLICY "Allow authenticated users to read token logs" 
    ON token_activity_logs FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to read session logs" 
    ON session_logs FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to read system logs" 
    ON system_logs FOR SELECT 
    TO authenticated 
    USING (true);

-- Anon users can insert logs (for service account logging)
CREATE POLICY "Allow anon to insert token logs" 
    ON token_activity_logs FOR INSERT 
    TO anon 
    WITH CHECK (true);

CREATE POLICY "Allow anon to insert session logs" 
    ON session_logs FOR INSERT 
    TO anon 
    WITH CHECK (true);

CREATE POLICY "Allow anon to insert system logs" 
    ON system_logs FOR INSERT 
    TO anon 
    WITH CHECK (true);

-- Add table descriptions for documentation
COMMENT ON TABLE token_activity_logs IS 'Audit trail for token lifecycle events (generation, refresh, verification, failures)';
COMMENT ON TABLE session_logs IS 'Audit trail for user session events (logout, session cleanup)';
COMMENT ON TABLE system_logs IS 'System event logs for backend startup, shutdown, and maintenance events';

COMMENT ON COLUMN token_activity_logs.event_type IS 'Type of token event: token_generated, token_verified, token_verification_failed, token_refreshed, token_refresh_failed';
COMMENT ON COLUMN session_logs.event IS 'Type of session event: logout, logout_all, session_cleanup';
COMMENT ON COLUMN system_logs.event IS 'Type of system event: server_start, server_shutdown, maintenance, etc.';
