'use strict';

/**
 * cryptoLogService.js
 * --------------------
 * Week 6 – CT-004: Real-Time Monitoring and Alerting
 *
 * Writes crypto operation events to the `crypto_logs` table in Supabase.
 * Used by Alert A12 (Crypto Failure Patterns).
 *
 * Required table schema (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS crypto_logs (
 *     id             BIGSERIAL PRIMARY KEY,
 *     operation      TEXT,  -- 'encrypt', 'decrypt', 'sign', 'verify'
 *     key_id         TEXT,
 *     key_version    TEXT,
 *     success        BOOLEAN DEFAULT true,
 *     error_type     TEXT,
 *     endpoint       TEXT,
 *     ip_address     TEXT,
 *     user_id        TEXT,
 *     created_at     TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_crypto_logs_operation_created
 *     ON crypto_logs(operation, created_at DESC);
 *
 * Integration hooks are exported at the bottom — call them from
 * your crypto utility functions or JWT handlers.
 */

const { getSupabaseServiceClient } = require('./supabaseClient');
const supabaseService = getSupabaseServiceClient();

// ---------------------------------------------------------------------------
// Core writer
// ---------------------------------------------------------------------------

/**
 * Write a crypto operation event to crypto_logs.
 *
 * @param {object} params
 * @param {string} params.operation        - 'encrypt', 'decrypt', 'sign', 'verify'
 * @param {string} params.keyId            - Key identifier
 * @param {string} params.keyVersion       - Key version
 * @param {boolean} [params.success=true]  - Whether operation succeeded
 * @param {string} [params.errorType]      - Error type if failed
 * @param {string} [params.endpoint]       - API endpoint where operation occurred
 * @param {string} [params.ip]             - Client IP address
 * @param {string} [params.userId]         - User ID if available
 * @returns {Promise<{data, error}>}
 */
async function logCryptoEvent({
  operation,
  keyId,
  keyVersion,
  success = true,
  errorType = null,
  endpoint = null,
  ip = null,
  userId = null
}) {
  if (!supabaseService) {
    return { data: null, error: new Error('Supabase client not available') };
  }

  if (!operation || !keyId) {
    return { data: null, error: new Error('operation and keyId are required for crypto log') };
  }

  const validOperations = ['encrypt', 'decrypt', 'sign', 'verify'];
  if (!validOperations.includes(operation)) {
    return { data: null, error: new Error(`Invalid operation: ${operation}. Must be one of: ${validOperations.join(', ')}`) };
  }

  const entry = {
    operation,
    key_id: keyId,
    key_version: keyVersion || null,
    success: Boolean(success),
    error_type: errorType || null,
    endpoint: endpoint || null,
    ip_address: ip || null,
    user_id: userId || null,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabaseService
      .from('crypto_logs')
      .insert([entry])
      .select()
      .single();

    if (error) {
      console.error('[cryptoLogService] Insert error:', error.message || error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[cryptoLogService] Unexpected error:', err.message || err);
    return { data: null, error: err };
  }
}

// ---------------------------------------------------------------------------
// Query helper (used internally by Alert A12 evaluator)
// ---------------------------------------------------------------------------

/**
 * Get all crypto events within the last N minutes.
 *
 * @param {number} [windowMinutes=15]
 * @returns {Promise<Array>}
 */
async function getCryptoEvents(windowMinutes = 15) {
  if (!supabaseService) return [];

  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabaseService
      .from('crypto_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[cryptoLogService] getCryptoEvents error:', error.message || error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[cryptoLogService] getCryptoEvents unexpected error:', err.message || err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Integration hooks
// ---------------------------------------------------------------------------

/**
 * Log a successful crypto operation.
 *
 * Usage in your crypto utilities:
 *   await cryptoHookOnSuccess('decrypt', keyId, keyVersion, endpoint, ip, userId);
 *
 * @param {string} operation
 * @param {string} keyId
 * @param {string} keyVersion
 * @param {string} [endpoint]
 * @param {string} [ip]
 * @param {string} [userId]
 */
async function cryptoHookOnSuccess(operation, keyId, keyVersion, endpoint = null, ip = null, userId = null) {
  await logCryptoEvent({
    operation,
    keyId,
    keyVersion,
    success: true,
    endpoint,
    ip,
    userId
  }).catch((err) => {
    console.error('[cryptoLogService] cryptoHookOnSuccess failed:', err.message || err);
  });
}

/**
 * Log a failed crypto operation.
 *
 * Usage in your crypto utilities:
 *   await cryptoHookOnFailure('decrypt', keyId, keyVersion, errorType, endpoint, ip, userId);
 *
 * @param {string} operation
 * @param {string} keyId
 * @param {string} keyVersion
 * @param {string} errorType
 * @param {string} [endpoint]
 * @param {string} [ip]
 * @param {string} [userId]
 */
async function cryptoHookOnFailure(operation, keyId, keyVersion, errorType, endpoint = null, ip = null, userId = null) {
  await logCryptoEvent({
    operation,
    keyId,
    keyVersion,
    success: false,
    errorType,
    endpoint,
    ip,
    userId
  }).catch((err) => {
    console.error('[cryptoLogService] cryptoHookOnFailure failed:', err.message || err);
  });
}

module.exports = {
  logCryptoEvent,
  getCryptoEvents,
  cryptoHookOnSuccess,
  cryptoHookOnFailure
};