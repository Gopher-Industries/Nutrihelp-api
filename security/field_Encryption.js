const crypto = require("crypto");

const ALGO = "aes-256-cbc";

function getKey() {
  const k = process.env.FIELD_ENCRYPTION_KEY;
  if (!k || k.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be exactly 32 characters");
  }
  return Buffer.from(k, "utf8");
}

// Save format: iv:ciphertext (both hex)
function encryptField(value) {
  if (value === null || value === undefined || value === "") return value;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);

  let encrypted = cipher.update(String(value), "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

function decryptField(value) {
  if (value === null || value === undefined || value === "") return value;

  const text = String(value);
  // if old/plain data, return as-is (prevents crashing)
  if (!text.includes(":")) return text;

  const [ivHex, encHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  let decrypted = decipher.update(encHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

module.exports = { encryptField, decryptField };
