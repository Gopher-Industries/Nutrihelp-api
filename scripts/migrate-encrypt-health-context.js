#!/usr/bin/env node
'use strict';

require('dotenv').config();

const assert = require('assert');
const supabase = require('../database/supabaseClient');
const {
  encryptForDatabase,
  decryptFromDatabase,
} = require('../services/encryptionService');

const TABLE = 'user_preference_states';
const BATCH_SIZE = Number(process.env.ENCRYPTION_MIGRATION_BATCH_SIZE || 100);
const DRY_RUN =
  process.argv.includes('--dry-run') ||
  String(process.env.ENCRYPTION_MIGRATION_DRY_RUN || 'false').toLowerCase() === 'true';

const COLUMNS = {
  plaintext: 'health_context',
  encrypted: 'health_context_encrypted',
  iv: 'health_context_encryption_iv',
  authTag: 'health_context_encryption_auth_tag',
  keyVersion: 'health_context_encryption_key_version',
  encryptedAt: 'health_context_encrypted_at',
};

function isMissingColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') || message.includes('schema cache');
}

function printSchemaHint(error) {
  console.error(
    '\n[migrate-encrypt-health-context] Required encrypted health-context columns are missing.'
  );
  console.error(
    'Apply database/migrations/004_encrypt_health_context.sql before running this script.'
  );

  if (error) {
    console.error('Original error:', error.message || error);
  }
}

async function fetchBatch() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      [
        'user_id',
        COLUMNS.plaintext,
        COLUMNS.encrypted,
        COLUMNS.iv,
        COLUMNS.authTag,
        COLUMNS.keyVersion,
      ].join(',')
    )
    .is(COLUMNS.encrypted, null)
    .not(COLUMNS.plaintext, 'is', null)
    .order('user_id', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    if (isMissingColumnError(error)) {
      printSchemaHint(error);
    }
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function processRow(row) {
  const healthContext = row[COLUMNS.plaintext];

  if (healthContext === null || healthContext === undefined) {
    return false;
  }

  const encrypted = await encryptForDatabase(healthContext);

  // Verify the newly generated ciphertext before clearing the plaintext value.
  // This keeps the migration non-destructive if encryption output cannot be
  // successfully decrypted with the active key.
  const preWriteRoundTrip = await decryptFromDatabase(
    {
      [COLUMNS.encrypted]: encrypted.encrypted,
      [COLUMNS.iv]: encrypted.iv,
      [COLUMNS.authTag]: encrypted.authTag,
    },
    {
      encrypted: COLUMNS.encrypted,
      iv: COLUMNS.iv,
      authTag: COLUMNS.authTag,
    }
  );

  assert.deepStrictEqual(
    preWriteRoundTrip,
    healthContext,
    `Pre-write encryption verification failed for user_id=${row.user_id}`
  );

  if (DRY_RUN) {
    return true;
  }

  const encryptedAt = new Date().toISOString();

  const { data: written, error } = await supabase
    .from(TABLE)
    .update({
      [COLUMNS.plaintext]: null,
      [COLUMNS.encrypted]: encrypted.encrypted,
      [COLUMNS.iv]: encrypted.iv,
      [COLUMNS.authTag]: encrypted.authTag,
      [COLUMNS.keyVersion]: encrypted.keyVersion,
      [COLUMNS.encryptedAt]: encryptedAt,
    })
    .eq('user_id', row.user_id)
    .is(COLUMNS.encrypted, null)
    .select(
      [
        'user_id',
        COLUMNS.plaintext,
        COLUMNS.encrypted,
        COLUMNS.iv,
        COLUMNS.authTag,
        COLUMNS.keyVersion,
      ].join(',')
    )
    .single();

  if (error) {
    throw new Error(
      `Failed updating user_id=${row.user_id}: ${error.message || error}`
    );
  }

  if (written[COLUMNS.plaintext] !== null) {
    throw new Error(
      `Plaintext health_context was not cleared for user_id=${row.user_id}`
    );
  }

  const decrypted = await decryptFromDatabase(written, {
    encrypted: COLUMNS.encrypted,
    iv: COLUMNS.iv,
    authTag: COLUMNS.authTag,
  });

  assert.deepStrictEqual(
    decrypted,
    healthContext,
    `Read-back verification failed for user_id=${row.user_id}`
  );

  return true;
}

async function run() {
  console.log('[migrate-encrypt-health-context] Starting');
  console.log(`  table: ${TABLE}`);
  console.log(`  batch size: ${BATCH_SIZE}`);
  console.log(`  dry run: ${DRY_RUN}`);

  let totalProcessed = 0;

  for (;;) {
    const batch = await fetchBatch();

    if (!batch.length) {
      break;
    }

    for (const row of batch) {
      const processed = await processRow(row);
      if (processed) {
        totalProcessed += 1;
      }
    }

    console.log(
      `[migrate-encrypt-health-context] Progress processed=${totalProcessed}`
    );

    if (DRY_RUN) {
      // Dry-run rows remain eligible for the next query, so one batch is enough
      // to demonstrate what would be migrated without looping indefinitely.
      break;
    }
  }

  console.log('[migrate-encrypt-health-context] Complete');
  console.log(`  processed: ${totalProcessed}`);
  console.log(`  mode: ${DRY_RUN ? 'dry-run' : 'apply'}`);
}

if (require.main === module) {
  run().catch((error) => {
    console.error(
      '[migrate-encrypt-health-context] Failed:',
      error.message || error
    );
    process.exit(1);
  });
}

module.exports = {
  COLUMNS,
  fetchBatch,
  processRow,
  run,
};
