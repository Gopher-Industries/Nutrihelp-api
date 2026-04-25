'use strict';

require('dotenv').config();

const supabase = require('../database/supabaseClient');
const { encryptForDatabase } = require('../services/encryptionService');

const TABLE = 'users';
const BATCH_SIZE = Number(process.env.ENCRYPTION_MIGRATION_BATCH_SIZE || 100);
const DRY_RUN = String(process.env.ENCRYPTION_MIGRATION_DRY_RUN || 'false').toLowerCase() === 'true';

const COLUMNS = {
  encrypted: 'profile_encrypted',
  iv: 'profile_encryption_iv',
  authTag: 'profile_encryption_auth_tag',
  keyVersion: 'profile_encryption_key_version',
  encryptedAt: 'profile_encrypted_at',
};

function logConfig() {
  console.log('[migrate-encrypt-user-profiles] Starting');
  console.log(`  table: ${TABLE}`);
  console.log(`  batch size: ${BATCH_SIZE}`);
  console.log(`  dry run: ${DRY_RUN}`);
}

function isMissingColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') || message.includes('schema cache');
}

function printSchemaHintAndExit(error) {
  console.error('\n[migrate-encrypt-user-profiles] Required encryption columns are missing.');
  console.error('Run this SQL once in Supabase SQL Editor, then re-run the script:\n');
  console.error(`alter table public.${TABLE}`);
  console.error(`  add column if not exists ${COLUMNS.encrypted} text,`);
  console.error(`  add column if not exists ${COLUMNS.iv} text,`);
  console.error(`  add column if not exists ${COLUMNS.authTag} text,`);
  console.error(`  add column if not exists ${COLUMNS.keyVersion} text,`);
  console.error(`  add column if not exists ${COLUMNS.encryptedAt} timestamptz;\n`);
  if (error) {
    console.error('Original error:', error.message || error);
  }
  process.exit(1);
}

async function fetchBatch(lastUserId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      [
        'user_id',
        'email',
        'name',
        'first_name',
        'last_name',
        'contact_number',
        'address',
        COLUMNS.encrypted,
      ].join(',')
    )
    .gt('user_id', lastUserId)
    .order('user_id', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    if (isMissingColumnError(error)) {
      printSchemaHintAndExit(error);
    }
    throw error;
  }

  return data || [];
}

async function encryptAndUpdateRow(row) {
  if (row[COLUMNS.encrypted]) {
    return { skipped: true };
  }

  const payload = {
    name: row.name || null,
    first_name: row.first_name || null,
    last_name: row.last_name || null,
    contact_number: row.contact_number || null,
    address: row.address || null,
  };

  const encrypted = await encryptForDatabase(payload);

  if (DRY_RUN) {
    return { updated: false, skipped: false };
  }

  const { error } = await supabase
    .from(TABLE)
    .update({
      [COLUMNS.encrypted]: encrypted.encrypted,
      [COLUMNS.iv]: encrypted.iv,
      [COLUMNS.authTag]: encrypted.authTag,
      [COLUMNS.keyVersion]: encrypted.keyVersion,
      [COLUMNS.encryptedAt]: new Date().toISOString(),
    })
    .eq('user_id', row.user_id);

  if (error) {
    throw new Error(`Failed updating user_id=${row.user_id}: ${error.message || error}`);
  }

  return { updated: true, skipped: false };
}

async function run() {
  logConfig();

  let lastUserId = 0;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const batch = await fetchBatch(lastUserId);
    if (!batch.length) break;

    for (const row of batch) {
      scanned += 1;
      lastUserId = row.user_id;

      const result = await encryptAndUpdateRow(row);
      if (result.skipped) {
        skipped += 1;
      } else if (result.updated || DRY_RUN) {
        updated += 1;
      }
    }

    console.log(
      `[migrate-encrypt-user-profiles] Progress scanned=${scanned} updated=${updated} skipped=${skipped} lastUserId=${lastUserId}`
    );
  }

  console.log('[migrate-encrypt-user-profiles] Complete');
  console.log(`  scanned: ${scanned}`);
  console.log(`  updated: ${updated}`);
  console.log(`  skipped (already encrypted): ${skipped}`);
  console.log(`  mode: ${DRY_RUN ? 'dry-run' : 'apply'}`);
}

run().catch((error) => {
  console.error('[migrate-encrypt-user-profiles] Failed:', error.message || error);
  process.exit(1);
});