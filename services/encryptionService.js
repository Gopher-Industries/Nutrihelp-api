'use strict';

const crypto = require('crypto');

// Key source strategy:
// 1) Supabase Vault (preferred): RPC returns a base64/hex key string.
// 2) Environment fallback: ENCRYPTION_KEY (required if no Vault RPC configured).
//
// Key rotation: bump ENCRYPTION_KEY_VERSION and keep the old key available
// under ENCRYPTION_KEY_PREV during rotation. The rotate-encryption-key.js
// script handles re-encrypting all existing rows.

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;       // 96-bit nonce — recommended for GCM
const AUTH_TAG_LENGTH = 16;
const BATCH_SIZE = 50;      // default batch size for bulk operations
const MAX_CONCURRENT = 5;   // max parallel encrypt/DB operations within a batch

const KEY_SOURCE = String(process.env.ENCRYPTION_KEY_SOURCE || 'env').toLowerCase();
const KEY_ENV_NAME = process.env.ENCRYPTION_KEY_ENV_NAME || 'ENCRYPTION_KEY';
const KEY_VERSION = process.env.ENCRYPTION_KEY_VERSION || 'v1';

let cachedKey = null;
let cachedKeyVersion = null;

// ---------------------------------------------------------------------------
// Runtime guard
// ---------------------------------------------------------------------------

function assertBackendRuntime() {
  if (typeof window !== 'undefined') {
    throw new Error('encryptionService is backend-only and cannot run in a browser runtime.');
  }
}

// ---------------------------------------------------------------------------
// Failure logging (lightweight — no circular imports)
// Writes a structured entry to stderr so the crypto_logs service or any
// external log aggregator can pick it up.  This feeds Alert A12.
// ---------------------------------------------------------------------------

function logEncryptionFailure(operation, error, context = {}) {
  const entry = {
    level: 'ERROR',
    service: 'encryptionService',
    operation,
    error: error?.message || String(error),
    key_version: cachedKeyVersion || KEY_VERSION,
    ...context,
    timestamp: new Date().toISOString()
  };
  process.stderr.write(JSON.stringify(entry) + '\n');
}

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

function normalizeKey(rawKey) {
  if (!rawKey) {
    throw new Error('Encryption key is missing. Set ENCRYPTION_KEY or configure Vault key retrieval.');
  }

  const trimmed = String(rawKey).trim();

  try {
    const base64Key = Buffer.from(trimmed, 'base64');
    if (base64Key.length === 32) return base64Key;
  } catch (_err) {
    // fall through
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  throw new Error(
    'Invalid encryption key format. Key must be a 32-byte base64 string (44 chars) or a 64-char hex string. ' +
    'Generate a valid key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
  );
}

async function loadKeyFromVault() {
  let supabase;
  try {
    supabase = require('../database/supabaseClient');
  } catch (error) {
    throw new Error(`Vault key source requested but Supabase client unavailable: ${error.message || error}`);
  }

  const rpcName = process.env.ENCRYPTION_VAULT_RPC || 'get_encryption_key';
  const { data, error } = await supabase.rpc(rpcName);

  if (error) {
    throw new Error(`Failed to load encryption key from Vault RPC '${rpcName}': ${error.message || error}`);
  }

  let keyValue = null;
  const version = KEY_VERSION;

  if (typeof data === 'string') {
    keyValue = data;
  } else if (Array.isArray(data)) {
    const row = data[0];
    keyValue = row?.key || row?.encryption_key || (typeof row === 'string' ? row : null);
  } else if (data && typeof data === 'object') {
    keyValue = data.key || data.encryption_key || null;
  }

  if (!keyValue) {
    throw new Error(`Vault RPC '${rpcName}' returned no key value. Got: ${JSON.stringify(data)}`);
  }

  return { key: normalizeKey(keyValue), version };
}

async function loadEncryptionKey() {
  assertBackendRuntime();

  if (cachedKey) {
    return { key: cachedKey, version: cachedKeyVersion || KEY_VERSION };
  }

  if (KEY_SOURCE === 'vault') {
    const result = await loadKeyFromVault();
    cachedKey = result.key;
    cachedKeyVersion = result.version;
    return result;
  }

  const envKey = process.env[KEY_ENV_NAME];
  const key = normalizeKey(envKey);
  cachedKey = key;
  cachedKeyVersion = KEY_VERSION;
  return { key, version: KEY_VERSION };
}

function clearCachedKeyForRotation() {
  cachedKey = null;
  cachedKeyVersion = null;
}

// ---------------------------------------------------------------------------
// Payload envelope
// ---------------------------------------------------------------------------

function toPayload(data) {
  if (typeof data === 'string') {
    return JSON.stringify({ v: 1, t: 'string', d: data });
  }
  if (data !== null && typeof data === 'object') {
    return JSON.stringify({ v: 1, t: 'json', d: data });
  }
  throw new TypeError('encrypt(data) expects a string or object.');
}

function fromPayload(payload) {
  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch (_error) {
    return payload;
  }
  if (!parsed || typeof parsed !== 'object') return payload;
  if (parsed.t === 'json') return parsed.d;
  if (parsed.t === 'string') return String(parsed.d || '');
  return payload;
}

// ---------------------------------------------------------------------------
// Core encrypt / decrypt
// ---------------------------------------------------------------------------

async function encrypt(data) {
  assertBackendRuntime();

  const { key, version } = await loadEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const plaintext = toPayload(data);
  const encryptedBuffer = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encryptedBuffer.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: version,
    algorithm: ALGORITHM
  };
}

async function decrypt(encryptedData, iv, authTag) {
  assertBackendRuntime();

  if (!encryptedData || !iv || !authTag) {
    throw new Error('decrypt(encryptedData, iv, authTag) requires all three parameters.');
  }

  const { key } = await loadEncryptionKey();

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(String(iv), 'base64'),
      { authTagLength: AUTH_TAG_LENGTH }
    );
    decipher.setAuthTag(Buffer.from(String(authTag), 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(String(encryptedData), 'base64')),
      decipher.final()
    ]).toString('utf8');

    return fromPayload(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message || error}`);
  }
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

/**
 * Encrypt `data` and return the four columns needed for DB storage.
 * On failure, logs via logEncryptionFailure and re-throws — callers must
 * not fall back to plaintext.
 */
async function encryptForDatabase(data) {
  try {
    const result = await encrypt(data);
    return {
      encrypted: result.encrypted,
      iv: result.iv,
      authTag: result.authTag,
      keyVersion: result.keyVersion,
      algorithm: result.algorithm
    };
  } catch (err) {
    logEncryptionFailure('encryptForDatabase', err);
    throw err;
  }
}

/**
 * Read encrypted columns from `record` using `fieldMap` and decrypt.
 *
 * fieldMap defaults: { encrypted: 'encrypted', iv: 'iv', authTag: 'authTag' }
 * Returns null when the record has no encrypted payload.
 */
async function decryptFromDatabase(record, fieldMap = {}) {
  if (!record || typeof record !== 'object') return null;

  const encryptedField = fieldMap.encrypted || 'encrypted';
  const ivField = fieldMap.iv || 'iv';
  const authTagField = fieldMap.authTag || 'authTag';

  const encryptedValue = record[encryptedField];
  const ivValue = record[ivField];
  const authTagValue = record[authTagField];

  // All three absent — unencrypted row, expected during migration window.
  if (!encryptedValue && !ivValue && !authTagValue) return null;

  // Partial presence means data corruption — log and throw rather than silently return null.
  if (!encryptedValue || !ivValue || !authTagValue) {
    const missing = [
      !encryptedValue && encryptedField,
      !ivValue && ivField,
      !authTagValue && authTagField
    ].filter(Boolean).join(', ');
    const err = new Error(
      `Incomplete encrypted payload on record ${record.id ?? '(unknown id)'}: missing fields [${missing}]`
    );
    logEncryptionFailure('decryptFromDatabase', err, { record_id: record.id, missing_fields: missing });
    throw err;
  }

  try {
    return await decrypt(encryptedValue, ivValue, authTagValue);
  } catch (err) {
    logEncryptionFailure('decryptFromDatabase', err, { field: encryptedField, record_id: record.id });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Post-write verification
// ---------------------------------------------------------------------------

/**
 * Verify that the encrypted blob stored in `encryptedResult` faithfully
 * represents `originalData`.  Throws if verification fails.
 *
 * Usage:
 *   const enc = await encryptForDatabase(sensitiveData);
 *   await verifyEncryption(sensitiveData, enc);
 */
async function verifyEncryption(originalData, encryptedResult) {
  let decrypted;
  try {
    decrypted = await decrypt(encryptedResult.encrypted, encryptedResult.iv, encryptedResult.authTag);
  } catch (err) {
    logEncryptionFailure('verifyEncryption', err);
    throw new Error(`Post-write verification failed — decryption error: ${err.message}`);
  }

  const originalStr = typeof originalData === 'string'
    ? originalData
    : JSON.stringify(originalData);
  const decryptedStr = typeof decrypted === 'string'
    ? decrypted
    : JSON.stringify(decrypted);

  if (originalStr !== decryptedStr) {
    const err = new Error('Post-write verification failed — decrypted value does not match original.');
    logEncryptionFailure('verifyEncryption', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------

/**
 * Encrypt an array of records in batches.
 *
 * `buildSensitiveData(record)` must return the object/string to encrypt for
 * that record.  Returns an array of `{ id, encrypted, iv, authTag, keyVersion }`
 * objects ready to be written back to the DB.
 *
 * Failures on individual records are collected and returned in `errors` so
 * a single bad row does not abort the entire batch.
 */
async function encryptBatch(records, buildSensitiveData, { batchSize = BATCH_SIZE, concurrency = MAX_CONCURRENT } = {}) {
  assertBackendRuntime();

  const results = [];
  const errors = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);

    // Process the chunk in concurrency-limited sub-batches to avoid
    // overwhelming the DB or exhausting memory on large datasets.
    for (let j = 0; j < chunk.length; j += concurrency) {
      const sub = chunk.slice(j, j + concurrency);
      await Promise.all(
        sub.map(async (record) => {
          try {
            const sensitiveData = buildSensitiveData(record);
            const enc = await encryptForDatabase(sensitiveData);
            results.push({ id: record.id, ...enc });
          } catch (err) {
            logEncryptionFailure('encryptBatch', err, { record_id: record.id });
            errors.push({ id: record.id, error: err.message });
          }
        })
      );
    }
  }

  return { results, errors };
}

/**
 * Re-encrypt records that carry an old key version.
 * Used by the key rotation script.
 *
 * `oldDecrypt(record)` must return the plaintext for that record.
 * Returns `{ reencrypted, skipped, errors }`.
 */
async function reencryptBatch(records, oldDecrypt, { batchSize = BATCH_SIZE, concurrency = MAX_CONCURRENT, targetVersion } = {}) {
  assertBackendRuntime();

  const reencrypted = [];
  const skipped = [];
  const errors = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);

    for (let j = 0; j < chunk.length; j += concurrency) {
      const sub = chunk.slice(j, j + concurrency);
      await Promise.all(
        sub.map(async (record) => {
          if (targetVersion && record.encryption_key_version === targetVersion) {
            skipped.push(record.id);
            return;
          }
          try {
            const plaintext = await oldDecrypt(record);
            const enc = await encryptForDatabase(plaintext);
            reencrypted.push({ id: record.id, ...enc });
          } catch (err) {
            logEncryptionFailure('reencryptBatch', err, { record_id: record.id });
            errors.push({ id: record.id, error: err.message });
          }
        })
      );
    }
  }

  return { reencrypted, skipped, errors };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Core — backward-compatible
  encrypt,
  decrypt,
  loadEncryptionKey,
  clearCachedKeyForRotation,

  // Database helpers
  encryptForDatabase,
  decryptFromDatabase,

  // Verification
  verifyEncryption,

  // Batch
  encryptBatch,
  reencryptBatch,

  // Internal (used by verification service)
  logEncryptionFailure
};
