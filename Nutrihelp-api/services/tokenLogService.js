'use strict';

/**
 * tokenLogService.js
 * -------------------
 * Week 6 – CT-004: Real-Time Monitoring and Alerting
 *
 * Writes token lifecycle events to the `token_logs` table in Supabase.
 * Used by Alert A7 (Token Lifecycle Anomaly).
 *
 * Required table schema (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS token_logs (
 *     id             BIGSERIAL PRIMARY KEY,
 *     principal_id   TEXT NOT NULL,
 *     token_type     TEXT,          -- access | refresh | mfa | api_key
 *     event_type     TEXT NOT NULL, -- issue | refresh | reissue | revoke
 *     ip_address     TEXT,
 *     user_agent     TEXT,
 *     device_id      TEXT,
 *     created_at     TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_token_logs_principal_created
 *     ON token_logs(principal_id, created_at DESC);
 *
 * Usage: call the relevant hook from your JWT generation and revocation paths.
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
// Event type constants
// ---------------------------------------------------------------------------

const TOKEN_EVENTS = Object.freeze({
  ISSUE: 'issue',
  REFRESH: 'refresh',
  REISSUE: 'reissue',
  REVOKE: 'revoke'
});

const TOKEN_TYPES = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh',
  MFA: 'mfa',
  API_KEY: 'api_key'
});

// ---------------------------------------------------------------------------
// Core writer
// ---------------------------------------------------------------------------

/**
 * Write a token lifecycle event to token_logs.
 *
 * @param {object} params
 * @param {string}  params.principalId  - User ID or subject claim from JWT
 * @param {string}  params.tokenType    - TOKEN_TYPES constant
 * @param {string}  params.eventType    - TOKEN_EVENTS constant
 * @param {string}  [params.ip]         - Client IP
 * @param {string}  [params.userAgent]  - User-Agent header
 * @param {string}  [params.deviceId]   - Device fingerprint / device ID (optional)
 * @returns {Promise<{data, error}>}
 */
async function logTokenEvent({
  principalId,
  tokenType = TOKEN_TYPES.ACCESS,
  eventType,
  ip = null,
  userAgent = null,
  deviceId = null
}) {
  if (!supabaseService) {
    return { data: null, error: new Error('Supabase client not available') };
  }

  if (!principalId) {
    return { data: null, error: new Error('principalId is required for token log') };
  }

  if (!eventType) {
    return { data: null, error: new Error('eventType is required for token log') };
  }

  const entry = {
    principal_id: String(principalId),
    token_type: tokenType || null,
    event_type: eventType,
    ip_address: ip || null,
    user_agent: userAgent || null,
    device_id: deviceId || null,
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
// Integration hooks — call these from your JWT/auth layer
// ---------------------------------------------------------------------------

/**
 * Hook to call after issuing a new JWT (login success, signup).
 * Usage in loginController.js after jwt.sign():
 *   await tokenHookOnIssue(req, user.user_id, 'access');
 */
async function tokenHookOnIssue(req, principalId, tokenType = TOKEN_TYPES.ACCESS) {
  return logTokenEvent({
    principalId,
    tokenType,
    eventType: TOKEN_EVENTS.ISSUE,
    ip: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null
  }).catch((err) => {
    console.error('[tokenLogService] tokenHookOnIssue failed:', err.message || err);
  });
}

/**
 * Hook to call on any token refresh / re-issue operation.
 * Usage in your token refresh endpoint handler.
 */
async function tokenHookOnRefresh(req, principalId) {
  return logTokenEvent({
    principalId,
    tokenType: TOKEN_TYPES.REFRESH,
    eventType: TOKEN_EVENTS.REFRESH,
    ip: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null
  }).catch((err) => {
    console.error('[tokenLogService] tokenHookOnRefresh failed:', err.message || err);
  });
}

/**
 * Hook to call when a token is explicitly revoked (logout, forced invalidation).
 */
async function tokenHookOnRevoke(req, principalId, tokenType = TOKEN_TYPES.ACCESS) {
  return logTokenEvent({
    principalId,
    tokenType,
    eventType: TOKEN_EVENTS.REVOKE,
    ip: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null
  }).catch((err) => {
    console.error('[tokenLogService] tokenHookOnRevoke failed:', err.message || err);
  });
}

module.exports = {
  logTokenEvent,
  tokenHookOnIssue,
  tokenHookOnRefresh,
  tokenHookOnRevoke,
  TOKEN_EVENTS,
  TOKEN_TYPES
};
