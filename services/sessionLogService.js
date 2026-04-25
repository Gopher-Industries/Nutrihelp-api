'use strict';

/**
 * sessionLogService.js
 * ---------------------
 * Week 6 – CT-004: Real-Time Monitoring and Alerting
 *
 * Writes session events to the `session_logs` table in Supabase.
 * Used by Alert A6 (Geo-Impossible Concurrent Sessions).
 *
 * Required table schema (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS session_logs (
 *     id             BIGSERIAL PRIMARY KEY,
 *     session_id     TEXT,
 *     user_id        TEXT,
 *     ip_address     TEXT,
 *     country        TEXT,
 *     region         TEXT,
 *     user_agent     TEXT,
 *     impossible_travel BOOLEAN DEFAULT false,
 *     created_at     TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_session_logs_user_created
 *     ON session_logs(user_id, created_at DESC);
 *
 * Integration hooks are exported at the bottom — call them from
 * loginController (on LOGIN_SUCCESS) and any token-refresh handler.
 */

let supabaseService = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseService = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  } else {
    console.warn('[sessionLogService] Supabase env vars missing. Session events will not be persisted.');
  }
} catch (err) {
  console.warn('[sessionLogService] Failed to init Supabase client:', err.message);
}

// ---------------------------------------------------------------------------
// Core writer
// ---------------------------------------------------------------------------

/**
 * Write a session event to session_logs.
 *
 * @param {object} params
 * @param {string} params.sessionId        - Unique session ID (e.g. JWT jti or uuid)
 * @param {string} params.userId           - User ID or email
 * @param {string} params.ip               - Client IP address
 * @param {string} [params.country]        - Geo country (optional, resolved externally)
 * @param {string} [params.region]         - Geo region (optional)
 * @param {string} [params.userAgent]      - User-Agent header value
 * @param {boolean} [params.impossibleTravel] - Flag set by geo-analysis (default false)
 * @returns {Promise<{data, error}>}
 */
async function logSessionEvent({
  sessionId,
  userId,
  ip,
  country = null,
  region = null,
  userAgent = null,
  impossibleTravel = false
}) {
  if (!supabaseService) {
    return { data: null, error: new Error('Supabase client not available') };
  }

  if (!userId) {
    return { data: null, error: new Error('userId is required for session log') };
  }

  const entry = {
    session_id: sessionId || null,
    user_id: String(userId),
    ip_address: ip || null,
    country,
    region,
    user_agent: userAgent || null,
    impossible_travel: Boolean(impossibleTravel),
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabaseService
      .from('session_logs')
      .insert([entry])
      .select()
      .single();

    if (error) {
      console.error('[sessionLogService] Insert error:', error.message || error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[sessionLogService] Unexpected error:', err.message || err);
    return { data: null, error: err };
  }
}

// ---------------------------------------------------------------------------
// Query helper (used internally by Alert A6 evaluator)
// ---------------------------------------------------------------------------

/**
 * Get all session events for a given user within the last N minutes.
 *
 * @param {string} userId
 * @param {number} [windowMinutes=30]
 * @returns {Promise<Array>}
 */
async function getActiveSessions(userId, windowMinutes = 30) {
  if (!supabaseService) return [];

  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabaseService
      .from('session_logs')
      .select('*')
      .eq('user_id', String(userId))
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[sessionLogService] getActiveSessions error:', error.message || error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[sessionLogService] getActiveSessions unexpected error:', err.message || err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Integration hooks
// ---------------------------------------------------------------------------

/**
 * Express middleware that logs a session event after any successful auth.
 * Attach AFTER your existing login/auth response logic.
 *
 * Usage in loginController.js (inside login success block):
 *   await sessionHookOnLoginSuccess(req, user);
 *
 * @param {object} req   - Express request object
 * @param {object} user  - Authenticated user object { user_id, email }
 */
async function sessionHookOnLoginSuccess(req, user) {
  const sessionId = req.sessionID || req.headers['x-session-id'] || null;
  const userId = user?.user_id || user?.id || user?.email || null;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null;
  const userAgent = req.headers['user-agent'] || null;

  await logSessionEvent({
    sessionId,
    userId,
    ip,
    userAgent
  }).catch((err) => {
    console.error('[sessionLogService] sessionHookOnLoginSuccess failed:', err.message || err);
  });
}

module.exports = {
  logSessionEvent,
  getActiveSessions,
  sessionHookOnLoginSuccess
};