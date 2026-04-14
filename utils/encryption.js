const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment variables
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;

/**
 * Encrypts a string using AES-256-GCM.
 * @param {string} text - The text to encrypt.
 * @returns {string} - The encrypted string in the format: iv:authTag:encryptedText (hex).
 */
function encrypt(text) {
  if (!text) return text;

  if (!ENCRYPTION_KEY_HEX) {
    throw new Error('ENCRYPTION_KEY environment variable is not set.');
  }

  const encryptionKey = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  if (encryptionKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex string.');
  }

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

  if (!ENCRYPTION_KEY_HEX) {
    // In production, we might want to log this error, but for graceful degradation
    // if the key is missing, we return the text (though it will be the encrypted blob)
    console.error('ENCRYPTION_KEY environment variable is not set. Decryption failed.');
    return encryptedText;
  }

  try {
    const encryptionKey = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
    const [ivHex, authTagHex, encryptedData] = encryptedText.split(':');

    if (!ivHex || !authTagHex || !encryptedData) return encryptedText;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return encryptedText; // Return as is if decryption fails
  }
}

module.exports = { encrypt, decrypt };