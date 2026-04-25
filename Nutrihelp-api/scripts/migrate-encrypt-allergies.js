'use strict';

require('dotenv').config();

const supabase = require('../database/supabaseClient');
const { encryptForDatabase } = require('../services/encryptionService');

const TABLE = 'user_allergies';
const BATCH_SIZE = Number(process.env.ENCRYPTION_MIGRATION_BATCH_SIZE || 250);
const DRY_RUN = String(process.env.ENCRYPTION_MIGRATION_DRY_RUN || 'false').toLowerCase() === 'true';

const COLUMNS = {
  encrypted: 'allergy_encrypted',
  iv: 'allergy_encryption_iv',
  authTag: 'allergy_encryption_auth_tag',
  keyVersion: 'allergy_encryption_key_version',
  encryptedAt: 'allergy_encrypted_at',
};

function isMissingColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') || message.includes('schema cache');
}

function printSchemaHintAndExit(error) {
  console.error('\n[migrate-encrypt-allergies] Required encryption columns are missing.');
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

async function fetchBatch(offset = 0) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`user_id,allergy_id,${COLUMNS.encrypted}`)
    .is(COLUMNS.encrypted, null)
    .order('user_id', { ascending: true })
    .range(offset, offset + BATCH_SIZE - 1);

  if (error) {
    if (isMissingColumnError(error)) {
      printSchemaHintAndExit(error);
    }
    throw error;
  }

  return data || [];
}

async function processRow(row) {
  const payload = {
    user_id: row.user_id,
    allergy_id: row.allergy_id,
  };

  const encrypted = await encryptForDatabase(payload);

  if (DRY_RUN) {
    return;
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
    .eq('user_id', row.user_id)
    .eq('allergy_id', row.allergy_id)
    .is(COLUMNS.encrypted, null);

  if (error) {
    throw new Error(
      `Failed updating user_id=${row.user_id}, allergy_id=${row.allergy_id}: ${error.message || error}`
    );
  }
}

async function run() {
  console.log('[migrate-encrypt-allergies] Starting');
  console.log(`  table: ${TABLE}`);
  console.log(`  batch size: ${BATCH_SIZE}`);
  console.log(`  dry run: ${DRY_RUN}`);

  let totalProcessed = 0;
  let offset = 0;

  while (true) {
    const batch = await fetchBatch(offset);
    if (!batch.length) break;

    for (const row of batch) {
      await processRow(row);
      totalProcessed += 1;
    }

    offset += batch.length;
    console.log(`[migrate-encrypt-allergies] Progress processed=${totalProcessed} offset=${offset}`);
  }

  console.log('[migrate-encrypt-allergies] Complete');
  console.log(`  processed: ${totalProcessed}`);
  console.log(`  mode: ${DRY_RUN ? 'dry-run' : 'apply'}`);
}

run().catch((error) => {
  console.error('[migrate-encrypt-allergies] Failed:', error.message || error);
  process.exit(1);
});