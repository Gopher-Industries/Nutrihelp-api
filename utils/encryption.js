const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment variables
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;

function getEncryptionKey() {
  if (!ENCRYPTION_KEY_HEX) {
    throw new Error('ENCRYPTION_KEY environment variable is not set.');
  }

  const encryptionKey = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  if (encryptionKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex string.');
  }

  return encryptionKey;
}

/**
 * Encrypts a string using AES-256-GCM.
 * @param {string} text - The text to encrypt.
 * @returns {string} - The encrypted string in the format: iv:authTag:encryptedText (hex).
 */
function encrypt(text) {
  if (!text) return text;

  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string encrypted by the encrypt function.
 * @param {string} encryptedText - The encrypted string.
 * @returns {string} - The decrypted text.
 */
function decrypt(encryptedText) {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;

  const encryptionKey = getEncryptionKey();
  const [ivHex, authTagHex, encryptedData] = encryptedText.split(':', 3);

  if (!ivHex || !authTagHex || !encryptedData) {
    throw new Error('Encrypted payload is malformed.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH || !encryptedData) {
    throw new Error('Encrypted payload is malformed.');
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

module.exports = { encrypt, decrypt };
