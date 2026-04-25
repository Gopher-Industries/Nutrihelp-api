'use strict';

/**
 * tokenLogService.js
 * -------------------
 * Week 6 – CT-004: Real-Time Monitoring and Alerting
 *
 * Writes token lifecycle events to the `token_logs` table in Supabase.
 * Used by Alert A7 (Token Abuse Patterns).
 *
 * Required table schema (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS token_logs (
 *     id             BIGSERIAL PRIMARY KEY,
 *     token_id       TEXT,
 *     user_id        TEXT,
 *     event_type     TEXT,  -- 'issue', 'refresh', 'revoke', 'validate'
 *     ip_address     TEXT,
 *     user_agent     TEXT,
 *     device_info    TEXT,
 *     key_id         TEXT,  -- for JWT key rotation tracking
 *     created_at     TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_token_logs_user_created
 *     ON token_logs(user_id, created_at DESC);
 *
 * Integration hooks are exported at the bottom — call them from
 * authController (on token issue/refresh/revoke).
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
    console.warn('[tokenLogService] Supabase env vars missing. Token events will not be persisted.');
  }
} catch (err) {
  console.warn('[tokenLogService] Failed to init Supabase client:', err.message);
}

// ---------------------------------------------------------------------------
// Core writer
// ---------------------------------------------------------------------------

/**
 * Write a token event to token_logs.
 *
 * @param {object} params
 * @param {string} params.tokenId          - Unique token ID (e.g. JWT jti)
 * @param {string} params.userId           - User ID or email
 * @param {string} params.eventType        - 'issue', 'refresh', 'revoke', 'validate'
 * @param {string} params.ip               - Client IP address
 * @param {string} [params.userAgent]      - User-Agent header value
 * @param {string} [params.deviceInfo]     - Device fingerprint or metadata
 * @param {string} [params.keyId]          - Key ID for rotation tracking
 * @returns {Promise<{data, error}>}
 */
async function logTokenEvent({
  tokenId,
  userId,
  eventType,
  ip,
  userAgent = null,
  deviceInfo = null,
  keyId = null
}) {
  if (!supabaseService) {
    return { data: null, error: new Error('Supabase client not available') };
  }

  if (!userId || !eventType) {
    return { data: null, error: new Error('userId and eventType are required for token log') };
  }

  const validEventTypes = ['issue', 'refresh', 'revoke', 'validate'];
  if (!validEventTypes.includes(eventType)) {
    return { data: null, error: new Error(`Invalid eventType: ${eventType}. Must be one of: ${validEventTypes.join(', ')}`) };
  }

  const entry = {
    token_id: tokenId || null,
    user_id: String(userId),
    event_type: eventType,
    ip_address: ip || null,
    user_agent: userAgent || null,
    device_info: deviceInfo || null,
    key_id: keyId || null,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabaseService
      .from('token_logs')
      .insert([entry])
      .select()
      .single();

    if (error) {
      console.error('[tokenLogService] Insert error:', error.message || error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[tokenLogService] Unexpected error:', err.message || err);
    return { data: null, error: err };
  }
}

// ---------------------------------------------------------------------------
// Query helper (used internally by Alert A7 evaluator)
// ---------------------------------------------------------------------------

/**
 * Get all token events for a given user within the last N minutes.
 *
 * @param {string} userId
 * @param {number} [windowMinutes=10]
 * @returns {Promise<Array>}
 */
async function getTokenEvents(userId, windowMinutes = 10) {
  if (!supabaseService) return [];

  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabaseService
      .from('token_logs')
      .select('*')
      .eq('user_id', String(userId))
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[tokenLogService] getTokenEvents error:', error.message || error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[tokenLogService] getTokenEvents unexpected error:', err.message || err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Integration hooks
// ---------------------------------------------------------------------------

/**
 * Express middleware that logs a token issue event.
 * Attach AFTER your existing token generation logic.
 *
 * Usage in authController.js (inside token issue block):
 *   await tokenHookOnIssue(req, user, tokenId);
 *
 * @param {object} req     - Express request object
 * @param {object} user    - User object { user_id, email }
 * @param {string} tokenId - Unique token identifier
 * @param {string} [keyId] - Key ID for rotation tracking
 */
async function tokenHookOnIssue(req, user, tokenId, keyId = null) {
  const userId = user?.user_id || user?.id || user?.email || null;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null;
  const userAgent = req.headers['user-agent'] || null;
  const deviceInfo = req.headers['x-device-info'] || null;

  await logTokenEvent({
    tokenId,
    userId,
    eventType: 'issue',
    ip,
    userAgent,
    deviceInfo,
    keyId
  }).catch((err) => {
    console.error('[tokenLogService] tokenHookOnIssue failed:', err.message || err);
  });
}

/**
 * Express middleware that logs a token refresh event.
 * Attach AFTER your existing token refresh logic.
 *
 * Usage in authController.js (inside token refresh block):
 *   await tokenHookOnRefresh(req, user, tokenId);
 *
 * @param {object} req     - Express request object
 * @param {object} user    - User object { user_id, email }
 * @param {string} tokenId - Unique token identifier
 * @param {string} [keyId] - Key ID for rotation tracking
 */
async function tokenHookOnRefresh(req, user, tokenId, keyId = null) {
  const userId = user?.user_id || user?.id || user?.email || null;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null;
  const userAgent = req.headers['user-agent'] || null;
  const deviceInfo = req.headers['x-device-info'] || null;

  await logTokenEvent({
    tokenId,
    userId,
    eventType: 'refresh',
    ip,
    userAgent,
    deviceInfo,
    keyId
  }).catch((err) => {
    console.error('[tokenLogService] tokenHookOnRefresh failed:', err.message || err);
  });
}

/**
 * Express middleware that logs a token revoke event.
 * Attach AFTER your existing token revocation logic.
 *
 * Usage in authController.js (inside token revoke block):
 *   await tokenHookOnRevoke(req, user, tokenId);
 *
 * @param {object} req     - Express request object
 * @param {object} user    - User object { user_id, email }
 * @param {string} tokenId - Unique token identifier
 */
async function tokenHookOnRevoke(req, user, tokenId) {
  const userId = user?.user_id || user?.id || user?.email || null;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null;
  const userAgent = req.headers['user-agent'] || null;
  const deviceInfo = req.headers['x-device-info'] || null;

  await logTokenEvent({
    tokenId,
    userId,
    eventType: 'revoke',
    ip,
    userAgent,
    deviceInfo
  }).catch((err) => {
    console.error('[tokenLogService] tokenHookOnRevoke failed:', err.message || err);
  });
}

module.exports = {
  logTokenEvent,
  getTokenEvents,
  tokenHookOnIssue,
  tokenHookOnRefresh,
  tokenHookOnRevoke
};