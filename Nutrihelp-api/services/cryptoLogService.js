'use strict';

/**
 * cryptoLogService.js
 * --------------------
 * Week 6 – CT-004: Real-Time Monitoring and Alerting
 *
 * Writes encryption/decryption operation events to the `crypto_logs` table.
 * Used by Alert A12 (Encryption/Decryption Anomaly).
 *
 * Required table schema (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS crypto_logs (
 *     id               BIGSERIAL PRIMARY KEY,
 *     crypto_operation TEXT NOT NULL,   -- encrypt | decrypt | sign | verify
 *     event_type       TEXT NOT NULL,   -- encrypt_success | encrypt_failure |
 *                                       -- decrypt_success | decrypt_failure
 *     key_identifier   TEXT,
 *     key_version      TEXT,
 *     endpoint         TEXT,
 *     source_ip        TEXT,
 *     failure_reason   TEXT,
 *     created_at       TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_crypto_logs_created
 *     ON crypto_logs(created_at DESC);
 *
 * Integration: wrap any encrypt/decrypt call with `withCryptoLogging()`, or call
 * logCryptoEvent() directly after your crypto operation.
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
    console.warn('[cryptoLogService] Supabase env vars missing. Crypto events will not be persisted.');
  }
} catch (err) {
  console.warn('[cryptoLogService] Failed to init Supabase client:', err.message);
}

// ---------------------------------------------------------------------------
// Operation constants
// ---------------------------------------------------------------------------

const CRYPTO_OPERATIONS = Object.freeze({
  ENCRYPT: 'encrypt',
  DECRYPT: 'decrypt',
  SIGN: 'sign',
  VERIFY: 'verify'
});

const CRYPTO_EVENT_TYPES = Object.freeze({
  ENCRYPT_SUCCESS: 'encrypt_success',
  ENCRYPT_FAILURE: 'encrypt_failure',
  DECRYPT_SUCCESS: 'decrypt_success',
  DECRYPT_FAILURE: 'decrypt_failure',
  SIGN_SUCCESS: 'sign_success',
  SIGN_FAILURE: 'sign_failure',
  VERIFY_SUCCESS: 'verify_success',
  VERIFY_FAILURE: 'verify_failure'
});

// ---------------------------------------------------------------------------
// Core writer
// ---------------------------------------------------------------------------

/**
 * Write a crypto operation event to crypto_logs.
 *
 * @param {object} params
 * @param {string}  params.operation       - CRYPTO_OPERATIONS constant
 * @param {string}  params.eventType       - CRYPTO_EVENT_TYPES constant
 * @param {string}  [params.keyIdentifier] - Key ID / key name
 * @param {string}  [params.keyVersion]    - Key version string
 * @param {string}  [params.endpoint]      - Route/handler that triggered the operation
 * @param {string}  [params.sourceIp]      - Client IP address
 * @param {string}  [params.failureReason] - Error message / reason code (for failures)
 * @returns {Promise<{data, error}>}
 */
async function logCryptoEvent({
  operation,
  eventType,
  keyIdentifier = null,
  keyVersion = null,
  endpoint = null,
  sourceIp = null,
  failureReason = null
}) {
  if (!supabaseService) {
    return { data: null, error: new Error('Supabase client not available') };
  }

  if (!operation || !eventType) {
    return { data: null, error: new Error('operation and eventType are required for crypto log') };
  }

  const entry = {
    crypto_operation: operation,
    event_type: eventType,
    key_identifier: keyIdentifier || null,
    key_version: keyVersion || null,
    endpoint: endpoint || null,
    source_ip: sourceIp || null,
    failure_reason: failureReason || null,
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
// High-level wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap any async encrypt/decrypt function with automatic logging.
 * On success: logs a success event. On failure: logs a failure event, then rethrows.
 *
 * @param {object}   context
 * @param {string}   context.operation      - CRYPTO_OPERATIONS constant
 * @param {string}   [context.keyIdentifier]
 * @param {string}   [context.keyVersion]
 * @param {string}   [context.endpoint]
 * @param {string}   [context.sourceIp]
 * @param {Function} fn                     - Async function that performs the crypto op
 * @returns {Promise<*>}                    - Returns fn's result on success
 *
 * Usage:
 *   const plaintext = await withCryptoLogging(
 *     { operation: CRYPTO_OPERATIONS.DECRYPT, keyIdentifier: 'data-key-v1', endpoint: '/api/plan/generate' },
 *     () => myDecryptFn(ciphertext)
 *   );
 */
async function withCryptoLogging(context, fn) {
  const { operation = CRYPTO_OPERATIONS.DECRYPT } = context;

  const successEventType = `${operation}_success`;
  const failureEventType = `${operation}_failure`;

  try {
    const result = await fn();
    // Fire-and-forget logging on success to avoid slowing the hot path
    logCryptoEvent({ ...context, eventType: successEventType }).catch((err) => {
      console.error('[cryptoLogService] Success log write failed:', err.message || err);
    });

    return result;
  } catch (err) {
    // Await failure log before rethrowing so it reaches the DB
    await logCryptoEvent({
      ...context,
      eventType: failureEventType,
      failureReason: err.message || String(err)
    }).catch((logErr) => {
      console.error('[cryptoLogService] Failure log write failed:', logErr.message || logErr);
    });

    throw err;
  }
}

/**
 * Convenience shorthand: log a decrypt failure directly.
 * Call this in your catch block if you don't use withCryptoLogging().
 *
 * @param {object} context
 * @param {Error|string} err
 */
async function logDecryptFailure(context, err) {
  return logCryptoEvent({
    ...context,
    operation: context.operation || CRYPTO_OPERATIONS.DECRYPT,
    eventType: CRYPTO_EVENT_TYPES.DECRYPT_FAILURE,
    failureReason: err?.message || String(err)
  });
}

module.exports = {
  logCryptoEvent,
  logDecryptFailure,
  withCryptoLogging,
  CRYPTO_OPERATIONS,
  CRYPTO_EVENT_TYPES
};
