'use strict';

/**
 * integrityLogService.js
 * -----------------------
 * Week 6 – CT-004: Real-Time Monitoring and Alerting
 *
 * Computes file hashes, compares them against a baseline, and writes
 * integrity events to the `integrity_logs` table in Supabase.
 * Used by Alert A9 (Integrity Tamper Event).
 *
 * Required table schema (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS integrity_logs (
 *     id                     BIGSERIAL PRIMARY KEY,
 *     scan_id                TEXT,
 *     host_id                TEXT,
 *     file_path              TEXT,
 *     baseline_hash          TEXT,
 *     observed_hash          TEXT,
 *     hash_mismatch          BOOLEAN DEFAULT false,
 *     missing_file           BOOLEAN DEFAULT false,
 *     tamper_type            TEXT,   -- hash_mismatch | missing_file | added_file
 *     last_known_good_build  TEXT,
 *     created_at             TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_integrity_logs_created
 *     ON integrity_logs(created_at DESC);
 *
 * Baseline file format (JSON):
 *   {
 *     "version": "1.0.0",
 *     "generated_at": "2026-04-01T00:00:00.000Z",
 *     "files": {
 *       "/absolute/path/to/server.js": "sha256hexstring...",
 *       ...
 *     }
 *   }
 * Generate a fresh baseline by calling: generateBaselineFile(filePaths, outputPath)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let supabaseService = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseService = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  } else {
    console.warn('[integrityLogService] Supabase env vars missing. Integrity events will not be persisted.');
  }
} catch (err) {
  console.warn('[integrityLogService] Failed to init Supabase client:', err.message);
}

// ---------------------------------------------------------------------------
// Hash utility
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 hash of a file.
 * Returns null if file does not exist or is unreadable.
 *
 * @param {string} filePath - Absolute or relative path to file
 * @returns {string|null}
 */
function computeFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null; // file missing
    }
    console.error('[integrityLogService] Hash error for', filePath, ':', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Baseline management
// ---------------------------------------------------------------------------

/**
 * Load a baseline JSON file from disk.
 *
 * @param {string} baselineFilePath - Path to the baseline JSON
 * @returns {{ version: string, files: object }|null}
 */
function loadBaseline(baselineFilePath) {
  try {
    const raw = fs.readFileSync(baselineFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[integrityLogService] Failed to load baseline:', err.message);
    return null;
  }
}

/**
 * Generate (or refresh) a baseline file by hashing the supplied file paths.
 * Write the result as JSON to outputPath.
 *
 * @param {string[]} filePaths    - Files to include in the baseline
 * @param {string}   outputPath  - Where to write the baseline JSON
 * @param {string}   [version]   - App version label (default: from package.json)
 */
function generateBaselineFile(filePaths, outputPath, version) {
  const appVersion = version || (() => {
    try {
      return require(path.join(process.cwd(), 'package.json')).version;
    } catch (_) {
      return 'unknown';
    }
  })();

  const baseline = {
    version: appVersion,
    generated_at: new Date().toISOString(),
    files: {}
  };

  filePaths.forEach((fp) => {
    const hash = computeFileHash(fp);
    baseline.files[fp] = hash || 'MISSING';
  });

  fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2), 'utf8');
  console.log(`[integrityLogService] Baseline written to ${outputPath} (${filePaths.length} files)`);
  return baseline;
}

// ---------------------------------------------------------------------------
// Core writer
// ---------------------------------------------------------------------------

/**
 * Write a single integrity event to integrity_logs.
 *
 * @param {object} params
 * @returns {Promise<{data, error}>}
 */
async function logIntegrityEvent({
  scanId,
  hostId = null,
  filePath,
  baselineHash,
  observedHash,
  hashMismatch = false,
  missingFile = false,
  tamperType,
  lastKnownGoodBuild = null
}) {
  if (!supabaseService) {
    return { data: null, error: new Error('Supabase client not available') };
  }

  const entry = {
    scan_id: scanId || null,
    host_id: hostId || process.env.HOST_ID || 'default',
    file_path: filePath || null,
    baseline_hash: baselineHash || null,
    observed_hash: observedHash || null,
    hash_mismatch: Boolean(hashMismatch),
    missing_file: Boolean(missingFile),
    tamper_type: tamperType || null,
    last_known_good_build: lastKnownGoodBuild || null,
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
// Integrity scanner
// ---------------------------------------------------------------------------

/**
 * Run a full integrity scan: compare live hashes against baseline.
 * Any mismatch or missing file is written to integrity_logs immediately.
 *
 * @param {object}  opts
 * @param {string}  opts.baselineFilePath   - Path to baseline JSON produced by generateBaselineFile()
 * @param {string}  [opts.scanId]           - Unique ID for this scan run (uuid recommended)
 * @param {string}  [opts.lastKnownGoodBuild]
 * @returns {Promise<{ scanned: number, violations: number, results: Array }>}
 */
async function runIntegrityScan({ baselineFilePath, scanId, lastKnownGoodBuild }) {
  const scanRunId = scanId || `scan-${Date.now()}`;
  const baseline = loadBaseline(baselineFilePath);

  if (!baseline) {
    console.error('[integrityLogService] Cannot run scan — baseline file not loaded.');
    return { scanned: 0, violations: 0, results: [] };
  }

  const fileEntries = Object.entries(baseline.files);
  const results = [];
  let violations = 0;

  for (const [fp, expectedHash] of fileEntries) {
    const currentHash = computeFileHash(fp);

    if (currentHash === null) {
      // File is missing
      violations += 1;
      const result = { file: fp, type: 'missing_file', baseline: expectedHash, observed: null };
      results.push(result);
      console.warn(`[integrityLogService] [${scanRunId}] MISSING FILE: ${fp}`);

      await logIntegrityEvent({
        scanId: scanRunId,
        filePath: fp,
        baselineHash: expectedHash,
        observedHash: null,
        missingFile: true,
        tamperType: 'missing_file',
        lastKnownGoodBuild: lastKnownGoodBuild || baseline.version
      });
      continue;
    }

    if (currentHash !== expectedHash) {
      // Hash mismatch
      violations += 1;
      const result = { file: fp, type: 'hash_mismatch', baseline: expectedHash, observed: currentHash };
      results.push(result);
      console.warn(`[integrityLogService] [${scanRunId}] HASH MISMATCH: ${fp}`);
      console.warn(`  expected: ${expectedHash}`);
      console.warn(`  observed: ${currentHash}`);

      await logIntegrityEvent({
        scanId: scanRunId,
        filePath: fp,
        baselineHash: expectedHash,
        observedHash: currentHash,
        hashMismatch: true,
        tamperType: 'hash_mismatch',
        lastKnownGoodBuild: lastKnownGoodBuild || baseline.version
      });
    } else {
      results.push({ file: fp, type: 'ok', baseline: expectedHash, observed: currentHash });
    }
  }

  console.log(
    `[integrityLogService] Scan ${scanRunId} complete: ${fileEntries.length} files checked, ${violations} violation(s).`
  );

  return { scanned: fileEntries.length, violations, results };
}

/**
 * Schedule a periodic integrity scan using setInterval.
 * Suitable for running inside the Express process or a separate worker.
 *
 * @param {object} opts
 * @param {string} opts.baselineFilePath   - Path to baseline JSON
 * @param {number} [opts.intervalMs]       - Interval in ms (default 6 hours)
 * @returns {NodeJS.Timeout}               - clearInterval handle
 */
function scheduleIntegrityScan({ baselineFilePath, intervalMs }) {
  const interval = Number(intervalMs || 6 * 60 * 60 * 1000);

  console.log(
    `[integrityLogService] Integrity scan scheduled every ${Math.round(interval / 60000)} minutes.`
  );

  // Run once immediately, then on schedule
  runIntegrityScan({ baselineFilePath }).catch((err) => {
    console.error('[integrityLogService] Initial scan failed:', err.message || err);
  });

  return setInterval(() => {
    runIntegrityScan({ baselineFilePath }).catch((err) => {
      console.error('[integrityLogService] Scheduled scan failed:', err.message || err);
    });
  }, interval);
}

module.exports = {
  computeFileHash,
  loadBaseline,
  generateBaselineFile,
  logIntegrityEvent,
  runIntegrityScan,
  scheduleIntegrityScan
};
