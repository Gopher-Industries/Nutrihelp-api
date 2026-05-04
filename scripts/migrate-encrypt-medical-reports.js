#!/usr/bin/env node
'use strict';

/**
 * migrate-encrypt-medical-reports.js
 * ------------------------------------
 * Week 7/8 – CT Task 1: Encrypt remaining sensitive tables at rest.
 *
 * Targets:
 *   - health_risk_reports  (risk_data, user_id, report_notes)
 *   - health_surveys       (responses, user_id, notes)
 *
 * Safety guarantees:
 *   - Idempotent: records that already carry an encrypted_payload are skipped.
 *   - Dry-run:    pass --dry-run to preview without writing.
 *   - Verified:   each written row is immediately read back and decrypted to
 *                 confirm the stored ciphertext is valid.
 *   - Batched:    processes records in chunks to limit memory and DB load.
 *
 * Usage:
 *   node scripts/migrate-encrypt-medical-reports.js
 *   node scripts/migrate-encrypt-medical-reports.js --dry-run
 *   node scripts/migrate-encrypt-medical-reports.js --table health_surveys
 *   node scripts/migrate-encrypt-medical-reports.js --table health_risk_reports --batch-size 25
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { encryptForDatabase, decryptFromDatabase, verifyEncryption } = require('../services/encryptionService');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes('--dry-run');
const TABLE_ARG = (() => {
  const idx = process.argv.indexOf('--table');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();
const BATCH_ARG = (() => {
  const idx = process.argv.indexOf('--batch-size');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : null;
})();
const BATCH_SIZE = BATCH_ARG || 50;

// Fields that hold sensitive PII / clinical data in each table.
// These are assembled into a JSON object and stored as a single
// AES-256-GCM encrypted blob.  The original columns are set to null
// after successful encryption to prevent dual-storage.
const TABLE_CONFIG = {
  health_risk_reports: {
    sensitiveFields: ['risk_factors', 'recommendations', 'notes', 'diagnosis_data'],
    encryptedColumn: 'encrypted_payload',
    ivColumn: 'encryption_iv',
    authTagColumn: 'encryption_auth_tag',
    keyVersionColumn: 'encryption_key_version'
  },
  health_surveys: {
    sensitiveFields: ['responses', 'notes', 'health_data'],
    encryptedColumn: 'encrypted_payload',
    ivColumn: 'encryption_iv',
    authTagColumn: 'encryption_auth_tag',
    keyVersionColumn: 'encryption_key_version'
  }
};

const TABLES_TO_MIGRATE = TABLE_ARG
  ? [TABLE_ARG]
  : Object.keys(TABLE_CONFIG);

// ---------------------------------------------------------------------------
// Supabase (service-role key required for bulk reads/writes)
// ---------------------------------------------------------------------------

function buildClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
  }
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSensitivePayload(record, sensitiveFields) {
  const payload = {};
  for (const field of sensitiveFields) {
    if (record[field] !== undefined && record[field] !== null) {
      payload[field] = record[field];
    }
  }
  return payload;
}

function hasEncryptedPayload(record, config) {
  return Boolean(record[config.encryptedColumn]);
}

function hasSensitiveData(record, sensitiveFields) {
  return sensitiveFields.some((f) => record[f] !== undefined && record[f] !== null);
}

// ---------------------------------------------------------------------------
// Per-table migration
// ---------------------------------------------------------------------------

async function migrateTable(supabase, tableName) {
  const config = TABLE_CONFIG[tableName];
  if (!config) {
    console.error(`❌ Unknown table: ${tableName}. Supported: ${Object.keys(TABLE_CONFIG).join(', ')}`);
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  console.log(`\n📋 Table: ${tableName}`);
  console.log(`   Sensitive fields: ${config.sensitiveFields.join(', ')}`);
  if (DRY_RUN) console.log('   ⚠️  DRY RUN — no writes will occur');

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  let cursor = 0;

  while (true) {
    const { data: records, error } = await supabase
      .from(tableName)
      .select('*')
      .range(cursor, cursor + BATCH_SIZE - 1)
      .order('id', { ascending: true });

    if (error) {
      console.error(`   ❌ Fetch error (cursor ${cursor}):`, error.message);
      errors++;
      break;
    }

    if (!records || records.length === 0) break;

    console.log(`   Processing batch ${cursor}–${cursor + records.length - 1}...`);

    for (const record of records) {
      if (hasEncryptedPayload(record, config)) {
        skipped++;
        continue;
      }

      if (!hasSensitiveData(record, config.sensitiveFields)) {
        skipped++;
        continue;
      }

      const sensitivePayload = buildSensitivePayload(record, config.sensitiveFields);

      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would encrypt id=${record.id} fields: ${Object.keys(sensitivePayload).join(', ')}`);
        migrated++;
        continue;
      }

      try {
        const enc = await encryptForDatabase(sensitivePayload);

        // Post-encrypt verification before writing
        await verifyEncryption(sensitivePayload, enc);

        // Build the update: store encrypted blob + null out plaintext columns
        const update = {
          [config.encryptedColumn]: enc.encrypted,
          [config.ivColumn]: enc.iv,
          [config.authTagColumn]: enc.authTag,
          [config.keyVersionColumn]: enc.keyVersion
        };
        for (const field of config.sensitiveFields) {
          update[field] = null;
        }

        const { error: updateError } = await supabase
          .from(tableName)
          .update(update)
          .eq('id', record.id);

        if (updateError) {
          console.error(`   ❌ Update failed for id=${record.id}:`, updateError.message);
          errors++;
          continue;
        }

        // Post-write read-back verification
        const { data: written, error: readError } = await supabase
          .from(tableName)
          .select(`id,${config.encryptedColumn},${config.ivColumn},${config.authTagColumn}`)
          .eq('id', record.id)
          .single();

        if (readError || !written) {
          console.error(`   ❌ Read-back failed for id=${record.id}`);
          errors++;
          continue;
        }

        const decrypted = await decryptFromDatabase(written, {
          encrypted: config.encryptedColumn,
          iv: config.ivColumn,
          authTag: config.authTagColumn
        });

        if (!decrypted) {
          console.error(`   ❌ Read-back decryption returned null for id=${record.id}`);
          errors++;
          continue;
        }

        migrated++;
        process.stdout.write('.');
      } catch (err) {
        console.error(`\n   ❌ Error encrypting id=${record.id}:`, err.message);
        errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
    cursor += BATCH_SIZE;
  }

  console.log(`\n   ✅ Done — migrated: ${migrated}, skipped: ${skipped}, errors: ${errors}`);
  return { migrated, skipped, errors };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log('🔐 NutriHelp Medical Reports Encryption Migration');
  console.log('='.repeat(50));
  console.log(`Mode:        ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Batch size:  ${BATCH_SIZE}`);
  console.log(`Tables:      ${TABLES_TO_MIGRATE.join(', ')}`);
  console.log('');

  const supabase = buildClient();
  const totals = { migrated: 0, skipped: 0, errors: 0 };

  for (const table of TABLES_TO_MIGRATE) {
    const result = await migrateTable(supabase, table);
    totals.migrated += result.migrated;
    totals.skipped += result.skipped;
    totals.errors += result.errors;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log(`   Total migrated : ${totals.migrated}`);
  console.log(`   Total skipped  : ${totals.skipped} (already encrypted or no sensitive data)`);
  console.log(`   Total errors   : ${totals.errors}`);

  if (totals.errors > 0) {
    console.error('\n⚠️  Some records failed. Review errors above and re-run to retry.');
    process.exit(1);
  }

  console.log('\n✅ Migration complete.');
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err.message || err);
  process.exit(1);
});
