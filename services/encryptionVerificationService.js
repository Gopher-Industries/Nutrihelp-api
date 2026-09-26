'use strict';

/**
 * encryptionVerificationService.js
 * ----------------------------------
 * Week 7/8 – CT Task 1: Encryption at Rest Final Hardening
 *
 * Runs automated round-trip checks against the live encryption key to confirm
 * the encryption pipeline is healthy.  Used by the /api/health/encryption
 * endpoint and can be called from CI/CD verification steps.
 */

const { encrypt, decrypt, loadEncryptionKey } = require('./encryptionService');

const TEST_STRING = 'nutrihelp-encryption-healthcheck';
const TEST_OBJECT = { check: true, service: 'nutrihelp', ts: 'static' };

/**
 * Run a full round-trip test for a single value.
 * Returns { ok: true } or { ok: false, error: string }.
 */
async function runRoundTrip(label, data) {
  try {
    const enc = await encrypt(data);

    if (!enc.encrypted || !enc.iv || !enc.authTag) {
      return { ok: false, error: `${label}: encrypt() returned incomplete result` };
    }

    const decrypted = await decrypt(enc.encrypted, enc.iv, enc.authTag);

    const originalStr = typeof data === 'string' ? data : JSON.stringify(data);
    const decryptedStr = typeof decrypted === 'string' ? decrypted : JSON.stringify(decrypted);

    if (originalStr !== decryptedStr) {
      return { ok: false, error: `${label}: decrypted value does not match original` };
    }

    return { ok: true, keyVersion: enc.keyVersion, algorithm: enc.algorithm };
  } catch (err) {
    return { ok: false, error: `${label}: ${err.message}` };
  }
}

/**
 * Verify that the encryption key is loadable and matches expected length.
 */
async function checkKeyAvailability() {
  try {
    const { key, version } = await loadEncryptionKey();
    if (!key || key.length !== 32) {
      return { ok: false, error: `Key length invalid: expected 32 bytes, got ${key?.length}` };
    }
    return { ok: true, version };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Run the full verification suite and return a structured health report.
 *
 * @returns {Promise<{
 *   status: 'healthy'|'degraded'|'down',
 *   checks: object,
 *   timestamp: string
 * }>}
 */
async function runVerification() {
  const [keyCheck, stringRoundTrip, objectRoundTrip] = await Promise.all([
    checkKeyAvailability(),
    runRoundTrip('string', TEST_STRING),
    runRoundTrip('object', TEST_OBJECT)
  ]);

  const checks = {
    key_available: keyCheck,
    string_round_trip: stringRoundTrip,
    object_round_trip: objectRoundTrip
  };

  const allPassed = Object.values(checks).every((c) => c.ok);
  const anyPassed = Object.values(checks).some((c) => c.ok);

  const status = allPassed ? 'healthy' : anyPassed ? 'degraded' : 'down';

  return {
    status,
    checks,
    key_version: keyCheck.version || 'unknown',
    timestamp: new Date().toISOString()
  };
}

module.exports = { runVerification };
