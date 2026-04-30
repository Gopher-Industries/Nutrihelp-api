#!/usr/bin/env node
'use strict';

/**
 * rotate-encryption-key.js
 * -------------------------
 * Week 7/8 – CT Task 1: Safe v1 → v2 Key Rotation
 *
 * This script re-encrypts all rows that carry an old key version using the
 * new key.  It is safe to run multiple times (idempotent — rows already on
 * the target version are skipped).
 *
 * How key rotation works:
 *   1. Generate a new 32-byte base64 key:
 *        node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *   2. Store it in Supabase Vault (or .env) as ENCRYPTION_KEY_V2.
 *   3. Set ENCRYPTION_KEY_VERSION=v2 in .env ONLY after rotation completes.
 *   4. Run this script (dry-run first, then live).
 *   5. Once all rows show v2, revoke the v1 key from Vault.
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ENCRYPTION_KEY        (v1 key — old)
 *   ENCRYPTION_KEY_V2     (v2 key — new)
 *   ENCRYPTION_KEY_VERSION=v2  (set BEFORE running to target this version)
 *
 * Usage:
 *   node scripts/rotate-encryption-key.js --dry-run
 *   node scripts/rotate-encryption-key.js
 *   node scripts/rotate-encryption-key.js --table users --dry-run
 */

require('dotenv').config();

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { decrypt, clearCachedKeyForRotation } = require('../services/encryptionService');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes('--dry-run');
const TABLE_ARG = (() => {
  const idx = process.argv.indexOf('--table');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();
const BATCH_SIZE = 50;

// All tables with AES-256-GCM encrypted payloads.
// Add any new table as encryption rolls out further.
const ENCRYPTED_TABLES = [
  {
    table: 'users',
    encryptedColumn: 'profile_encrypted',
    ivColumn: 'profile_encryption_iv',
    authTagColumn: 'profile_encryption_auth_tag',
    keyVersionColumn: 'profile_encryption_key_version'
  },
  {
    table: 'health_risk_reports',
    encryptedColumn: 'encrypted_payload',
    ivColumn: 'encryption_iv',
    authTagColumn: 'encryption_auth_tag',
    keyVersionColumn: 'encryption_key_version'
  },
  {
    table: 'health_surveys',
    encryptedColumn: 'encrypted_payload',
    ivColumn: 'encryption_iv',
    authTagColumn: 'encryption_auth_tag',
    keyVersionColumn: 'encryption_key_version'
  }
];

const TABLES = TABLE_ARG
  ? ENCRYPTED_TABLES.filter((t) => t.table === TABLE_ARG)
  : ENCRYPTED_TABLES;

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

function buildClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

function normalizeKey(rawKey) {
  if (!rawKey) throw new Error('Key is missing.');
  const trimmed = String(rawKey).trim();
  try {
    const b = Buffer.from(trimmed, 'base64');
    if (b.length === 32) return b;
  } catch (_) { /* fall through */ }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, 'hex');
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
}

function decryptWithKey(encryptedData, iv, authTag, key) {
  const ALGORITHM = 'aes-256-gcm';
  const AUTH_TAG_LENGTH = 16;

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

  let parsed;
  try { parsed = JSON.parse(decrypted); } catch (_) { return decrypted; }
  if (!parsed || typeof parsed !== 'object') return decrypted;
  if (parsed.t === 'json') return parsed.d;
  if (parsed.t === 'string') return String(parsed.d || '');
  return decrypted;
}

function encryptWithKey(data, key, version) {
  const ALGORITHM = 'aes-256-gcm';
  const IV_LENGTH = 12;
  const AUTH_TAG_LENGTH = 16;

  const plaintext = typeof data === 'string'
    ? JSON.stringify({ v: 1, t: 'string', d: data })
    : JSON.stringify({ v: 1, t: 'json', d: data });

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encBuf = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encBuf.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: version
  };
}

// ---------------------------------------------------------------------------
// Per-table rotation
// ---------------------------------------------------------------------------

async function rotateTable(supabase, tableConfig, oldKey, newKey, newVersion, fromVersion) {
  const { table, encryptedColumn, ivColumn, authTagColumn, keyVersionColumn } = tableConfig;

  console.log(`\n🔄 Table: ${table}`);
  if (DRY_RUN) console.log('   ⚠️  DRY RUN — no writes will occur');

  let rotated = 0;
  let skipped = 0;
  let errors = 0;
  let cursor = 0;

  while (true) {
    const { data: records, error } = await supabase
      .from(table)
      .select(`id,${encryptedColumn},${ivColumn},${authTagColumn},${keyVersionColumn}`)
      .not(encryptedColumn, 'is', null)
      .range(cursor, cursor + BATCH_SIZE - 1)
      .order('id', { ascending: true });

    if (error) {
      console.error(`   ❌ Fetch error:`, error.message);
      errors++;
      break;
    }

    if (!records || records.length === 0) break;

    for (const record of records) {
      const currentVersion = record[keyVersionColumn];

      if (currentVersion === newVersion) {
        skipped++;
        continue;
      }

      const enc = record[encryptedColumn];
      const iv = record[ivColumn];
      const authTag = record[authTagColumn];

      if (!enc || !iv || !authTag) {
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would rotate id=${record.id} (${currentVersion || 'unknown'} → ${newVersion})`);
        rotated++;
        continue;
      }

      try {
        // Decrypt with old key
        const plaintext = decryptWithKey(enc, iv, authTag, oldKey);

        // Re-encrypt with new key
        const reenc = encryptWithKey(plaintext, newKey, newVersion);

        // Update the row
        const { error: updateErr } = await supabase
          .from(table)
          .update({
            [encryptedColumn]: reenc.encrypted,
            [ivColumn]: reenc.iv,
            [authTagColumn]: reenc.authTag,
            [keyVersionColumn]: reenc.keyVersion
          })
          .eq('id', record.id);

        if (updateErr) {
          console.error(`   ❌ Update failed for id=${record.id}:`, updateErr.message);
          errors++;
          continue;
        }

        // Verify: decrypt the newly written row with new key
        const verify = decryptWithKey(reenc.encrypted, reenc.iv, reenc.authTag, newKey);
        const pStr = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
        const vStr = typeof verify === 'string' ? verify : JSON.stringify(verify);

        if (pStr !== vStr) {
          console.error(`   ❌ Verification mismatch for id=${record.id}`);
          errors++;
          continue;
        }

        rotated++;
        process.stdout.write('.');
      } catch (err) {
        console.error(`\n   ❌ Error for id=${record.id}:`, err.message);
        errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
    cursor += BATCH_SIZE;
  }

  console.log(`\n   ✅ rotated: ${rotated}, skipped: ${skipped}, errors: ${errors}`);
  return { rotated, skipped, errors };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log('🔑 NutriHelp Encryption Key Rotation');
  console.log('='.repeat(50));

  const oldKeyRaw = process.env.ENCRYPTION_KEY;
  const newKeyRaw = process.env.ENCRYPTION_KEY_V2;
  const newVersion = process.env.ENCRYPTION_KEY_VERSION || 'v2';
  const fromVersion = process.env.ENCRYPTION_KEY_VERSION_PREV || 'v1';

  if (!oldKeyRaw) {
    console.error('❌ ENCRYPTION_KEY (old/v1 key) is required.');
    process.exit(1);
  }
  if (!newKeyRaw) {
    console.error('❌ ENCRYPTION_KEY_V2 (new key) is required.');
    process.exit(1);
  }

  const oldKey = normalizeKey(oldKeyRaw);
  const newKey = normalizeKey(newKeyRaw);

  if (oldKey.equals(newKey)) {
    console.error('❌ ENCRYPTION_KEY and ENCRYPTION_KEY_V2 are identical — nothing to rotate.');
    process.exit(1);
  }

  console.log(`Mode:           ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Rotating:       ${fromVersion} → ${newVersion}`);
  console.log(`Tables:         ${TABLES.map((t) => t.table).join(', ')}`);
  console.log('');

  const supabase = buildClient();
  clearCachedKeyForRotation();

  const totals = { rotated: 0, skipped: 0, errors: 0 };

  for (const tableConfig of TABLES) {
    const result = await rotateTable(supabase, tableConfig, oldKey, newKey, newVersion, fromVersion);
    totals.rotated += result.rotated;
    totals.skipped += result.skipped;
    totals.errors += result.errors;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Rotation Summary');
  console.log(`   Total rotated : ${totals.rotated}`);
  console.log(`   Total skipped : ${totals.skipped} (already on ${newVersion})`);
  console.log(`   Total errors  : ${totals.errors}`);

  if (totals.errors > 0) {
    console.error('\n⚠️  Some records failed. Review and re-run.');
    process.exit(1);
  }

  if (!DRY_RUN && totals.rotated > 0) {
    console.log(`\n✅ Rotation complete. Set ENCRYPTION_KEY=${newKeyRaw} and remove ENCRYPTION_KEY_V2.`);
    console.log('   Revoke the old key from Vault once all tables confirm ${newVersion}.');
  } else if (DRY_RUN) {
    console.log('\n✅ Dry run complete. Re-run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Nothing to rotate — all rows already on target version.');
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err.message || err);
  process.exit(1);
});
