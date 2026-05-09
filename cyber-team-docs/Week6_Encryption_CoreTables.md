# Week 6 Encryption Core Tables (Task 1)

## Overview

Week 6 Task 1 implements encryption-at-rest rollout for three sensitive tables:
- `users` (user profiles)
- `user_allergies`
- `user_health_conditions`

Uses AES-256-GCM with Supabase Vault key management (from Week 5).

## Database Schema Updates

Run once in Supabase SQL Editor:

```sql
alter table public.users
  add column if not exists profile_encrypted text,
  add column if not exists profile_encryption_iv text,
  add column if not exists profile_encryption_auth_tag text,
  add column if not exists profile_encryption_key_version text,
  add column if not exists profile_encrypted_at timestamptz;

alter table public.user_allergies
  add column if not exists allergy_encrypted text,
  add column if not exists allergy_encryption_iv text,
  add column if not exists allergy_encryption_auth_tag text,
  add column if not exists allergy_encryption_key_version text,
  add column if not exists allergy_encrypted_at timestamptz;

alter table public.user_health_conditions
  add column if not exists health_condition_encrypted text,
  add column if not exists health_condition_encryption_iv text,
  add column if not exists health_condition_encryption_auth_tag text,
  add column if not exists health_condition_encryption_key_version text,
  add column if not exists health_condition_encrypted_at timestamptz;
```

## Migration Process

### 1. Dry-run (Safe Validation)

```bash
export ENCRYPTION_MIGRATION_DRY_RUN=true
node scripts/migrate-encrypt-user-profiles.js
node scripts/migrate-encrypt-allergies.js
node scripts/migrate-encrypt-health-conditions.js
unset ENCRYPTION_MIGRATION_DRY_RUN
```

### 2. Real Migration

```bash
node scripts/migrate-encrypt-user-profiles.js
node scripts/migrate-encrypt-allergies.js
node scripts/migrate-encrypt-health-conditions.js
```

### 3. Verification (Idempotency Check)

Run scripts again. Expected:
- `users`: mostly skipped (already encrypted)
- `user_allergies`: 0 remaining rows
- `user_health_conditions`: 0 remaining rows

## Post-Migration Verification

Query to check encryption status:

```sql
select
  'users' as table_name,
  count(*) as total_rows,
  count(*) filter (where profile_encrypted is not null) as encrypted_rows,
  count(*) filter (where profile_encrypted is null) as unencrypted_rows
from public.users

union all

select
  'user_allergies' as table_name,
  count(*) as total_rows,
  count(*) filter (where allergy_encrypted is not null) as encrypted_rows,
  count(*) filter (where allergy_encrypted is null) as unencrypted_rows
from public.user_allergies

union all

select
  'user_health_conditions' as table_name,
  count(*) as total_rows,
  count(*) filter (where health_condition_encrypted is not null) as encrypted_rows,
  count(*) filter (where health_condition_encrypted is null) as unencrypted_rows
from public.user_health_conditions;
```

## Helper Functions Added to encryptionService.js

```javascript
// Wraps encrypt() for database storage (includes all metadata)
async function encryptForDatabase(data) {
  const result = await encrypt(data);
  return {
    encrypted: result.encrypted,
    iv: result.iv,
    authTag: result.authTag,
    keyVersion: result.keyVersion,
    algorithm: result.algorithm,
  };
}

// Decrypts database rows using field mapping
async function decryptFromDatabase(record, fieldMap = {}) {
  if (!record || typeof record !== 'object') return null;

  const encryptedField = fieldMap.encrypted || 'encrypted';
  const ivField = fieldMap.iv || 'iv';
  const authTagField = fieldMap.authTag || 'authTag';

  const encryptedValue = record[encryptedField];
  const ivValue = record[ivField];
  const authTagValue = record[authTagField];

  if (!encryptedValue || !ivValue || !authTagValue) {
    return null;
  }

  return decrypt(encryptedValue, ivValue, authTagValue);
}
```

## Controller Integration Examples

### Example: userProfileController.js (Encrypt on Write, Decrypt on Read)

```javascript
const { encryptForDatabase, decryptFromDatabase } = require('../services/encryptionService');

const updateUserProfile = async (req, res) => {
  try {
    const { role, email: tokenEmail } = req.user || {};
    const targetEmail = role === 'admin' ? req.body.email : tokenEmail;

    if (!targetEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Encrypt sensitive profile fields before DB write
    const encrypted = await encryptForDatabase({
      name: req.body.name || null,
      first_name: req.body.first_name || null,
      last_name: req.body.last_name || null,
      contact_number: req.body.contact_number || null,
      address: req.body.address || null,
    });

    const userProfile = await updateUser(
      req.body.name,
      req.body.first_name,
      req.body.last_name,
      targetEmail,
      req.body.contact_number,
      req.body.address,
      {
        profile_encrypted: encrypted.encrypted,
        profile_encryption_iv: encrypted.iv,
        profile_encryption_auth_tag: encrypted.authTag,
        profile_encryption_key_version: encrypted.keyVersion,
        profile_encrypted_at: new Date().toISOString(),
      }
    );

    if (!userProfile || userProfile.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { role, email: tokenEmail } = req.user || {};
    const targetEmail = role === 'admin' && req.query.email ? req.query.email : tokenEmail;

    if (!targetEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const rows = await getUser(targetEmail);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Decrypt on read (backend-only)
    for (const row of rows) {
      const decrypted = await decryptFromDatabase(row, {
        encrypted: 'profile_encrypted',
        iv: 'profile_encryption_iv',
        authTag: 'profile_encryption_auth_tag',
      });

      // Use decrypted values if available, fallback to plaintext during transition
      if (decrypted && typeof decrypted === 'object') {
        row.name = decrypted.name ?? row.name;
        row.first_name = decrypted.first_name ?? row.first_name;
        row.last_name = decrypted.last_name ?? row.last_name;
        row.contact_number = decrypted.contact_number ?? row.contact_number;
        row.address = decrypted.address ?? row.address;
      }
    }

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
```

### Example: userPreferencesController.js (Bulk Encryption)

```javascript
const { encryptForDatabase } = require('../services/encryptionService');

const postUserPreferences = async (req, res) => {
  try {
    const { user } = req.body;
    const userId = user?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Build encrypted payloads for allergy preferences
    const allergyPayloads = await Promise.all(
      (req.body.allergies || []).map(async (allergyId) => {
        const encrypted = await encryptForDatabase({ user_id: userId, allergy_id: allergyId });
        return {
          user_id: userId,
          allergy_id: allergyId,
          allergy_encrypted: encrypted.encrypted,
          allergy_encryption_iv: encrypted.iv,
          allergy_encryption_auth_tag: encrypted.authTag,
          allergy_encryption_key_version: encrypted.keyVersion,
          allergy_encrypted_at: new Date().toISOString(),
        };
      })
    );

    // Build encrypted payloads for health condition preferences
    const healthConditionPayloads = await Promise.all(
      (req.body.health_conditions || []).map(async (conditionId) => {
        const encrypted = await encryptForDatabase({ 
          user_id: userId, 
          health_condition_id: conditionId 
        });
        return {
          user_id: userId,
          health_condition_id: conditionId,
          health_condition_encrypted: encrypted.encrypted,
          health_condition_encryption_iv: encrypted.iv,
          health_condition_encryption_auth_tag: encrypted.authTag,
          health_condition_encryption_key_version: encrypted.keyVersion,
          health_condition_encrypted_at: new Date().toISOString(),
        };
      })
    );

    await updateUserPreferences(userId, req.body, {
      allergyPayloads,
      healthConditionPayloads,
    });

    return res.status(204).json({ message: 'User preferences updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

## Testing Commands

**Round-trip encryption test:**
```bash
node -e "require('dotenv').config(); const { encrypt, decrypt } = require('./services/encryptionService'); (async () => { const original = 'Hello NutriHelp'; const enc = await encrypt(original); const dec = await decrypt(enc.encrypted, enc.iv, enc.authTag); console.log(dec === original ? 'PASS' : 'FAIL'); })();"
```

**Check encrypted rows in users table:**
```bash
node -e "require('dotenv').config(); const supabase = require('./database/supabaseClient'); (async () => { const { data, error } = await supabase.from('users').select('user_id,profile_encrypted').not('profile_encrypted','is',null).limit(5); if (error) throw error; console.log('Encrypted user profiles:', data.length); })().catch(e => { console.error(e.message); process.exit(1); });"
```

## Environment Configuration

Add to `.env`:
```env
ENCRYPTION_KEY_SOURCE=vault
ENCRYPTION_VAULT_RPC=get_encryption_key
ENCRYPTION_KEY_VERSION=v1
ENCRYPTION_MIGRATION_BATCH_SIZE=100
ENCRYPTION_MIGRATION_DRY_RUN=false
```

## Files Modified

- `services/encryptionService.js` - Added helper functions
- `scripts/migrate-encrypt-user-profiles.js` (new)
- `scripts/migrate-encrypt-allergies.js` (new)
- `scripts/migrate-encrypt-health-conditions.js` (new)

## Security Notes

- Decryption always happens backend-only (never exposed to client)
- Key never stored in plaintext or git
- Vault RPC access restricted to `service_role` only
- Supports key rotation with version tracking
- Idempotent migrations (safe to re-run)