const crypto = require('crypto');

// Key source strategy:
// 1) Supabase Vault path (preferred): provide an RPC that returns a base64/hex key string.
// 2) Environment fallback: ENCRYPTION_KEY (required if no Vault RPC is configured).
//
// Key rotation readiness:
// - Add ENCRYPTION_KEY_VERSION and persist it alongside encrypted rows in Week 6.
// - Keep old keys in secure storage during rotation and re-encrypt in batches.

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce recommended for GCM
const AUTH_TAG_LENGTH = 16;

const KEY_SOURCE = String(process.env.ENCRYPTION_KEY_SOURCE || 'env').toLowerCase();
const KEY_ENV_NAME = process.env.ENCRYPTION_KEY_ENV_NAME || 'ENCRYPTION_KEY';
const KEY_VERSION = process.env.ENCRYPTION_KEY_VERSION || 'v1';

let cachedKey = null;
let cachedKeyVersion = null;

function assertBackendRuntime() {
  // Defensive guard: this file must never be shipped to frontend bundles.
  if (typeof window !== 'undefined') {
    throw new Error('encryptionService is backend-only and cannot run in a browser runtime.');
  }
}

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
  // Keep compatibility but prefer explicit 32-byte base64 keys.
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
}

async function loadKeyFromVault() {
  // This expects a secure Postgres RPC (example name: get_encryption_key)
  // that only service-role calls can execute and returns:
  // { key: '<base64-or-hex-key>', version: 'v1' }
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

  // RPC may return a plain string, an object, or an array of rows.
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

module.exports = {
  encrypt,
  decrypt,
  loadEncryptionKey,
};