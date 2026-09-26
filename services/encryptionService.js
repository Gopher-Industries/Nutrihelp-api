'use strict';

const crypto = require('crypto');

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
// Failure logging
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

  // Try base64 first (recommended storage format).
  try {
    const base64Key = Buffer.from(trimmed, 'base64');
    if (base64Key.length === 32) return base64Key;
  } catch (_err) {
    // fall through
  }

  // Try hex.
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  // Last resort: plain UTF-8 passphrase -> SHA-256 derived key.
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
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
    // Backward compatibility fallback for unexpected plaintext payloads.
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
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encryptedBuffer.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: version,
    algorithm: ALGORITHM,
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
      decipher.final(),
    ]).toString('utf8');

    return fromPayload(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message || error}`);
  }
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

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

async function decryptFromDatabase(record, fieldMap = {}) {
  if (!record || typeof record !== 'object') return null;

  const encryptedField = fieldMap.encrypted || 'encrypted';
  const ivField = fieldMap.iv || 'iv';
  const authTagField = fieldMap.authTag || 'authTag';

  const encryptedValue = record[encryptedField];
  const ivValue = record[ivField];
  const authTagValue = record[authTagField];

  if (!encryptedValue && !ivValue && !authTagValue) return null;

  if (!encryptedValue || !ivValue || !authTagValue) {
    const missing = [
      !encryptedValue && encryptedField,
      !ivValue && ivField,
      !authTagValue && authTagField
    ].filter(Boolean).join(', ');
    throw new Error(
      `Incomplete encrypted payload on record ${record.id ?? '(unknown)'}: missing [${missing}]. ` +
      'This indicates data corruption — do not fall back to plaintext.'
    );
  }

  return decrypt(encryptedValue, ivValue, authTagValue);
}

module.exports = {
  encrypt,
  decrypt,
  encryptForDatabase,
  decryptFromDatabase,
  loadEncryptionKey,
  clearCachedKeyForRotation,
  BATCH_SIZE,
  MAX_CONCURRENT,
};
