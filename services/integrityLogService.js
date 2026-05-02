'use strict';

/**
 * integrityLogService.js
 * -----------------------
 * Week 6 – CT-004: Real-Time Monitoring and Alerting
 *
 * Writes file integrity scan results to the `integrity_logs` table in Supabase.
 * Used by Alert A9 (File Tamper Detection).
 *
 * Required table schema (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS integrity_logs (
 *     id             BIGSERIAL PRIMARY KEY,
 *     host_id        TEXT,
 *     file_path      TEXT,
 *     baseline_hash  TEXT,
 *     observed_hash  TEXT,
 *     hash_mismatch BOOLEAN DEFAULT false,
 *     missing_file  BOOLEAN DEFAULT false,
 *     scan_id       TEXT,
 *     last_good_build TEXT,
 *     created_at    TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_integrity_logs_file_created
 *     ON integrity_logs(file_path, created_at DESC);
 *
 * Integration hooks are exported at the bottom — call them from
 * your file integrity scanner or deployment scripts.
 */

const path = require('path');
const { getSupabaseServiceClient } = require('./supabaseClient');
const supabaseService = getSupabaseServiceClient();

// Normalise absolute file paths to relative form so system directory structure
// is not exposed in log storage. Paths outside the project root are kept but
// the drive letter / root prefix is stripped.
function sanitizeFilePath(raw) {
  if (!raw) return null;
  const fp = String(raw).trim();
  // Attempt to make relative to process.cwd()
  try {
    const rel = path.relative(process.cwd(), fp);
    // If relative path escapes project root (starts with '..') use basename only
    if (rel.startsWith('..')) return path.basename(fp).slice(0, 500);
    return rel.slice(0, 500);
  } catch (_) {
    return fp.slice(0, 500);
  }
}

// ---------------------------------------------------------------------------
// Core writer
// ---------------------------------------------------------------------------

/**
 * Write an integrity scan result to integrity_logs.
 *
 * @param {object} params
 * @param {string} params.hostId           - Host/server identifier
 * @param {string} params.filePath         - Absolute file path
 * @param {string} params.baselineHash     - Expected hash from baseline
 * @param {string} params.observedHash     - Actual computed hash
 * @param {boolean} [params.hashMismatch]  - True if hashes don't match
 * @param {boolean} [params.missingFile]   - True if file doesn't exist
 * @param {string} [params.scanId]         - Unique scan identifier
 * @param {string} [params.lastGoodBuild]  - Build ID of last known good state
 * @returns {Promise<{data, error}>}
 */
async function logIntegrityEvent({
  hostId,
  filePath,
  baselineHash,
  observedHash,
  hashMismatch = false,
  missingFile = false,
  scanId = null,
  lastGoodBuild = null
}) {
  if (!supabaseService) {
    return { data: null, error: new Error('Supabase client not available') };
  }

  if (!filePath) {
    return { data: null, error: new Error('filePath is required for integrity log') };
  }

  const entry = {
    host_id: hostId ? String(hostId).slice(0, 128) : null,
    // Sanitize path — store relative form only to avoid exposing system structure
    file_path: sanitizeFilePath(filePath),
    // Store hash digests only — validate they look like hex/base64 and cap length
    baseline_hash: baselineHash ? String(baselineHash).slice(0, 128) : null,
    observed_hash: observedHash ? String(observedHash).slice(0, 128) : null,
    hash_mismatch: Boolean(hashMismatch),
    missing_file: Boolean(missingFile),
    scan_id: scanId ? String(scanId).slice(0, 128) : null,
    last_good_build: lastGoodBuild ? String(lastGoodBuild).slice(0, 128) : null,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabaseService
      .from('integrity_logs')
      .insert([entry])
      .select()
      .single();

    if (error) {
      console.error('[integrityLogService] Insert error:', error.message || error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[integrityLogService] Unexpected error:', err.message || err);
    return { data: null, error: err };
  }
}

// ---------------------------------------------------------------------------
// Query helper (used internally by Alert A9 evaluator)
// ---------------------------------------------------------------------------

/**
 * Get all integrity events within the last N minutes.
 *
 * @param {number} [windowMinutes=60]
 * @returns {Promise<Array>}
 */
async function getIntegrityEvents(windowMinutes = 60) {
  if (!supabaseService) return [];

  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabaseService
      .from('integrity_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[integrityLogService] getIntegrityEvents error:', error.message || error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[integrityLogService] getIntegrityEvents unexpected error:', err.message || err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Integration hooks
// ---------------------------------------------------------------------------

/**
 * Log a successful integrity check (no tampering detected).
 *
 * Usage in your integrity scanner:
 *   await integrityHookOnCheckSuccess(hostId, filePath, baselineHash, observedHash, scanId);
 *
 * @param {string} hostId
 * @param {string} filePath
 * @param {string} baselineHash
 * @param {string} observedHash
 * @param {string} scanId
 * @param {string} [lastGoodBuild]
 */
async function integrityHookOnCheckSuccess(hostId, filePath, baselineHash, observedHash, scanId, lastGoodBuild = null) {
  await logIntegrityEvent({
    hostId,
    filePath,
    baselineHash,
    observedHash,
    hashMismatch: false,
    missingFile: false,
    scanId,
    lastGoodBuild
  }).catch((err) => {
    console.error('[integrityLogService] integrityHookOnCheckSuccess failed:', err.message || err);
  });
}

/**
 * Log a hash mismatch (tampering detected).
 *
 * Usage in your integrity scanner:
 *   await integrityHookOnHashMismatch(hostId, filePath, baselineHash, observedHash, scanId);
 *
 * @param {string} hostId
 * @param {string} filePath
 * @param {string} baselineHash
 * @param {string} observedHash
 * @param {string} scanId
 * @param {string} [lastGoodBuild]
 */
async function integrityHookOnHashMismatch(hostId, filePath, baselineHash, observedHash, scanId, lastGoodBuild = null) {
  await logIntegrityEvent({
    hostId,
    filePath,
    baselineHash,
    observedHash,
    hashMismatch: true,
    missingFile: false,
    scanId,
    lastGoodBuild
  }).catch((err) => {
    console.error('[integrityLogService] integrityHookOnHashMismatch failed:', err.message || err);
  });
}

/**
 * Log a missing file (potential tampering).
 *
 * Usage in your integrity scanner:
 *   await integrityHookOnFileMissing(hostId, filePath, baselineHash, scanId);
 *
 * @param {string} hostId
 * @param {string} filePath
 * @param {string} baselineHash
 * @param {string} scanId
 * @param {string} [lastGoodBuild]
 */
async function integrityHookOnFileMissing(hostId, filePath, baselineHash, scanId, lastGoodBuild = null) {
  await logIntegrityEvent({
    hostId,
    filePath,
    baselineHash,
    observedHash: null,
    hashMismatch: false,
    missingFile: true,
    scanId,
    lastGoodBuild
  }).catch((err) => {
    console.error('[integrityLogService] integrityHookOnFileMissing failed:', err.message || err);
  });
}

module.exports = {
  logIntegrityEvent,
  getIntegrityEvents,
  integrityHookOnCheckSuccess,
  integrityHookOnHashMismatch,
  integrityHookOnFileMissing
};